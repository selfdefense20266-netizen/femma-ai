import React from 'react';
import { View, Text, StyleSheet, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, LEVEL_COLORS } from '@/context/AppContext';
import ProgressRing from '@/components/ProgressRing';
import BadgeCard, { type BadgeData } from '@/components/BadgeCard';
import SectionHeader from '@/components/SectionHeader';
import { useCatalog } from '@/hooks/useCatalog';
import { getCourseLessons, getVideoCategory, getVideoCourse } from '@/lib/catalog';

const BADGES: BadgeData[] = [
  { id: 'b1', title: '7 Day Streak', description: '7 days in a row', icon: 'zap', color: '#FFD88A', earned: true, earnedDate: 'Aug 1' },
  { id: 'b2', title: 'First Workout', description: 'First session done', icon: 'zap', color: '#F26BB5', earned: true, earnedDate: 'Jul 26' },
  { id: 'b3', title: 'Yoga Flow', description: '5 yoga sessions', icon: 'wind', color: '#B9A7F2', earned: true, earnedDate: 'Jul 30' },
  { id: 'b4', title: 'Safety Shield', description: 'Completed safety level 1', icon: 'shield', color: '#77CDED', earned: false },
  { id: 'b5', title: 'Scan Pro', description: '20 food scans', icon: 'camera', color: '#A9E4D2', earned: false },
  { id: 'b6', title: 'Warrior', description: 'Reached level 2', icon: 'award', color: '#77CDED', earned: true, earnedDate: 'Aug 2' },
  { id: 'b7', title: '30 Day Streak', description: '30 days in a row', icon: 'star', color: '#FF928F', earned: false },
  { id: 'b8', title: 'Goddess', description: 'Reach level 5', icon: 'heart', color: '#D94A9A', earned: false },
];

const WEEK_DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const WEEK_ACTIVE = [true, true, true, false, true, true, false];

export default function ProgressScreen() {
  const colors = useColors();
  const { profile, completedLessonIds } = useApp();
  const { data: catalog, isLoading } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];
  const nextLevelPts = [0, 1000, 3000, 6000, 10000][profile.level] ?? 10000;
  const prevLevelPts = [0, 0, 1000, 3000, 6000][profile.level] ?? 0;
  const levelProgress = (profile.points - prevLevelPts) / (nextLevelPts - prevLevelPts);

  const safetyLessonIds = new Set(
    catalog ? (getVideoCategory(catalog, 'self-defence')?.courses.flatMap(getCourseLessons).map((item) => item.id) ?? []) : []
  );
  const fitnessLessonIds = new Set(
    catalog ? (getVideoCategory(catalog, 'fitness')?.courses.flatMap(getCourseLessons).map((item) => item.id) ?? []) : []
  );
  const yogaCourse = catalog ? getVideoCourse(catalog, 'fit-yoga') : undefined;
  const yogaLessonIds = new Set(yogaCourse ? getCourseLessons(yogaCourse).map((item) => item.id) : []);

  const stats = [
    { label: 'Fitness Lessons', value: String(completedLessonIds.filter((id) => fitnessLessonIds.has(id)).length), icon: 'zap', color: '#F26BB5' },
    { label: 'Yoga Sessions', value: String(completedLessonIds.filter((id) => yogaLessonIds.has(id)).length), icon: 'wind', color: '#B9A7F2' },
    { label: 'Safety Lessons', value: String(completedLessonIds.filter((id) => safetyLessonIds.has(id)).length), icon: 'shield', color: '#77CDED' },
    { label: 'Total Completed', value: String(completedLessonIds.length), icon: 'check-circle', color: '#A9E4D2' },
  ];

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>Progress</Text>
        </View>

        <View style={styles.body}>
          {/* Level Card */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <LinearGradient colors={[levelColor + 'EE', levelColor + '99']} style={styles.levelCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.levelTop}>
                <View>
                  <Text style={styles.levelLabel}>Current Level</Text>
                  <Text style={styles.levelName}>{levelName}</Text>
                  <Text style={styles.levelPoints}>{profile.points.toLocaleString()} pts</Text>
                </View>
                <ProgressRing
                  progress={levelProgress}
                  size={90}
                  strokeWidth={8}
                  color="#FFFFFF"
                  label={`${Math.round(levelProgress * 100)}%`}
                />
              </View>
              {profile.level < 5 && (
                <View style={styles.nextLevelRow}>
                  <Text style={styles.nextLevelText}>
                    {(nextLevelPts - profile.points).toLocaleString()} pts to {LEVEL_NAMES[Math.min(profile.level + 1, 5) as keyof typeof LEVEL_NAMES]}
                  </Text>
                </View>
              )}
            </LinearGradient>
          </Animated.View>

          {/* Streak */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View style={[styles.streakCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.streakHeader}>
                <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Streak</Text>
                <View style={[styles.streakBadge, { backgroundColor: colors.warmYellow + '25', borderColor: colors.warmYellow + '50' }]}>
                  <Ionicons name="flame" size={14} color={colors.warmYellow} />
                  <Text style={[styles.streakBadgeText, { color: colors.warmYellow }]}>{profile.streak} days</Text>
                </View>
              </View>
              <View style={styles.weekRow}>
                {WEEK_DAYS.map((day, i) => (
                  <View key={i} style={styles.weekDayCol}>
                    <View style={[styles.weekDot, { backgroundColor: WEEK_ACTIVE[i] ? colors.primary : colors.muted }]}>
                      {WEEK_ACTIVE[i] && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.weekDay, { color: colors.mutedForeground }]}>{day}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <SectionHeader title="This Month" />
            <View style={styles.statsGrid}>
              {stats.map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}>
                    <Feather name={s.icon as any} size={18} color={s.color} />
                  </View>
                  <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Badges */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <SectionHeader title="Badges" />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 22 }}>
              {BADGES.map(b => <BadgeCard key={b.id} badge={b} />)}
            </ScrollView>
          </Animated.View>

          {/* Journey Map */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <View style={[styles.journeyCard, { backgroundColor: colors.softLavender, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Journey</Text>
              <View style={styles.journeyLevels}>
                {([1,2,3,4,5] as const).map(lvl => (
                  <View key={lvl} style={styles.journeyLevel}>
                    <View style={[styles.journeyDot, { backgroundColor: lvl <= profile.level ? LEVEL_COLORS[lvl] : colors.border, borderColor: lvl === profile.level ? LEVEL_COLORS[lvl] : 'transparent' }]}>
                      {lvl < profile.level && <Feather name="check" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.journeyLevelName, { color: lvl <= profile.level ? colors.foreground : colors.mutedForeground }]}>{LEVEL_NAMES[lvl]}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  body: { paddingHorizontal: 22, gap: 20 },
  levelCard: { borderRadius: 22, padding: 20 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_600SemiBold', marginBottom: 4 },
  levelName: { color: '#FFFFFF', fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  levelPoints: { color: 'rgba(255,255,255,0.85)', fontSize: 14, fontFamily: 'Manrope_600SemiBold', marginTop: 4 },
  nextLevelRow: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 10, padding: 10 },
  nextLevelText: { color: '#FFFFFF', fontSize: 13, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
  streakCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  streakHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  streakBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  streakBadgeText: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayCol: { alignItems: 'center', gap: 5 },
  weekDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  weekDay: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard: { flex: 1, minWidth: '45%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', gap: 6 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  statValue: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  journeyCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  journeyLevels: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  journeyLevel: { alignItems: 'center', gap: 6 },
  journeyDot: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  journeyLevelName: { fontSize: 10, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
});
