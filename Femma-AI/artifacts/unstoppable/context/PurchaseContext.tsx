import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
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
  logoutPurchaser,
  purchasePackage,
  restorePurchases,
  syncPlanToSupabase,
} from '@/lib/revenueCat';
import { fetchMemberByEmail } from '@/lib/members';
import { resolveMemberId } from '@/lib/memberProgress';
import { addCustomerInfoListener } from '@/lib/revenueCat';
import {
  loadAccessRecord,
  markPaidAccess,
  resolveAccess,
  saveAccessRecord,
  type SubscriptionAccessRecord,
} from '@/lib/subscriptionAccess';

type PurchaseContextType = {
  ready: boolean;
  /** Paid store/DB entitlement (not grace). */
  isPremium: boolean;
  /** Paid OR 3-day grace after plan/payment lapse. */
  hasAccess: boolean;
  inGracePeriod: boolean;
  graceDaysLeft: number;
  /** Show resume paywall — no free plan. */
  needsResumePaywall: boolean;
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

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [inGracePeriod, setInGracePeriod] = useState(false);
  const [graceDaysLeft, setGraceDaysLeft] = useState(0);
  const [needsResumePaywall, setNeedsResumePaywall] = useState(true);
  const [currentPlanId, setCurrentPlanId] = useState<'free' | 'premium' | 'grace'>('free');
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);
  const [accessRecord, setAccessRecord] = useState<SubscriptionAccessRecord | null>(null);

  const apiKey = getRevenueCatApiKey();

  const applyAccess = useCallback(
    async (storePremium: boolean, baseRecord?: SubscriptionAccessRecord | null) => {
      const record = baseRecord || (await loadAccessRecord(user?.email)) || {
        everPremium: false,
        periodEndsAt: null,
        graceStartedAt: null,
      };
      const snap = resolveAccess(storePremium, record);
      setAccessRecord(snap.record);
      setIsPremium(snap.isPaid);
      setHasAccess(snap.hasAccess);
      setInGracePeriod(snap.inGrace);
      setGraceDaysLeft(snap.graceDaysLeft);
      setNeedsResumePaywall(snap.needsResumePaywall);
      setCurrentPlanId(snap.isPaid ? 'premium' : snap.inGrace ? 'grace' : 'free');
      if (user?.email) await saveAccessRecord(user.email, snap.record);
      return snap;
    },
    [user?.email]
  );

  const syncPlanFromDb = useCallback(async () => {
    if (!user?.email) return false;
    try {
      const member = await fetchMemberByEmail(user.email);
      if (member?.plan_id === 'premium') {
        const record = await loadAccessRecord(user.email);
        const next = markPaidAccess(record);
        await applyAccess(true, next);
        return true;
      }
    } catch (err) {
      console.warn('Could not sync member plan from DB', err);
    }
    return false;
  }, [user?.email, applyAccess]);

  const initPurchases = useCallback(async () => {
    try {
      const local = await loadAccessRecord(user?.email);
      setAccessRecord(local);

      if (apiKey) {
        setConfigured(true);
        const memberId = user?.email ? await resolveMemberId(user.email) : null;
        if (memberId) {
          await identifyPurchaser(memberId);
        } else {
          await configurePurchases();
        }
      }
      const offerings = await fetchOfferings();
      setPackages(offerings);

      if (apiKey) {
        const info = await getCustomerInfo();
        const hasEntitlement = isPremiumFromCustomer(info);
        if (hasEntitlement) {
          const next = markPaidAccess(local);
          await applyAccess(true, next);
          if (user?.email) await syncPlanToSupabase('premium', user.email);
        } else {
          const fromDb = await syncPlanFromDb();
          if (!fromDb) await applyAccess(false, local);
        }
      } else {
        const fromDb = await syncPlanFromDb();
        if (!fromDb) await applyAccess(false, local);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialize subscription store.');
      const fromDb = await syncPlanFromDb();
      if (!fromDb) {
        const local = await loadAccessRecord(user?.email);
        await applyAccess(false, local);
      }
    } finally {
      setReady(true);
    }
  }, [apiKey, user?.email, syncPlanFromDb, applyAccess]);

  useEffect(() => {
    initPurchases();
  }, [initPurchases]);

  useEffect(() => {
    if (!user?.email) {
      logoutPurchaser().catch(() => {});
    }
  }, [user?.email]);

  useEffect(() => {
    if (!apiKey) return;
    let unsubscribe: (() => void) | undefined;
    let mounted = true;
    addCustomerInfoListener((info) => {
      if (!mounted) return;
      const hasEntitlement = isPremiumFromCustomer(info);
      void (async () => {
        const local = await loadAccessRecord(user?.email);
        if (hasEntitlement) {
          const next = markPaidAccess(local);
          await applyAccess(true, next);
          if (user?.email) void syncPlanToSupabase('premium', user.email);
        } else {
          // Keep admin-granted premium from DB — do not wipe it when store has no entitlement.
          const fromDb = await syncPlanFromDb();
          if (!fromDb) await applyAccess(false, local);
        }
      })();
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [apiKey, user?.email, applyAccess, syncPlanFromDb]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchOfferings();
      setPackages(list);
      const info = await getCustomerInfo();
      const hasEntitlement = isPremiumFromCustomer(info);
      const local = await loadAccessRecord(user?.email);
      if (hasEntitlement) {
        const next = markPaidAccess(local);
        await applyAccess(true, next);
        if (user?.email) await syncPlanToSupabase('premium', user.email);
      } else {
        const fromDb = await syncPlanFromDb();
        if (!fromDb) await applyAccess(false, local);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh packages');
    } finally {
      setLoading(false);
    }
  }, [user?.email, syncPlanFromDb, applyAccess]);

  const buy = useCallback(
    async (item: StorePackage): Promise<boolean> => {
      setLoading(true);
      setError('');
      try {
        const customer = await purchasePackage(item);
        const active = isPremiumFromCustomer(customer);
        if (active) {
          const local = await loadAccessRecord(user?.email);
          const next = markPaidAccess(local);
          await applyAccess(true, next);
          if (user?.email) await syncPlanToSupabase('premium', user.email);
          return true;
        }
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
    [user?.email, applyAccess]
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const customer = await restorePurchases();
      const active = isPremiumFromCustomer(customer);
      const local = await loadAccessRecord(user?.email);
      if (active) {
        const next = markPaidAccess(local);
        await applyAccess(true, next);
        if (user?.email) await syncPlanToSupabase('premium', user.email);
        return true;
      }
      const fromDb = await syncPlanFromDb();
      if (!fromDb) await applyAccess(false, local);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email, syncPlanFromDb, applyAccess]);

  const value = useMemo(
    () => ({
      ready,
      isPremium: isPremium || inGracePeriod,
      hasAccess,
      inGracePeriod,
      graceDaysLeft,
      needsResumePaywall,
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
