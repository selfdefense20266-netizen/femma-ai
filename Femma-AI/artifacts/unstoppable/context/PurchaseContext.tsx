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

type PurchaseContextType = {
  ready: boolean;
  isPremium: boolean;
  currentPlanId: 'free' | 'premium';
  packages: StorePackage[];
  loading: boolean;
  error: string;
  configured: boolean;
  refresh: () => Promise<void>;
  buy: (item: StorePackage) => Promise<boolean>;
  selectFreePlan: () => Promise<void>;
  restore: () => Promise<boolean>;
};

const PurchaseContext = createContext<PurchaseContextType | null>(null);

export function PurchaseProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [ready, setReady] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [currentPlanId, setCurrentPlanId] = useState<'free' | 'premium'>('free');
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [configured, setConfigured] = useState(false);

  const apiKey = getRevenueCatApiKey();

  const syncPlanFromDb = useCallback(async () => {
    if (!user?.email) return;
    try {
      const member = await fetchMemberByEmail(user.email);
      if (member?.plan_id === 'premium') {
        setIsPremium(true);
        setCurrentPlanId('premium');
      } else if (member?.plan_id === 'free') {
        setIsPremium(false);
        setCurrentPlanId('free');
      }
    } catch (err) {
      console.warn('Could not sync member plan from DB', err);
    }
  }, [user?.email]);

  const initPurchases = useCallback(async () => {
    try {
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
          setIsPremium(true);
          setCurrentPlanId('premium');
          if (user?.email) await syncPlanToSupabase('premium', user.email);
        } else {
          await syncPlanFromDb();
        }
      } else {
        await syncPlanFromDb();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialize subscription store.');
      await syncPlanFromDb();
    } finally {
      setReady(true);
    }
  }, [apiKey, user?.email, syncPlanFromDb]);

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
      setIsPremium(hasEntitlement);
      setCurrentPlanId(hasEntitlement ? 'premium' : 'free');
      if (user?.email) void syncPlanToSupabase(hasEntitlement ? 'premium' : 'free', user.email);
    }).then((unsub) => {
      unsubscribe = unsub;
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [apiKey, user?.email]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await fetchOfferings();
      setPackages(list);
      const info = await getCustomerInfo();
      const hasEntitlement = isPremiumFromCustomer(info);
      if (hasEntitlement) {
        setIsPremium(true);
        setCurrentPlanId('premium');
        if (user?.email) await syncPlanToSupabase('premium', user.email);
      } else {
        await syncPlanFromDb();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not refresh packages');
    } finally {
      setLoading(false);
    }
  }, [user?.email, syncPlanFromDb]);

  const buy = useCallback(
    async (item: StorePackage): Promise<boolean> => {
      setLoading(true);
      setError('');
      try {
        const customer = await purchasePackage(item);
        const active = isPremiumFromCustomer(customer);
        if (active) {
          setIsPremium(true);
          setCurrentPlanId('premium');
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
    [user?.email]
  );

  const selectFreePlan = useCallback(async () => {
    setLoading(true);
    try {
      setIsPremium(false);
      setCurrentPlanId('free');
      if (user?.email) {
        await syncPlanToSupabase('free', user.email);
      }
    } catch (err) {
      console.warn('Could not select free plan', err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError('');
    try {
      const customer = await restorePurchases();
      const active = isPremiumFromCustomer(customer);
      if (active) {
        setIsPremium(true);
        setCurrentPlanId('premium');
        if (user?.email) await syncPlanToSupabase('premium', user.email);
        return true;
      }
      setIsPremium(false);
      setCurrentPlanId('free');
      if (user?.email) await syncPlanToSupabase('free', user.email);
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Restore failed.');
      return false;
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  const value = useMemo(
    () => ({
      ready,
      isPremium,
      currentPlanId,
      packages,
      loading,
      error,
      configured,
      refresh,
      buy,
      selectFreePlan,
      restore,
    }),
    [ready, isPremium, currentPlanId, packages, loading, error, configured, refresh, buy, selectFreePlan, restore]
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
