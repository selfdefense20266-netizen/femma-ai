import { Platform } from 'react-native';
import Constants from 'expo-constants';
import type PurchasesModule from 'react-native-purchases';
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { resolveMemberId } from '@/lib/memberProgress';

export const PREMIUM_ENTITLEMENT = 'premium';
// RevenueCat SDK "public" keys are safe to ship client-side (unlike secret API keys).
// This is the fallback used only when EXPO_PUBLIC_REVENUECAT_API_KEY is not set.
const TEST_STORE_PUBLIC_KEY = 'test_bPYgMvVaIOBKbTiiXmfzxcrTeyv';

function devLog(...args: unknown[]) {
  if (__DEV__) console.log('[RevenueCat]', ...args);
}

export function getRevenueCatApiKey() {
  const constants = Constants as {
    expoConfig?: { extra?: Record<string, string> };
    manifest?: { extra?: Record<string, string> };
    manifest2?: { extra?: { expoClient?: { extra?: Record<string, string> } } };
  };
  const extra =
    constants.expoConfig?.extra ||
    constants.manifest?.extra ||
    constants.manifest2?.extra?.expoClient?.extra;
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY || extra?.revenueCatAndroidApiKey;
  const key =
    (Platform.OS === 'android' ? androidKey : undefined) ||
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
    extra?.revenueCatApiKey ||
    androidKey ||
    TEST_STORE_PUBLIC_KEY;
  return String(key || '').trim();
}

export type StorePackage = {
  identifier: string;
  packageType: string;
  title: string;
  description: string;
  priceString: string;
  productId: string;
  periodLabel: string;
  recurring: boolean;
  raw: PurchasesPackage;
};

type CustomerLike = Pick<CustomerInfo, 'entitlements' | 'activeSubscriptions'>;

let configured = false;

function periodLabel(packageType: string, product: { subscriptionPeriod?: string | null }) {
  const type = String(packageType || '').toUpperCase();
  if (type.includes('ANNUAL') || type === 'ANNUAL') return 'year';
  if (type.includes('MONTH')) return 'month';
  if (type.includes('WEEK')) return 'week';
  if (product.subscriptionPeriod) return product.subscriptionPeriod.replace('P', '').toLowerCase();
  return 'period';
}

async function loadPurchases(): Promise<typeof PurchasesModule | null> {
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('react-native-purchases');
    return mod.default || mod;
  } catch {
    return null;
  }
}

export function isPremiumFromCustomer(info: CustomerLike | null | undefined) {
  if (!info) return false;
  const active = info.entitlements?.active || {};
  return Boolean(active[PREMIUM_ENTITLEMENT]?.isActive ?? active[PREMIUM_ENTITLEMENT]);
}

export async function configurePurchases(appUserId?: string | null) {
  const apiKey = getRevenueCatApiKey();
  if (configured || !apiKey || Platform.OS === 'web') return;
  const Purchases = await loadPurchases();
  if (!Purchases?.configure) return;
  if (__DEV__) Purchases.setLogLevel?.(Purchases.LOG_LEVEL?.DEBUG ?? 'debug');
  Purchases.configure({
    apiKey,
    appUserID: appUserId || undefined,
  });
  configured = true;
  devLog('initialized', appUserId ? `(user: ${appUserId})` : '(anonymous)');
}

export async function identifyPurchaser(appUserId: string) {
  await configurePurchases(appUserId);
  const Purchases = await loadPurchases();
  if (!Purchases?.logIn) return;
  try {
    await Purchases.logIn(appUserId);
    devLog('user identified', appUserId);
  } catch (error) {
    console.warn('RevenueCat login failed', error);
  }
}

export async function logoutPurchaser() {
  const Purchases = await loadPurchases();
  if (!Purchases?.logOut) return;
  try {
    await Purchases.logOut();
    devLog('user logged out');
  } catch {
    // anonymous restore is fine
  }
}

function toStorePackage(item: PurchasesPackage): StorePackage {
  return {
    identifier: item.identifier,
    packageType: String(item.packageType || ''),
    title: item.product.title || item.identifier,
    description: item.product.description || '',
    priceString: item.product.priceString,
    productId: item.product.identifier,
    periodLabel: periodLabel(String(item.packageType || ''), item.product),
    recurring: Boolean(item.product.subscriptionPeriod) || /month|annual|year|week/i.test(String(item.packageType)),
    raw: item,
  };
}

