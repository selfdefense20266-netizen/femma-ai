import React, { useEffect, useRef, useState } from 'react';
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
  const { user, logout } = useAuth();
  const {
    packages,
    buy,
    restore,
    refresh,
    ready: purchasesReady,
    hasAccess,
    error: purchaseError,
  } = usePurchases();

  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [dbLoading, setDbLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [formError, setFormError] = useState('');
  const enteredRef = useRef(false);
  const unavailableReason = purchasesUnavailableReason();

  const topPad = insets.top + 12;
  const botPad = Math.max(insets.bottom, 16);

  const finishWithAccess = () => {
    if (enteredRef.current) return;
    enteredRef.current = true;
    completeOnboarding({
      planName: stagedPlan?.planName || 'Premium Plan',
      journeyDay: 1,
      name: user ? `${user.firstName} ${user.lastName}`.trim() : profile.name,
    });
    router.replace('/(tabs)');
  };

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

  // Re-check store + admin-granted DB premium when landing on paywall.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Admin premium / active entitlement — finish onboarding and enter app.
  useEffect(() => {
    if (!purchasesReady || !hasAccess || submitting) return;
    finishWithAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when access becomes true
  }, [purchasesReady, hasAccess]);

  const premiumDbPlan = plans.find((p) => p.id === 'premium') || FALLBACK_PLANS.find((p) => p.id === 'premium')!;

  const chosenPackage: StorePackage | undefined = packages[0];
  const priceDisplay = chosenPackage?.priceString || premiumDbPlan.price_label;

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
        finishWithAccess();
        Alert.alert('Payment Successful! 🎉', 'Your subscription is now active. Welcome to Premium!');
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
        finishWithAccess();
        Alert.alert('Restored Successfully', 'Your previous subscription has been restored.');
      } else {
        Alert.alert('No Subscription Found', 'No active subscription was found for your account.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Restore failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      router.replace('/welcome');
    } finally {
      setLoggingOut(false);
    }
  };

  const isLoading = submitting || dbLoading;

  if (purchasesReady && hasAccess) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityIndicator style={{ marginTop: 80 }} color={colors.primary} />
      </View>
    );
  }

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
        <View style={styles.topRow}>
          <View style={{ width: 40 }} />
          <TouchableOpacity
            onPress={() => void handleLogout()}
            disabled={loggingOut}
            style={styles.logoutBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {loggingOut ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <>
                <Feather name="log-out" size={16} color={colors.mutedForeground} />
                <Text style={[styles.logoutText, { color: colors.mutedForeground }]}>Log out</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.badge, { backgroundColor: colors.primary, borderColor: colors.primary }]}>
            <Feather name="shield" size={14} color="#FFFFFF" />
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>Step 2 of 2: Choose Your Plan</Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>Subscribe to continue</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Premium is required. Your plan lasts 30 days. If card renewal fails, you get a 3-day trial, then must pay
            again to resume.
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
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
            activeOpacity={0.9}
          >
            <View style={styles.topBadgeRow}>
              <View style={[styles.recommendedPill, { backgroundColor: colors.primary }]}>
                <Feather name="star" size={11} color="#FFFFFF" />
                <Text style={styles.recommendedPillText}>REQUIRED</Text>
              </View>
            </View>

            <View style={styles.cardHeader}>
              <View style={styles.titleArea}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{premiumDbPlan.name}</Text>
                <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{premiumDbPlan.description}</Text>
              </View>
              <View style={styles.priceArea}>
                <Text style={[styles.priceText, { color: colors.primary }]}>{priceDisplay}</Text>
                <Text style={[styles.periodText, { color: colors.mutedForeground }]}>
                  {chosenPackage?.recurring ? `per ${chosenPackage.periodLabel}` : '30 days'}
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

        <TouchableOpacity onPress={handleRestore} disabled={isLoading} style={styles.restoreRow}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Already subscribed? Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
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
              <Text style={styles.primaryBtnText}>Subscribe & Start</Text>
              <Feather name="credit-card" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 4 },
  logoutText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
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
    borderRadius: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  secondaryBtn: {
    height: 56,
    borderRadius: 100,
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
    borderRadius: 100,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  paySubmitText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_700Bold' },
});
