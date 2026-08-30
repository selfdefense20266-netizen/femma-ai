import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { usePurchases } from '@/context/PurchaseContext';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { StorePackage } from '@/lib/revenueCat';

const FALLBACK_FEATURES = [
  'Full course library and daily plan',
  'AI recipes and meal scanner',
  'Coach chat and premium journeys',
  'Cancels anytime · auto-renews until you stop',
];

export default function PaywallScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isPremium, packages, loading, error, configured, buy, restore, refresh } = usePurchases();
  const [selected, setSelected] = useState<string>('');
  const [features, setFeatures] = useState<string[]>(FALLBACK_FEATURES);

  useEffect(() => {
    if (!packages.length) return;
    if (!selected || !packages.some((item) => item.identifier === selected)) {
      const yearly = packages.find((item) => /annual|year/i.test(item.packageType + item.identifier));
      setSelected((yearly || packages[0]).identifier);
    }
  }, [packages, selected]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase
      .from('plans')
      .select('features')
      .eq('id', 'premium')
      .maybeSingle()
      .then(({ data }) => {
        const list = Array.isArray(data?.features) ? data.features.map(String).filter(Boolean) : [];
        if (list.length) setFeatures([...list, 'Auto-renews. Cancel anytime.']);
      });
  }, []);

  const chosen = packages.find((item) => item.identifier === selected) || packages[0];

  const onBuy = async (item: StorePackage) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ok = await buy(item);
    if (ok) {
      Alert.alert('Premium is on', 'Your subscription will renew automatically until you cancel.');
      router.back();
    }
  };

  const onRestore = async () => {
    const ok = await restore();
    if (ok) {
      Alert.alert('Restored', 'Your Premium access is active again.');
      router.back();
    } else {
      Alert.alert('No subscription found', 'We could not find a previous purchase on this account.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.softLavender, colors.background]} style={StyleSheet.absoluteFill} />
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16) + 24, paddingHorizontal: 22 }}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.back} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.kicker, { color: colors.primary }]}>Fema Premium</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>
          {isPremium ? 'You are on Premium' : 'Keep going with Premium'}
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Tap Continue to start monthly Premium. It renews automatically until you cancel.
        </Text>

        <View style={styles.features}>
          {features.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <View style={[styles.check, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="check" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
            </View>
          ))}
        </View>

        {!configured ? (
          <Text style={[styles.empty, { color: colors.coral }]}>RevenueCat public SDK key is missing.</Text>
        ) : null}

        {error && configured ? <Text style={[styles.empty, { color: colors.coral }]}>{error}</Text> : null}

        {isPremium ? (
          <View style={[styles.activeCard, { backgroundColor: colors.mint + '24', borderColor: colors.mint }]}>
            <Feather name="check-circle" size={20} color="#2d8a6b" />
            <Text style={[styles.activeText, { color: colors.foreground }]}>Recurring Premium is active on this account.</Text>
          </View>
        ) : packages.length ? (
          <View style={{ gap: 10 }}>
            {packages.map((item) => {
              const on = item.identifier === chosen?.identifier;
              return (
                <TouchableOpacity
                  key={item.identifier}
                  onPress={() => setSelected(item.identifier)}
                  style={[
                    styles.priceCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: on ? colors.primary : colors.border,
                    },
                  ]}
                  activeOpacity={0.88}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.priceTitle, { color: colors.foreground }]}>{item.title}</Text>
                    <Text style={[styles.priceHint, { color: colors.mutedForeground }]}>
                      {item.recurring ? `Renews every ${item.periodLabel}` : 'One-time'}
                    </Text>
                  </View>
                  <Text style={[styles.price, { color: colors.primary }]}>{item.priceString}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No products in Test Store yet</Text>
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              In RevenueCat: Test Store → create a monthly (and optional yearly) subscription → attach both to the default offering and the `premium` entitlement.
            </Text>
            <TouchableOpacity onPress={() => void refresh()} style={[styles.restoreBtn, { borderColor: colors.border }]}>
              <Text style={[styles.restoreText, { color: colors.foreground }]}>Refresh offerings</Text>
            </TouchableOpacity>
          </View>
        )}

        {!isPremium && chosen ? (
          <TouchableOpacity
            style={[styles.cta, { backgroundColor: colors.primary, opacity: loading ? 0.7 : 1 }]}
            disabled={loading}
            onPress={() => void onBuy(chosen)}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.ctaText}>Continue · {chosen.priceString}</Text>
                <Text style={styles.ctaSub}>{chosen.recurring ? `Auto-renews · cancel anytime` : 'Pay once'}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity onPress={() => void onRestore()} disabled={loading} style={styles.restoreLink}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  back: { width: 40, height: 40, justifyContent: 'center', marginBottom: 12 },
  kicker: { fontSize: 12, fontFamily: 'Manrope_700Bold', letterSpacing: 1.1, textTransform: 'uppercase', marginBottom: 8 },
  title: { fontSize: 30, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.7, lineHeight: 36, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21, marginBottom: 22 },
  features: { gap: 12, marginBottom: 22 },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  check: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  featureText: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold', lineHeight: 21 },
  priceCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 16, padding: 16, gap: 12 },
  priceTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  priceHint: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 3 },
  price: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  cta: { marginTop: 18, minHeight: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', paddingVertical: 12 },
  ctaText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  ctaSub: { color: 'rgba(255,255,255,0.85)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  restoreLink: { alignItems: 'center', paddingTop: 16 },
  restoreBtn: { marginTop: 14, borderWidth: 1, borderRadius: 22, height: 44, justifyContent: 'center', alignItems: 'center' },
  restoreText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  emptyCard: { borderWidth: 1, borderRadius: 16, padding: 16 },
  emptyTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', marginBottom: 8 },
  empty: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  activeCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 16, padding: 16 },
  activeText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_600SemiBold', lineHeight: 20 },
});
