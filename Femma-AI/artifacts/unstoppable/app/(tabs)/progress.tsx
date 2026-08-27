import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_COLORS, LEVEL_NAMES } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import ProgressTrendChart from '@/components/ProgressTrendChart';
import BadgeCard from '@/components/BadgeCard';
import { useCatalog } from '@/hooks/useCatalog';
import { loadMealScans } from '@/lib/mealScanHistory';
import {
  buildProgressStatCards,
  buildProgressSummary,
  buildStrengthTrend,
  levelProgress,
  planProgressPercent,
  planWeekNumber,
  progressPlanQuote,
} from '@/lib/progressInsights';

const HERO_IMAGE =
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=85';

type Palette = ReturnType<typeof useColors>;

function HeroDecor({ topPad, colors }: { topPad: number; colors: Palette }) {
  return (
    <>
      <View style={[styles.heroBlob, styles.heroBlobPink, { top: topPad + 24, right: -18, backgroundColor: colors.pink + '28' }]} />
      <View style={[styles.heroBlob, styles.heroBlobLavender, { top: topPad + 98, right: 52, backgroundColor: colors.lavender + '30' }]} />
      <View style={[styles.heroBlob, styles.heroBlobMint, { top: topPad + 48, left: -24, backgroundColor: colors.mint + '35' }]} />
      <View style={[styles.heroLeaf, { top: topPad + 72, right: 18 }]}>
        <Feather name="feather" size={42} color={colors.lavender + '55'} />
      </View>
    </>
  );
}

function StatCard({
  icon,
  ionIcon,
  label,
  value,
  sub,
  trend,
  trendUp,
  bg,
  accent,
  width,
  palette,
}: {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  sub: string;
  trend: string;
  trendUp: boolean;
  bg: string;
  accent: string;
  width: number;
  palette: Palette;
}) {
  return (
    <View style={[styles.statCard, { backgroundColor: bg, width }]}>
      <View style={[styles.statIconWrap, { backgroundColor: palette.card }]}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={15} color={accent} />
        ) : (
          <Feather name={icon!} size={15} color={accent} />
        )}
      </View>
      <Text style={[styles.statLabel, { color: palette.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: palette.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statSub, { color: palette.mutedForeground }]} numberOfLines={1}>
        {sub}
      </Text>
      <View style={styles.statTrendRow}>
        <Feather name={trendUp ? 'arrow-up-right' : 'minus'} size={11} color={accent} />
        <Text style={[styles.statTrend, { color: accent }]} numberOfLines={1}>
          {trend}
        </Text>
      </View>
    </View>
  );
}

