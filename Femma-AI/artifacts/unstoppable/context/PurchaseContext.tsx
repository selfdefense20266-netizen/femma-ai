import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import type { StorePackage } from '@/lib/revenueCat';
// RevenueCat disabled — keep the hook so profile/paywall still compile.
// import { useAuth } from '@/context/AuthContext';
// import { resolveMemberId } from '@/lib/memberProgress';
// import {
//   getRevenueCatApiKey,
//   configurePurchases,
//   fetchOfferings,
//   getCustomerInfo,
//   identifyPurchaser,
//   isPremiumFromCustomer,
//   logoutPurchaser,
//   purchasePackage,
//   restorePurchases,
//   syncPremiumToSupabase,
// } from '@/lib/revenueCat';

type PurchaseContextType = {
  ready: boolean;
  isPremium: boolean;
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
  const refresh = useCallback(async () => {}, []);
  const buy = useCallback(async (_item: StorePackage) => false, []);
  const restore = useCallback(async () => false, []);

  const value = useMemo(
    () => ({
      ready: true,
      isPremium: true,
      packages: [] as StorePackage[],
      loading: false,
      error: '',
      configured: false,
      refresh,
      buy,
      restore,
    }),
    [refresh, buy, restore]
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
