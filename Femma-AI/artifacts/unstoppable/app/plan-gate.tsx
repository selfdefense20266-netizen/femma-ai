import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  BackHandler,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';
import { usePurchases, purchasesUnavailableReason } from '@/context/PurchaseContext';
import { fetchDbPlans, type PlanDefinition, FALLBACK_PLANS } from '@/lib/plans';
import type { StorePackage } from '@/lib/revenueCat';
import { GRACE_TRIAL_DAYS, PLAN_PERIOD_DAYS } from '@/lib/subscriptionAccess';

export default function PlanGateScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string }>();
  const isResume = params.mode === 'resume';
  const { logout } = useAuth();
  const {
    hasAccess,
    packages,
    buy,
    restore,
    refresh,
    error: purchaseError,
    inGracePeriod,
    graceDaysLeft,
  } = usePurchases();

  const [plans, setPlans] = useState<PlanDefinition[]>(FALLBACK_PLANS);
  const [submitting, setSubmitting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const unavailableReason = purchasesUnavailableReason();

  useEffect(() => {
    if (!hasAccess) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  }, [hasAccess]);

  useEffect(() => {
    if (!isResume) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [isResume]);

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

  useEffect(() => {
    void refresh();
  }, [refresh]);

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

  if (hasAccess) return null;

  const premiumDbPlan = plans.find((p) => p.id === 'premium') || FALLBACK_PLANS.find((p) => p.id === 'premium')!;
  const chosenPackage: StorePackage | undefined = packages[0];
  const priceDisplay = chosenPackage?.priceString || premiumDbPlan.price_label;

  const dismiss = () => {
    if (isResume) return;
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleSubscribe = async () => {
    if (unavailableReason || !chosenPackage) return;
    setSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      const success = await buy(chosenPackage);
      if (success) {
        Alert.alert('Payment Successful', 'Your subscription is active again. Welcome back!');
        dismiss();
        router.replace('/(tabs)');
      }
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
        router.replace('/(tabs)');
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
        <View style={styles.topRow}>
          {!isResume ? (
            <TouchableOpacity onPress={dismiss} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={22} color={colors.foreground} />
            </TouchableOpacity>
          ) : (
            <View style={styles.closeBtn} />
          )}
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
            <Feather name={isResume ? 'lock' : 'shield'} size={14} color="#FFFFFF" />
            <Text style={[styles.badgeText, { color: '#FFFFFF' }]}>
              {isResume ? 'Subscription required' : 'Premium access'}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>
            {isResume ? 'Pay to resume your plan' : 'Unlock Premium'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {isResume
              ? `Your ${PLAN_PERIOD_DAYS}-day plan ended and payment was not renewed. A ${GRACE_TRIAL_DAYS}-day trial has finished — subscribe again to continue.`
              : `Full access is paid only. Plans run ${PLAN_PERIOD_DAYS} days. If renewal fails, you get a ${GRACE_TRIAL_DAYS}-day trial, then must pay to resume.`}
          </Text>
          {inGracePeriod ? (
            <Text style={[styles.graceNote, { color: colors.primary }]}>
              Grace trial: {graceDaysLeft} day{graceDaysLeft === 1 ? '' : 's'} left
            </Text>
          ) : null}
        </Animated.View>

        {purchaseError ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.coral + '15', borderColor: colors.coral }]}>
            <Feather name="alert-triangle" size={16} color={colors.coral} />
            <Text style={[styles.errorText, { color: colors.coral }]}>{purchaseError}</Text>
          </View>
        ) : null}

        <Animated.View entering={FadeInDown.delay(100).duration(400)}>
          <View
            style={[
              styles.planCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.primary,
                borderWidth: 2,
              },
            ]}
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
                  {chosenPackage?.recurring ? `per ${chosenPackage.periodLabel}` : `${PLAN_PERIOD_DAYS} days`}
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
          </View>
        </Animated.View>

        <TouchableOpacity onPress={() => void handleRestore()} disabled={submitting} style={styles.restoreRow}>
          <Text style={[styles.restoreText, { color: colors.mutedForeground }]}>Already subscribed? Restore purchases</Text>
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 12, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.75 : 1 }]}
          onPress={() => void handleSubscribe()}
          disabled={submitting || Boolean(unavailableReason) || !chosenPackage}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.primaryBtnText}>{isResume ? 'Pay & Resume' : 'Subscribe & Start'}</Text>
              <Feather name="credit-card" size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
        {unavailableReason ? (
          <Text style={[styles.footerHint, { color: colors.mutedForeground }]}>{unavailableReason}</Text>
        ) : null}
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
    marginBottom: 4,
  },
  closeBtn: { width: 40, height: 40, justifyContent: 'center' },
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
  graceNote: { marginTop: 10, fontSize: 13, fontFamily: 'Manrope_700Bold' },
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
  footerHint: { marginTop: 8, fontSize: 12, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
});