export default function ProgressScreen() {
  const colors = useColors();
  const { user } = useAuth();
  const { profile, missions, completedLessonIds, lessonWatchProgress, coachChatHistory } = useApp();
  const { data: catalog, isLoading } = useCatalog();
  const insets = useSafeAreaInsets();
  const { width: screenW } = useWindowDimensions();
  const topPad = insets.top + 4;
  const botPad = Math.max(insets.bottom, 12);
  const statCardW = Math.floor((screenW - 40 - 16) / 3);

  const [mealScanCount, setMealScanCount] = useState(0);

  useEffect(() => {
    loadMealScans(user?.email).then((scans) => setMealScanCount(scans.length));
  }, [user?.email]);

  const summary = useMemo(() => {
    if (!catalog) return null;
    return buildProgressSummary({
      profile,
      missions,
      completedLessonIds,
      lessonWatchProgress,
      catalog,
      mealScanCount,
      coachMessageCount: coachChatHistory.filter((m) => m.role === 'user').length,
    });
  }, [catalog, profile, missions, completedLessonIds, lessonWatchProgress, mealScanCount, coachChatHistory]);

  const level = levelProgress(profile);
  const planWeek = planWeekNumber(profile.journeyDay);
  const planPercent = summary ? planProgressPercent(summary, profile.journeyDay) : 0;
  const fitnessCompleted = summary?.categories.find((c) => c.id === 'fitness')?.completed ?? 0;

  const strengthTrend = useMemo(() => {
    if (!summary) return { values: [0, 0, 0, 0, 0, 0, 0, 0], currentWeek: 1, highlightIndex: 0 };
    return buildStrengthTrend({
      journeyDay: profile.journeyDay,
      fitnessCompleted,
      libraryPercent: summary.libraryPercent,
      lessonsCompleted: summary.lessonsCompleted,
      missionsDone: summary.missionsDone,
      points: profile.points,
    });
  }, [summary, profile.journeyDay, profile.points, fitnessCompleted]);

  const statCards = useMemo(() => {
    if (!summary) return null;
    return buildProgressStatCards({
      journeyDay: profile.journeyDay,
      fitnessCompleted,
      libraryPercent: summary.libraryPercent,
      levelPercent: level.percent,
      mealScanCount,
      streak: profile.streak,
      missionsDone: summary.missionsDone,
    });
  }, [summary, profile.journeyDay, profile.streak, fitnessCompleted, mealScanCount, level.percent]);

  const planQuote = summary
    ? progressPlanQuote(summary.missionPercent, planPercent, profile.journeyDay)
    : '';

  const earnedBadges = summary?.badges.filter((b) => b.earned).length ?? 0;
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : profile.name;
  const avatarInitial = (displayName || 'U')[0]?.toUpperCase() ?? 'U';
  const avatarColor = LEVEL_COLORS[profile.level];

  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.foreground,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    android: { elevation: 3 },
    default: {},
  });

  if (isLoading || !catalog || !summary || !statCards) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 96 }}>
        {/* Hero */}
        <View style={[styles.heroWrap, { backgroundColor: colors.softLavender }]}>
          <Image
            source={{ uri: HERO_IMAGE }}
            style={styles.heroImage}
            contentFit="cover"
            contentPosition="right center"
            cachePolicy="memory-disk"
            transition={240}
          />
          {/* Dark overlay on photo */}
          <View style={styles.heroDarkLayer} />
          <LinearGradient
            colors={['rgba(0,0,0,0.12)', 'rgba(0,0,0,0.28)', 'rgba(0,0,0,0.42)']}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Soft bottom fade into page background */}
          <LinearGradient
            colors={['transparent', colors.background + 'CC', colors.background]}
            locations={[0.42, 0.82, 1]}
            style={styles.heroFadeBottom}
          />
          <LinearGradient
            colors={[colors.softLavender + 'E6', colors.softLavender + '66', 'transparent']}
            start={{ x: 0, y: 0.35 }}
            end={{ x: 0.78, y: 0.65 }}
            style={StyleSheet.absoluteFill}
          />
          <HeroDecor topPad={topPad} colors={colors} />

          <View style={[styles.heroContent, { paddingTop: topPad }]}>
            <View style={styles.heroTopRow}>
              <TouchableOpacity
                style={styles.heroAvatarBtn}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/(tabs)/profile');
                }}
                accessibilityLabel="Open profile"
              >
                <View style={[styles.heroAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={styles.heroAvatarText}>{avatarInitial}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.heroIconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => Haptics.selectionAsync()}
              >
                <Feather name="bell" size={17} color={colors.foreground} />
                <View style={[styles.heroNotifDot, { backgroundColor: colors.primary, borderColor: colors.card }]} />
              </TouchableOpacity>
            </View>

            <View style={styles.heroTitleBlock}>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>Your Progress</Text>
              <View style={styles.heroPlanRow}>
                <Feather name="feather" size={13} color={colors.primary} />
                <Text style={[styles.heroPlanText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {profile.planName}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.body}>
          {/* Plan progress — overlaps hero like reference */}
          <Animated.View entering={FadeInDown.duration(420)} style={[styles.planCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.planRow}>
              <ProgressRing
                progress={planPercent / 100}
                size={116}
                strokeWidth={12}
                color={colors.primary}
                trackColor={colors.primary + '22'}
                label={`${planPercent}%`}
                sublabel="Complete"
                labelColor={colors.foreground}
                sublabelColor={colors.mutedForeground}
              />
              <View style={styles.planCopy}>
                <Text style={[styles.planTitle, { color: colors.foreground }]}>Plan Progress</Text>
                <Text style={[styles.planQuote, { color: colors.mutedForeground }]}>{planQuote}</Text>
                <View style={styles.weekRow}>
                  <Feather name="calendar" size={12} color={colors.primary} />
                  <Text style={[styles.weekText, { color: colors.foreground }]}>Week {planWeek} of 8</Text>
                </View>
                <ProgressBar progress={(planWeek / 8) * 100} color={colors.primary} trackColor={colors.muted} height={5} />
              </View>
            </View>
          </Animated.View>

          {/* Stat cards — fixed equal widths */}
          <Animated.View entering={FadeInDown.delay(60).duration(420)} style={styles.statRow}>
            <StatCard
              ionIcon="flame-outline"
              label="Workouts"
              value={statCards.workouts.value}
              sub={statCards.workouts.sub}
              trend={statCards.workouts.trend}
              trendUp={statCards.workouts.trendUp}
              bg={colors.mint + '40'}
              accent={LEVEL_COLORS[1]}
              width={statCardW}
              palette={colors}
            />
            <StatCard
              icon="activity"
              label="Strength"
              value={statCards.strength.value}
              sub={statCards.strength.sub}
              trend={statCards.strength.trend}
              trendUp={statCards.strength.trendUp}
              bg={colors.skyBlue + '30'}
              accent={colors.skyBlue}
              width={statCardW}
              palette={colors}
            />
            <StatCard
              icon="coffee"
              label="Nutrition"
              value={statCards.nutrition.value}
              sub={statCards.nutrition.sub}
              trend={statCards.nutrition.trend}
              trendUp={statCards.nutrition.trendUp}
              bg={colors.coral + '28'}
              accent={colors.coral}
              width={statCardW}
              palette={colors}
            />
          </Animated.View>

          {/* Strength trend chart */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)} style={[styles.chartCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <Text style={[styles.chartTitle, { color: colors.foreground }]}>Strength Trend</Text>
              <View style={[styles.chartFilter, { backgroundColor: colors.muted }]}>
                <Text style={[styles.chartFilterText, { color: colors.mutedForeground }]}>Last 8 Weeks</Text>
                <Feather name="chevron-down" size={13} color={colors.mutedForeground} />
              </View>
            </View>
            <ProgressTrendChart
              data={strengthTrend.values}
              highlightIndex={strengthTrend.highlightIndex}
              color={colors.primary}
              fillColor={colors.lavender}
              mutedColor={colors.mutedForeground}
            />
            <Text style={[styles.chartCaption, { color: colors.mutedForeground }]}>
              Week {strengthTrend.currentWeek} · {summary.lessonsCompleted} lessons · {profile.points.toLocaleString()} pts
            </Text>
          </Animated.View>

          {/* Compact level row */}
          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={[styles.levelRow, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.levelIcon, { backgroundColor: LEVEL_COLORS[profile.level] + '22' }]}>
              <Feather name="award" size={16} color={LEVEL_COLORS[profile.level]} />
            </View>
            <View style={styles.levelCopy}>
              <Text style={[styles.levelTitle, { color: colors.foreground }]}>
                Level {profile.level} · {level.levelName}
              </Text>
              <Text style={[styles.levelSub, { color: colors.mutedForeground }]}>
                {profile.points.toLocaleString()} points
                {profile.level < 5 ? ` · ${level.pointsToNext.toLocaleString()} to ${level.nextLevelName}` : ''}
              </Text>
            </View>
            <Text style={[styles.levelPct, { color: colors.primary }]}>
              {profile.level >= 5 ? 'MAX' : `${Math.round(level.percent * 100)}%`}
            </Text>
          </Animated.View>

          {/* Learning paths */}
          {summary.categories.length > 0 ? (
            <Animated.View entering={FadeInDown.delay(200).duration(420)}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Learning paths</Text>
              <View style={styles.pathList}>
                {summary.categories.map((cat) => (
                  <View key={cat.id} style={[styles.pathCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.pathTop}>
                      <View style={[styles.pathIcon, { backgroundColor: cat.color + '18' }]}>
                        <Feather name={cat.icon as keyof typeof Feather.glyphMap} size={16} color={cat.color} />
                      </View>
                      <View style={styles.pathCopy}>
                        <Text style={[styles.pathName, { color: colors.foreground }]}>{cat.label}</Text>
                        <Text style={[styles.pathMeta, { color: colors.mutedForeground }]}>
                          {cat.completed}/{cat.total} lessons
                        </Text>
                      </View>
                      <Text style={[styles.pathPct, { color: cat.color }]}>{cat.percent}%</Text>
                    </View>
                    <ProgressBar progress={cat.percent} color={cat.color} trackColor={colors.muted} height={4} />
                  </View>
                ))}
              </View>
            </Animated.View>
          ) : null}

          {/* Achievements */}
          <Animated.View entering={FadeInDown.delay(240).duration(420)}>
            <View style={styles.badgesHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Achievements</Text>
              <Text style={[styles.badgesCount, { color: colors.mutedForeground }]}>{earnedBadges} earned</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled
              contentContainerStyle={styles.badgesRow}
            >
              {summary.badges.map((badge) => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </ScrollView>
          </Animated.View>

          {/* Level journey */}
          <Animated.View entering={FadeInDown.delay(280).duration(420)} style={[styles.journeyCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 12 }]}>Level journey</Text>
            <View style={styles.journeyTrack}>
              {([1, 2, 3, 4, 5] as const).map((lvl) => {
                const active = lvl <= profile.level;
                const current = lvl === profile.level;
                return (
                  <View key={lvl} style={styles.journeyStep}>
                    <View
                      style={[
                        styles.journeyDot,
                        {
                          backgroundColor: active ? LEVEL_COLORS[lvl] : colors.muted,
                          borderWidth: current ? 2 : 0,
                          borderColor: LEVEL_COLORS[lvl],
                        },
                      ]}
                    >
                      {active && lvl < profile.level ? (
                        <Feather name="check" size={11} color="#FFFFFF" />
                      ) : (
                        <Text style={[styles.journeyNum, { color: active ? '#FFFFFF' : colors.mutedForeground }]}>{lvl}</Text>
                      )}
                    </View>
                    <Text style={[styles.journeyLabel, { color: active ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>
                      {LEVEL_NAMES[lvl]}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  heroWrap: {
    height: 286,
    overflow: 'hidden',
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '115%',
    height: '100%',
  },
  heroFadeBottom: {
    ...StyleSheet.absoluteFillObject,
  },
  heroDarkLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
  },
  heroBlob: {
    position: 'absolute',
    borderRadius: 999,
  },
  heroBlobPink: {
    width: 118,
    height: 118,
  },
  heroBlobLavender: {
    width: 76,
    height: 76,
  },
  heroBlobMint: {
    width: 62,
    height: 62,
  },
  heroLeaf: {
    position: 'absolute',
    transform: [{ rotate: '18deg' }],
  },
  heroContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    paddingBottom: 56,
    zIndex: 2,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroAvatarBtn: {
    ...Platform.select({
      ios: {
        shadowColor: '#17181C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  heroAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
  },
  heroAvatarText: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    color: '#FFFFFF',
  },
  heroIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    ...Platform.select({
      ios: { shadowColor: '#17181C', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
      default: {},
    }),
  },
  heroNotifDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  heroTitleBlock: { gap: 6, zIndex: 3, marginBottom: 10 },
  heroTitle: {
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 38,
    fontFamily: 'Manrope_800ExtraBold',
    fontWeight: '800',
  },
  heroPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroPlanText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium' },
  body: { paddingHorizontal: 20, gap: 14, marginTop: -22 },
  planCard: {
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  planCopy: { flex: 1, minWidth: 0, gap: 7 },
  planTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
  planQuote: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 },
  weekText: { fontSize: 11.5, fontFamily: 'Manrope_600SemiBold' },
  statRow: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  statCard: {
    borderRadius: 16,
    padding: 10,
    minHeight: 118,
    gap: 2,
  },
  statIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statLabel: { fontSize: 10.5, fontFamily: 'Manrope_500Medium' },
  statValue: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', lineHeight: 22 },
  statSub: { fontSize: 10, fontFamily: 'Manrope_500Medium' },
  statTrendRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 'auto', paddingTop: 4 },
  statTrend: { fontSize: 9.5, fontFamily: 'Manrope_700Bold', flex: 1 },
  chartCard: {
    borderRadius: 24,
    padding: 16,
    gap: 4,
    borderWidth: 1,
  },
  chartHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chartTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  chartFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  chartFilterText: { fontSize: 10.5, fontFamily: 'Manrope_500Medium' },
  chartCaption: {
    fontSize: 10.5,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    marginTop: 2,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  levelIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  levelCopy: { flex: 1, minWidth: 0 },
  levelTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  levelSub: { fontSize: 11, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  levelPct: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  sectionTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold', marginBottom: 10 },
  pathList: { gap: 8 },
  pathCard: { borderRadius: 16, padding: 12, gap: 8, borderWidth: 1 },
  pathTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pathIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  pathCopy: { flex: 1, minWidth: 0 },
  pathName: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  pathMeta: { fontSize: 10.5, fontFamily: 'Manrope_400Regular', marginTop: 1 },
  pathPct: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold' },
  badgesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badgesCount: { fontSize: 11.5, fontFamily: 'Manrope_500Medium' },
  badgesRow: { gap: 10, paddingBottom: 4 },
  journeyCard: { borderRadius: 20, padding: 16, gap: 12, borderWidth: 1 },
  journeyTrack: { flexDirection: 'row', justifyContent: 'space-between' },
  journeyStep: { alignItems: 'center', gap: 6, flex: 1 },
  journeyDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journeyNum: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  journeyLabel: { fontSize: 8.5, fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
});
