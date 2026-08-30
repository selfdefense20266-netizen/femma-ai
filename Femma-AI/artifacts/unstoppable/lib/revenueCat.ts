import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import { resolveMemberId } from '@/lib/memberProgress';

export const PREMIUM_ENTITLEMENT = 'premium';
const TEST_STORE_PUBLIC_KEY = 'test_bPYgMvVaIOBKbTiiXmfzxcrTeyv';

export function getRevenueCatApiKey() {
  // RevenueCat disabled
  return '';
  /*
  const constants = Constants as {
    expoConfig?: { extra?: Record<string, string> };
    manifest?: { extra?: Record<string, string> };
    manifest2?: { extra?: { expoClient?: { extra?: Record<string, string> } } };
  };
  const extra =
    constants.expoConfig?.extra ||
    constants.manifest?.extra ||
    constants.manifest2?.extra?.expoClient?.extra;
  const key =
    process.env.EXPO_PUBLIC_REVENUECAT_API_KEY ||
    extra?.revenueCatApiKey ||
    TEST_STORE_PUBLIC_KEY;
  return String(key || '').trim();
  */
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
  raw: unknown;
};

type CustomerLike = {
  entitlements?: { active?: Record<string, unknown> };
  activeSubscriptions?: string[];
};

let configured = false;

function periodLabel(packageType: string, product: { subscriptionPeriod?: string | null }) {
  const type = String(packageType || '').toUpperCase();
  if (type.includes('ANNUAL') || type === 'ANNUAL') return 'year';
  if (type.includes('MONTH')) return 'month';
  if (type.includes('WEEK')) return 'week';
  if (product.subscriptionPeriod) return product.subscriptionPeriod.replace('P', '').toLowerCase();
  return 'period';
}

async function loadPurchases(): Promise<any | null> {
  // RevenueCat / react-native-purchases disabled
  return null;
  /*
  if (Platform.OS === 'web') return null;
  try {
    const mod = await import('react-native-purchases');
    return mod.default || mod;
  } catch {
    return null;
  }
  */
}

export function isPremiumFromCustomer(info: CustomerLike | null | undefined) {
  if (!info) return false;
  const active = info.entitlements?.active || {};
  if (active[PREMIUM_ENTITLEMENT] || active.Premium || active.premium) return true;
  if (Object.keys(active).length > 0) return true;
  return (info.activeSubscriptions || []).length > 0;
}

export async function configurePurchases(appUserId?: string | null) {
  const apiKey = getRevenueCatApiKey();
  if (configured || !apiKey || Platform.OS === 'web') return;
  const Purchases = await loadPurchases();
  if (!Purchases?.configure) return;
  Purchases.configure({
    apiKey,
    appUserID: appUserId || undefined,
  });
  configured = true;
}

export async function identifyPurchaser(appUserId: string) {
  await configurePurchases(appUserId);
  const Purchases = await loadPurchases();
  if (!Purchases?.logIn) return;
  try {
    await Purchases.logIn(appUserId);
  } catch (error) {
    console.warn('RevenueCat login failed', error);
  }
}

export async function logoutPurchaser() {
  const Purchases = await loadPurchases();
  if (!Purchases?.logOut) return;
  try {
    await Purchases.logOut();
  } catch {
    // anonymous restore is fine
  }
}

async function fallbackPackages(): Promise<StorePackage[]> {
  return [
    {
      identifier: 'premium_plan_1',
      packageType: 'MONTHLY',
      title: 'Premium',
      description: 'Monthly Premium',
      priceString: '$14.99',
      productId: 'premium_plan_1',
      periodLabel: 'month',
      recurring: true,
      raw: { testStore: true, productId: 'premium_plan_1' },
    },
  ];
}

export async function fetchOfferings(): Promise<StorePackage[]> {
  await configurePurchases();
  const Purchases = await loadPurchases();
  if (Purchases?.getOfferings) {
    try {
      const offerings = await Purchases.getOfferings();
      const current = offerings?.current || Object.values(offerings?.all || {})[0];
      const packages = (current?.availablePackages || []) as Array<{
        identifier: string;
        packageType: string;
        product: {
          identifier: string;
          title: string;
          description: string;
          priceString: string;
          subscriptionPeriod?: string | null;
        };
      }>;
      if (packages.length) {
        return packages.map((item) => ({
          identifier: item.identifier,
          packageType: String(item.packageType || ''),
          title: item.product.title || item.identifier,
          description: item.product.description || '',
          priceString: item.product.priceString,
          productId: item.product.identifier,
          periodLabel: periodLabel(String(item.packageType || ''), item.product),
          recurring: Boolean(item.product.subscriptionPeriod) || /month|annual|year|week/i.test(String(item.packageType)),
          raw: item,
        }));
      }
    } catch (error) {
      console.warn('RevenueCat offerings failed', error);
    }
  }
  return fallbackPackages();
}

export async function purchasePackage(item: StorePackage) {
  const Purchases = await loadPurchases();
  if (Purchases?.purchasePackage && item.raw && !(item.raw as { testStore?: boolean }).testStore) {
    const result = await Purchases.purchasePackage(item.raw);
    return result?.customerInfo as CustomerLike;
  }
  return { entitlements: { active: { premium: { productIdentifier: item.productId } } } } as CustomerLike;
}

export async function restorePurchases() {
  const Purchases = await loadPurchases();
  if (!Purchases?.restorePurchases) {
    throw new Error('Restore is only available on iOS and Android builds.');
  }
  return (await Purchases.restorePurchases()) as CustomerLike;
}

export async function getCustomerInfo() {
  await configurePurchases();
  const Purchases = await loadPurchases();
  if (!Purchases?.getCustomerInfo) return null;
  return (await Purchases.getCustomerInfo()) as CustomerLike;
}

export async function syncPremiumToSupabase(isPremium: boolean, emailHint?: string) {
  if (!isSupabaseConfigured || !isPremium) return;
  const memberId = await resolveMemberId(emailHint);
  if (!memberId) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from('members').update({ plan_id: 'premium', updated_at: new Date().toISOString() }).eq('id', memberId);
  await supabase.from('subscriptions').upsert(
    {
      id: `rc-${memberId}`,
      user_id: memberId,
      plan_id: 'premium',
      status: 'active',
      started_at: today,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' }
  );
}
