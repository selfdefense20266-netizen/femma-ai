import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform } from 'react-native';
import type { StorePackage } from '@/lib/revenueCat';
import { useAuth } from '@/context/AuthContext';
import {
  getRevenueCatApiKey,
  configurePurchases,
  fetchOfferings,
  getCustomerInfo,
  identifyPurchaser,
  isPremiumFromCustomer,
  isRevenueCatAvailable,
  logoutPurchaser,
  premiumExpirationFromCustomer,
  purchasePackage,
  restorePurchases,
} from '@/lib/revenueCat';
import { fetchMemberByEmail } from '@/lib/members';
import { resolveMemberId } from '@/lib/memberProgress';
import { addCustomerInfoListener } from '@/lib/revenueCat';
import { loadAccessRecord, resolveAccess, saveAccessRecord } from '@/lib/subscriptionAccess';

type PurchaseContextType = {
  ready: boolean;
  /** Feature unlock: paid entitlement OR grace trial. Use `currentPlanId` / `inGracePeriod` to tell them apart. */
  isPremium: boolean;
  /** Paid OR 3-day grace after plan/payment lapse. */
  hasAccess: boolean;
  inGracePeriod: boolean;
  graceDaysLeft: number;
  /** Show resume paywall — no free plan. */
  needsResumePaywall: boolean;
  /** True once this member has had paid access before (drives "resume" vs first-time paywall copy). */
  everPaid: boolean;
  currentPlanId: 'free' | 'premium' | 'grace';
  packages: StorePackage[];
  loading: boolean;
  error: string;
  configured: boolean;
  refresh: () => Promise<void>;
  buy: (item: StorePackage) => Promise<boolean>;
  restore: () => Promise<boolean>;
};

const PurchaseContext = createContext<PurchaseContextType | null>(null);

