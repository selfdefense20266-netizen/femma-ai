import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { usePurchases, purchasesUnavailableReason } from '@/context/PurchaseContext';
import { fetchDbPlans, type PlanDefinition, FALLBACK_PLANS } from '@/lib/plans';
import type { StorePackage } from '@/lib/revenueCat';

export default function PlanGateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isPremium, packages, buy, restore, error: purchaseError } = usePurchases();

  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [selectedType, setSelectedType] = useState<'premium' | 'free'>('premium');
  const [submitting, setSubmitting] = useState(false);
  const unavailableReason = purchasesUnavailableReason();

  // Hard safety net: never show this to a premium user, even if it was
  // triggered before their premium status had fully settled.
  useEffect(() => {
    if (!isPremium) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [isPremium]);

  const topPad = insets.top + 12;
  const botPad = Math.max(insets.bottom, 16);

  useEffect(() => {
    let mounted = true;
    fetchDbPlans()
      .then((data) => {
        if (mounted) setPlans(data);
      })
      .catch(() => {
        if (mounted) setPlans(FALLBACK_PLANS);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (isPremium) return null;

  const freeDbPlan = plans.find((p) => p.id === 'free') || FALLBACK_PLANS[0];
  const premiumDbPlan = plans.find((p) => p.id === 'premium') || FALLBACK_PLANS[1];

  const chosenPackage: StorePackage | undefined = packages[0];
  const priceDisplay = chosenPackage?.priceString || '';

  const dismiss = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleContinueWithFree = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    dismiss();
  };

  const handleSubscribe = async () => {
    if (unavailableReason || !chosenPackage) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const success = await buy(chosenPackage);
      if (success) {
        Alert.alert('Payment Successful! 🎉', 'Your subscription is now active. Welcome to Premium!');
        dismiss();
      }
      // On failure, `purchaseError` already holds the real reason (cancelled vs. an actual error).
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setSubmitting(true);
    try {
      const restored = await restore();
      if (restored) {
        Alert.alert('Restored Successfully', 'Your previous subscription has been restored.');
        dismiss();
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for your account.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.softLavender, colors.background]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: topPad, paddingBottom: botPad + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Choose Your Plan</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Select Your Access Level</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Start with full Premium transformation tools, or continue with our generous Free tier.
          </Text>
        </Animated.View>

        {purchaseError ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.coral + '15', borderColor: colors.coral }]}>
            <Feather name="alert-triangle" size={16} color={colors.coral} />
            <Text style={[styles.errorText, { color: colors.coral }]}>{purchaseError}</Text>
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: selectedType === 'premium' ? colors.primary : colors.border,
                borderWidth: selectedType === 'premium' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedType('premium')}
            activeOpacity={0.9}
          >
            <View style={styles.topBadgeRow}>
              <View style={[styles.recommendedPill, { backgroundColor: colors.primary }]}>
                <Feather name="star" size={11} color="#FFFFFF" />
                <Text style={styles.recommendedPillText}>RECOMMENDED</Text>
              </View>
            </View>

            <View style={styles.cardHeader}>
              <View style={[styles.radio, { borderColor: selectedType === 'premium' ? colors.primary : colors.border }]}>
                {selectedType === 'premium' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.titleArea}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{premiumDbPlan.name}</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{premiumDbPlan.description}</Text>
              </View>
              <View style={styles.priceArea}>
                <Text style={[styles.priceText, { color: colors.primary }]}>{priceDisplay}</Text>
                <Text style={[styles.periodText, { color: colors.mutedForeground }]}>
                  {chosenPackage?.recurring ? `per ${chosenPackage.periodLabel}` : 'auto-renews'}
                </Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {premiumDbPlan.features.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.primary + '18' }]}>
                    <Feather name="check" size={13} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(400)}>
          <TouchableOpacity
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: selectedType === 'free' ? colors.primary : colors.border,
                borderWidth: selectedType === 'free' ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedType('free')}
            activeOpacity={0.9}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.radio, { borderColor: selectedType === 'free' ? colors.primary : colors.border }]}>
                {selectedType === 'free' && <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />}
              </View>
              <View style={styles.titleArea}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{freeDbPlan.name}</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{freeDbPlan.description}</Text>
              </View>
              <View style={styles.priceArea}>
                <Text style={[styles.priceText, { color: colors.foreground }]}>$0</Text>
                <Text style={[styles.periodText, { color: colors.mutedForeground }]}>Forever free</Text>
              </View>
            </View>

            <View style={styles.featureList}>
              {freeDbPlan.features.map((feature) => (
                <View key={feature} style={styles.featureItem}>
                  <View style={[styles.checkCircle, { backgroundColor: colors.muted }]}>
                    <Feather name="check" size={13} color={colors.mutedForeground} />
                  </View>
                  <Text style={[styles.featureText, { color: colors.foreground }]}>{feature}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        </Animated.View>

        <TouchableOpacity onPress={() => void handleRestore()} disabled={submitting} style={styles.restoreRow}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Already subscribed? Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
        {selectedType === 'premium' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.75 : 1 }]}
            onPress={() => void handleSubscribe()}
            disabled={submitting}
            activeOpacity={0.88}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Subscribe & Start Premium</Text>
                <Feather name="credit-card" size={18} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: colors.border, opacity: submitting ? 0.75 : 1 }]}
            onPress={handleContinueWithFree}
            disabled={submitting}
            activeOpacity={0.85}
          >
            <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Continue with Free Plan</Text>
            <Feather name="chevron-right" size={18} color={colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  closeBtn: { width: 40, height: 40, justifyContent: 'center', marginBottom: 4 },
  header: { alignItems: 'center', marginBottom: 20 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 12,
  },
  badgeText: { fontSize: 12, fontFamily: 'Manrope_700Bold' },
  title: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 20 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_500Medium' },
  planCard: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  topBadgeRow: { marginBottom: 10 },
  recommendedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  recommendedPillText: { color: '#FFFFFF', fontSize: 10, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.8 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  radioInner: { width: 10, height: 10, borderRadius: 5 },
  titleArea: { flex: 1, gap: 2, paddingRight: 8 },
  cardTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  cardDesc: { fontSize: 12.5, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  priceArea: { alignItems: 'flex-end', marginLeft: 'auto' },
  priceText: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  periodText: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  featureList: { gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(150,150,150,0.2)' },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkCircle: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
  featureText: { fontSize: 13.5, fontFamily: 'Manrope_500Medium', flex: 1 },
  restoreRow: { alignItems: 'center', marginVertical: 14 },
  restoreText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150,150,150,0.15)',
  },
  primaryBtn: {
    height: 56,
    borderRadius: 28,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  secondaryBtn: {
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