export async function fetchOfferings(): Promise<StorePackage[]> {
  await configurePurchases();
  const Purchases = await loadPurchases();
  if (!Purchases?.getOfferings) return [];
  try {
    const offerings = await Purchases.getOfferings();
    const current: PurchasesOffering | undefined = offerings?.current || Object.values(offerings?.all || {})[0];
    // Prefer the monthly package specifically; fall back to whatever the offering has.
    const packages: PurchasesPackage[] = current?.monthly
      ? [current.monthly]
      : current?.availablePackages || [];
    if (!packages.length) {
      devLog('no RevenueCat offerings/packages available');
      return [];
    }
    devLog('offerings loaded', packages.length, 'package(s)');
    return packages.map(toStorePackage);
  } catch (error) {
    console.warn('RevenueCat offerings failed', error);
    return [];
  }
}

export async function getMonthlyPackage(): Promise<StorePackage | null> {
  await configurePurchases();
  const Purchases = await loadPurchases();
  if (!Purchases?.getOfferings) return null;
  try {
    const offerings = await Purchases.getOfferings();
    const current: PurchasesOffering | undefined = offerings?.current || Object.values(offerings?.all || {})[0];
    const monthly = current?.monthly;
    return monthly ? toStorePackage(monthly) : null;
  } catch (error) {
    console.warn('RevenueCat monthly package lookup failed', error);
    return null;
  }
}

export async function purchasePackage(item: StorePackage) {
  const Purchases = await loadPurchases();
  if (!Purchases?.purchasePackage) {
    throw new Error('Purchases are only available through the App Store or Google Play on this device.');
  }
  devLog('purchase started', item.productId);
  try {
    const result = await Purchases.purchasePackage(item.raw);
    devLog('purchase successful', item.productId);
    return (result?.customerInfo || result) as CustomerLike;
  } catch (error) {
    const err = error as {
      code?: string;
      message?: string;
      underlyingErrorMessage?: string;
      userCancelled?: boolean;
    };
    console.error('[RevenueCat] purchase failed', {
      productId: item.productId,
      code: err?.code,
      message: err?.message,
      underlyingErrorMessage: err?.underlyingErrorMessage,
      userCancelled: err?.userCancelled,
    });
    throw error;
  }
}

export async function restorePurchases() {
  const Purchases = await loadPurchases();
  if (!Purchases?.restorePurchases) {
    throw new Error('Restore is only available on iOS and Android builds.');
  }
  const info = (await Purchases.restorePurchases()) as CustomerLike;
  devLog('restore completed');
  return info;
}

export async function getCustomerInfo() {
  await configurePurchases();
  const Purchases = await loadPurchases();
  if (!Purchases?.getCustomerInfo) return null;
  const info = (await Purchases.getCustomerInfo()) as CustomerLike;
  devLog('customerInfo updated — pro entitlement', isPremiumFromCustomer(info) ? 'active' : 'inactive');
  return info;
}

export async function addCustomerInfoListener(listener: (info: CustomerLike) => void) {
  const Purchases = await loadPurchases();
  if (!Purchases?.addCustomerInfoUpdateListener) return () => {};
  const handler = (info: CustomerLike) => {
    devLog('customerInfo listener fired — pro entitlement', isPremiumFromCustomer(info) ? 'active' : 'inactive');
    listener(info);
  };
  Purchases.addCustomerInfoUpdateListener(handler);
  return () => {
    Purchases.removeCustomerInfoUpdateListener?.(handler);
  };
}

export async function syncPlanToSupabase(planId: 'free' | 'premium', emailHint?: string) {
  if (!isSupabaseConfigured) return;
  const memberId = await resolveMemberId(emailHint);
  if (!memberId) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('members').update({ plan_id: planId, updated_at: new Date().toISOString() }).eq('id', memberId);
  await supabase.from('subscriptions').upsert(
    {
      id: `sub-${memberId}`,
      user_id: memberId,
      plan_id: planId,
      status: 'active',
      started_at: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}

export async function syncPremiumToSupabase(isPremium: boolean, emailHint?: string) {
  if (!isSupabaseConfigured) return;
  await syncPlanToSupabase(isPremium ? 'premium' : 'free', emailHint);
}
