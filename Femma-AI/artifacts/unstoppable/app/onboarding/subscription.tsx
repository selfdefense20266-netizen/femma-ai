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
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePurchases, purchasesUnavailableReason } from '@/context/PurchaseContext';
import { fetchDbPlans, type PlanDefinition, FALLBACK_PLANS } from '@/lib/plans';
import type { StorePackage } from '@/lib/revenueCat';

export default function SubscriptionSelectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeOnboarding, profile, stagedPlan } = useApp();
  const { user } = useAuth();
  const { packages, buy, selectFreePlan, restore, error: purchaseError } = usePurchases();

  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [dbLoading, setDbLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<'premium' | 'free'>('premium');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const unavailableReason = purchasesUnavailableReason();

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
      })
      .finally(() => {
        if (mounted) setDbLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const freeDbPlan = plans.find((p) => p.id === 'free') || FALLBACK_PLANS[0];
  const premiumDbPlan = plans.find((p) => p.id === 'premium') || FALLBACK_PLANS[1];

  const chosenPackage: StorePackage | undefined = packages[0];
  const priceDisplay = chosenPackage?.priceString || '';

  const handleContinueWithFree = async () => {
    setFormError('');
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await selectFreePlan();
      completeOnboarding({
        planName: stagedPlan?.planName || 'Free Journey Plan',
        journeyDay: 1,
        name: user ? `${user.firstName} ${user.lastName}`.trim() : profile.name,
      });
      router.replace('/(tabs)');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not continue with free plan. Please try again.');
      setSubmitting(false);
    }
  };

  const handleSubscribe = async () => {
    if (unavailableReason) {
      setFormError(unavailableReason);
      return;
    }
    if (!chosenPackage) {
      setFormError('No subscription package is available right now. Please try again later.');
      return;
    }
    setFormError('');
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const success = await buy(chosenPackage);
      if (success) {
        completeOnboarding({
          planName: stagedPlan?.planName || 'Premium Plan',
          journeyDay: 1,
          name: user ? `${user.firstName} ${user.lastName}`.trim() : profile.name,
        });
        Alert.alert('Payment Successful! 🎉', 'Your subscription is now active. Welcome to Premium!');
        router.replace('/(tabs)');
      }
      // On failure, `purchaseError` from usePurchases() already holds the real reason
      // (cancelled vs. an actual RevenueCat/store error) — shown in the banner above.
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Payment process failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRestore = async () => {
    setFormError('');
    setSubmitting(true);
    try {
      const restored = await restore();
      if (restored) {
        completeOnboarding({
          planName: stagedPlan?.planName || 'Premium Plan',
          journeyDay: 1,
          name: user ? `${user.firstName} ${user.lastName}`.trim() : profile.name,
        });
        Alert.alert('Restored Successfully', 'Your previous subscription has been restored.');
        router.replace('/(tabs)');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for your account.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = submitting || dbLoading;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.softLavender, colors.background]} style={StyleSheet.absoluteFill} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: topPad, paddingBottom: botPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '35' }]}>
            <Feather name="shield" size={14} color={colors.primary} />
            <Text style={[styles.badgeText, { color: colors.primary }]}>Step 2 of 2: Choose Your Plan</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Select Your Access Level</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Start with full Premium transformation tools, or continue with our generous Free tier.
          </Text>
        </Animated.View>

        {(formError || purchaseError) ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.coral + '15', borderColor: colors.coral }]}>
            <Feather name="alert-triangle" size={16} color={colors.coral} />
            <Text style={[styles.errorText, { color: colors.coral }]}>{formError || purchaseError}</Text>
          </View>
        ) : null}

        {/* Plan Option 1: Premium Plan */}
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

        {/* Plan Option 2: Free Plan */}
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

        <TouchableOpacity onPress={handleRestore} disabled={isLoading} style={styles.restoreRow}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Already subscribed? Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Floating Action Button Bar */}
      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
        {selectedType === 'premium' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: isLoading ? 0.75 : 1 }]}
            onPress={() => void handleSubscribe()}
            disabled={isLoading}
            activeOpacity={0.88}
          >
            {isLoading ? (
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
            style={[styles.secondaryBtn, { borderColor: colors.border, opacity: isLoading ? 0.75 : 1 }]}
            onPress={handleContinueWithFree}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <>
                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Continue with Free Plan</Text>
                <Feather name="chevron-right" size={18} color={colors.foreground} />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    padding: 22,
    gap: 14,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalHeaderTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  modalTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  planSummaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 4,
  },
  summaryTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  summarySub: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  summaryPrice: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  formGroup: { gap: 6 },
  fieldLabel: { fontSize: 12.5, fontFamily: 'Manrope_700Bold' },
  fieldInput: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14.5,
    fontFamily: 'Manrope_500Medium',
  },
  cardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
  },
  cardInputText: { flex: 1, fontSize: 14.5, fontFamily: 'Manrope_500Medium' },
  fieldRow: { flexDirection: 'row', gap: 12 },
  securityNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 4 },
  securityNoteText: { fontSize: 11.5, fontFamily: 'Manrope_500Medium' },
  paySubmitBtn: {
    height: 54,
    borderRadius: 27,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  paySubmitText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
