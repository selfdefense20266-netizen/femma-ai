import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { buildPersonalizedPlan } from '@/lib/dailyMissions';
import { goalLabels } from '@/lib/nutritionPlan';

import MissionIcon from '@/components/MissionIcon';

export default function RevealScreen() {
  const colors = useColors();
  const { profile, stagedPlan } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const plan = useMemo(
    () => stagedPlan ?? buildPersonalizedPlan(profile),
    [stagedPlan, profile]
  );

  const dayMissions = plan.missions || [];
  const weeksLabel = plan.stats.weeks >= 1 ? String(plan.stats.weeks) : '4';
  const minLabel = String(plan.stats.dailyMinutes || dayMissions.reduce((s, m) => s + (m.duration || 0), 0));
  const tasksLabel = String(plan.stats.missionsPerDay || dayMissions.length);

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace('/onboarding/subscription');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={[colors.softLavender, colors.background]} style={styles.hero}>
          <View style={{ paddingTop: topPad + 24, paddingHorizontal: 24 }}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <View style={[styles.planBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                <Feather name="star" size={14} color={colors.primary} />
                <Text style={[styles.planBadgeText, { color: colors.primary }]}>Your plan is ready</Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                {(plan.planName || 'Your').replace(/\s*Plan$/i, '')}
                {'\n'}Plan
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
                Built for{' '}
                {profile.goal ? goalLabels(profile.goal).join(', ').toLowerCase() : 'your goal'}
                {profile.fitnessLevel ? ` · ${profile.fitnessLevel}` : ''}
                {profile.foodPreference ? ` · ${profile.foodPreference}` : ''}.
              </Text>
              <Text style={[styles.courseLine, { color: colors.mutedForeground }]}>
                Day 1 tasks match your admin activity plan for your level.
              </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsRow}>
              {[
                { value: weeksLabel, label: 'Weeks', color: colors.pink },
                { value: minLabel, label: 'Min/day', color: colors.lavender },
                { value: tasksLabel, label: 'Tasks', color: colors.skyBlue },
              ].map((s) => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </LinearGradient>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Day 1</Text>
          {dayMissions.length === 0 ? (
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>
              No Day 1 exercises yet — admin can add them in Daily Plans.
            </Text>
          ) : (
            dayMissions.map((mission, i) => (
              <Animated.View key={mission.id} entering={FadeInDown.delay(400 + i * 50).duration(400)}>
                <View style={[styles.missionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <MissionIcon
                    title={mission.title}
                    animation={mission.animation}
                    category={mission.category}
                    slot={mission.slot || 'exercise'}
                    icon={mission.icon}
                    accentColor={mission.accentColor}
                    size={56}
                    iconSize={20}
                    contentFit="contain"
                    imageUrl={mission.mediaUrl}
                    style={styles.missionThumb}
                  />
                  <View style={styles.missionText}>
                    <Text style={[styles.missionTitle, { color: colors.foreground }]} numberOfLines={2}>
                      {mission.title}
                    </Text>
                    <Text style={[styles.missionMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {mission.metaLine ||
                        `${mission.label || mission.category} · ${mission.duration} min`}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Start My Journey</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 24 },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    marginBottom: 16,
  },
  planBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  heroTitle: { fontSize: 36, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 44, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  courseLine: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', lineHeight: 18, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  section: { paddingHorizontal: 24, marginTop: 8, gap: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', marginBottom: 4 },
  emptyHint: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  missionThumb: {
    width: 56,
    height: 56,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
    backgroundColor: '#FFFFFF',
  },
  missionText: { flex: 1, gap: 3, minWidth: 0 },
  missionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  missionMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: 'transparent',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 100,
  },
  startBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
});
