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
import { useAuth } from '@/context/AuthContext';
import { buildPersonalizedPlan } from '@/lib/dailyMissions';

export default function RevealScreen() {
  const colors = useColors();
  const { completeOnboarding, profile, stagedPlan } = useApp();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const plan = useMemo(
    () => stagedPlan ?? buildPersonalizedPlan(profile),
    [stagedPlan, profile]
  );

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding({
      planName: plan.planName,
      journeyDay: 1,
      name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    });
    router.replace('/(tabs)');
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
                {plan.planName.replace(' Plan', '')}
                {'\n'}Plan
              </Text>
              <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
                Built from your answers and live catalog — {profile.goal ? profile.goal.toLowerCase() : 'your goal'}
                {profile.fitnessLevel ? ` · ${profile.fitnessLevel}` : ''}
                {profile.dailyTime ? ` · ${profile.dailyTime}/day` : ''}.
              </Text>
              {plan.courseNames.length > 0 && (
                <Text style={[styles.courseLine, { color: colors.mutedForeground }]}>
                  Courses: {plan.courseNames.join(' · ')}
                </Text>
              )}
              {!plan.hasCatalogLessons && (
                <Text style={[styles.courseLine, { color: colors.mutedForeground }]}>
                  Video lessons will appear as courses are published in admin.
                </Text>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsRow}>
              {[
                { value: String(plan.stats.missionsPerDay), label: 'Missions/day', color: colors.pink },
                { value: String(plan.stats.dailyMinutes), label: 'Min/day', color: colors.lavender },
                { value: String(plan.stats.focusAreas), label: 'Focus areas', color: colors.skyBlue },
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
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today&apos;s missions</Text>
          {plan.missions.map((mission, i) => (
            <Animated.View key={mission.id} entering={FadeInDown.delay(400 + i * 50).duration(400)}>
              <View style={[styles.missionRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.missionIcon, { backgroundColor: `${mission.accentColor}22` }]}>
                  <Feather name={mission.icon as never} size={16} color={mission.accentColor} />
                </View>
                <View style={styles.missionText}>
                  <Text style={[styles.missionTitle, { color: colors.foreground }]}>{mission.title}</Text>
                  <Text style={[styles.missionMeta, { color: colors.mutedForeground }]}>
                    {mission.label || mission.category} · {mission.duration} min
                  </Text>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Week 1 schedule</Text>
          {plan.weekSchedule.map((day, i) => (
            <Animated.View key={day.day} entering={FadeInDown.delay(500 + i * 60).duration(400)}>
              <View style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.dayBadge, { backgroundColor: i === 0 ? colors.primary : colors.muted }]}>
                  <Text style={[styles.dayText, { color: i === 0 ? '#FFFFFF' : colors.mutedForeground }]}>{day.day}</Text>
                </View>
                <View style={styles.dayItems}>
                  {day.items.map((item) => (
                    <Text key={item} style={[styles.dayItem, { color: colors.foreground }]}>
                      • {item}
                    </Text>
                  ))}
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        <View style={[styles.quoteCard, { backgroundColor: colors.softLavender, marginHorizontal: 24 }]}>
          <Text style={[styles.quoteText, { color: colors.foreground }]}>
            These missions link to real courses when videos are ready in your library.
          </Text>
          <Text style={[styles.quoteAttrib, { color: colors.mutedForeground }]}>
            AI nutrition help comes later when you scan food or open Recipes — not during this step.
          </Text>
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
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, marginBottom: 16 },
  planBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  heroTitle: { fontSize: 36, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 44, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  courseLine: { fontSize: 12.5, fontFamily: 'Manrope_500Medium', lineHeight: 18, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  section: { paddingHorizontal: 24, paddingTop: 24, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 6 },
  missionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 12 },
  missionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  missionText: { flex: 1 },
  missionTitle: { fontSize: 13.5, fontFamily: 'Manrope_700Bold' },
  missionMeta: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 14 },
  dayBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  dayItems: { flex: 1, gap: 2 },
  dayItem: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
  quoteCard: { padding: 20, borderRadius: 20, marginTop: 24, marginBottom: 8 },
  quoteText: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold', lineHeight: 22, marginBottom: 8 },
  quoteAttrib: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16 },
  startBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
});