type CustomerInfoLike = Parameters<typeof isPremiumFromCustomer>[0];

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const email = user?.email || null;
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceDaysLeft, setGraceDaysLeft] = useState(0);
  const [needsResumePaywall, setNeedsResumePaywall] = useState(true);
  const [everPaid, setEverPaid] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<'free' | 'premium' | 'grace'>('free');
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);
  /** Email the current state belongs to — async results for another account are dropped. */
  const activeEmailRef = useRef<string | null>(email);
  activeEmailRef.current = email;

  const apiKey = getRevenueCatApiKey();
  /** Store is the source of truth when RevenueCat can run; DB plan_id only as a fallback (web). */
  const storeAvailable = isRevenueCatAvailable();

  const resetState = useCallback(() => {
    setReady(false);
    setIsPremium(false);
    setHasAccess(false);
    setInGracePeriod(false);
    setGraceDaysLeft(0);
    setNeedsResumePaywall(true);
    setEverPaid(false);
    setCurrentPlanId('free');
    setError('');
  }, []);

  const applyAccess = useCallback(
    async (paid: boolean, expiresAt: string | null) => {
      const forEmail = email;
      const record = await loadAccessRecord(forEmail);
      const snap = resolveAccess(paid, record, expiresAt);
      if (activeEmailRef.current !== forEmail) return snap;
      setIsPremium(snap.isPaid);
      setHasAccess(snap.hasAccess);
      setInGracePeriod(snap.inGrace);
      setGraceDaysLeft(snap.graceDaysLeft);
      setNeedsResumePaywall(snap.needsResumePaywall);
      setEverPaid(snap.record.everPremium);
      setCurrentPlanId(snap.isPaid ? 'premium' : snap.inGrace ? 'grace' : 'free');
      if (forEmail) await saveAccessRecord(forEmail, snap.record);
      return snap;
    },
    [email]
  );

  /** Server-owned plan (RevenueCat webhook / admin). Used only when the store can't be queried. */
  const dbPlanIsPremium = useCallback(async () => {
    if (!email) return false;
    try {
      const member = await fetchMemberByEmail(email);
      return member?.plan_id === 'premium';
    } catch (err) {
      console.warn('Could not read member plan from DB', err);
      return false;
    }
  }, [email]);

  const applyFromCustomer = useCallback(
    async (info: CustomerInfoLike | null) => {
      if (!email) {
        await applyAccess(false, null);
        return false;
      }
      if (storeAvailable && info) {
        const active = isPremiumFromCustomer(info);
        await applyAccess(active, active ? premiumExpirationFromCustomer(info) : null);
        return active;
      }
      const fromDb = await dbPlanIsPremium();
      await applyAccess(fromDb, null);
      return fromDb;
    },
    [email, storeAvailable, applyAccess, dbPlanIsPremium]
  );

  const initPurchases = useCallback(async () => {
    const forEmail = email;
    try {
      if (!forEmail) {
        await applyAccess(false, null);
        return;
      }
      if (apiKey) {
        setConfigured(true);
        const memberId = await resolveMemberId(forEmail);
        if (memberId) {
          // RevenueCat app_user_id must be members.id (webhook maps it back to the member row).
          await identifyPurchaser(memberId);
        } else {
          await configurePurchases();
        }
      }
      const offerings = await fetchOfferings();
      if (activeEmailRef.current !== forEmail) return;
      setPackages(offerings);

      const info = storeAvailable ? await getCustomerInfo() : null;
      await applyFromCustomer(info);
    } catch (err) {
      if (activeEmailRef.current !== forEmail) return;
      setError(err instanceof Error ? err.message : 'Could not initialize subscription store.');
      try {
        await applyFromCustomer(null);
      } catch {
        await applyAccess(false, null);
      }
    } finally {
      // No user yet (auth still restoring on a cold start): stay "not ready" so gated screens
      // don't bounce a premium member before their real access has been loaded.
      if (forEmail && activeEmailRef.current === forEmail) setReady(true);
    }
  }, [apiKey, email, storeAvailable, applyFromCustomer, applyAccess]);

  useEffect(() => {
    // New account (or logout) — never carry the previous user's access over.
    resetState();
    void initPurchases();
  }, [initPurchases, resetState]);

  useEffect(() => {
    if (!email) {
      logoutPurchaser().catch(() => {});
    }
  }, [email]);

  useEffect(() => {
    if (!apiKey || !email) return;
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    addCustomerInfoListener((info) => {
      if (!mounted) return;
      void applyFromCustomer(info).catch(() => undefined);
    }).then((unsub) => {
      if (!mounted) unsub();
      else unsubscribe = unsub;
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [apiKey, email, applyFromCustomer]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchOfferings();
      setPackages(list);
      const info = storeAvailable ? await getCustomerInfo() : null;
      await applyFromCustomer(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh packages');
    } finally {
      setLoading(false);
    }
  }, [storeAvailable, applyFromCustomer]);

  const buy = useCallback(
    async (item: StorePackage): Promise<boolean> => {
      setLoading(true);
      setError('');
      try {
        const customer = await purchasePackage(item);
        const active = await applyFromCustomer(customer);
        if (active) return true;
        setError('Purchase completed but Premium was not activated. Please contact support.');
        return false;
      } catch (err) {
        const rcError = err as { userCancelled?: boolean; message?: string };
        if (rcError?.userCancelled) {
          setError('Payment cancelled.');
        } else {
          setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
        }
        return false;
      } finally {
        setLoading(false);
      }
    },
    [applyFromCustomer]
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const customer = await restorePurchases();
      return await applyFromCustomer(customer);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [applyFromCustomer]);

  const value = useMemo(
    () => ({
      ready,
      isPremium: isPremium || inGracePeriod,
      hasAccess,
      inGracePeriod,
      graceDaysLeft,
      needsResumePaywall,
      everPaid,
      currentPlanId,
      packages,
      loading,
      error,
      configured,
      refresh,
      buy,
      restore,
    }),
    [
      ready,
      isPremium,
      hasAccess,
      inGracePeriod,
      graceDaysLeft,
      needsResumePaywall,
      everPaid,
      currentPlanId,
      packages,
      loading,
      error,
      configured,
      refresh,
      buy,
      restore,
    ]
  );

  return <PurchaseContext.Provider value={value}>{children}</PurchaseContext.Provider>;
}

export function usePurchases() {
  const ctx = useContext(PurchaseContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchaseProvider');
  return ctx;
}

export function purchasesUnavailableReason() {
  if (Platform.OS === 'web') return 'Subscribe in the iOS or Android app. Web checkout is not enabled yet.';
  return '';
}
