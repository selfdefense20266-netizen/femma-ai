import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, CYCLE_PHASE_INFO, LEVEL_COLORS } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useCatalog } from '@/hooks/useCatalog';
import { focusQuickLink } from '@/lib/dailyMissions';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import MissionCard from '@/components/MissionCard';
import { formatStreakLabel, formatStreakValue, getTodayMotivational } from '@/lib/todayCopy';

type Palette = ReturnType<typeof useColors>;

function DashboardStat({
  icon,
  ionIcon,
  value,
  label,
  accent,
  colors,
}: {
  icon?: keyof typeof Feather.glyphMap;
  ionIcon?: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  accent: string;
  colors: Palette;
}) {
  return (
    <View style={styles.statTile}>
      <View style={[styles.statIcon, { backgroundColor: accent + '18' }]}>
        {ionIcon ? (
          <Ionicons name={ionIcon} size={17} color={accent} />
        ) : (
          <Feather name={icon!} size={17} color={accent} />
        )}
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TodayScreen() {
  const colors = useColors();
  const {
    profile,
    missions,
    completeMission,
    missionsCompleted,
    totalMissions,
    onboardingCompleted,
    syncMissions,
  } = useApp();
  const { user } = useAuth();
  const { data: catalog } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  useEffect(() => {
    if (!onboardingCompleted) return;
    syncMissions(catalog);
  }, [
    catalog,
    onboardingCompleted,
    profile.goal,
    profile.fitnessLevel,
    profile.dailyTime,
    profile.foodPreference,
    profile.journeyDay,
    profile.cyclePhase,
    profile.isPregnant,
    syncMissions,
  ]);

  const progress = totalMissions > 0 ? missionsCompleted / totalMissions : 0;
  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];
  const phaseInfo = CYCLE_PHASE_INFO[profile.cyclePhase];
  const motivational = getTodayMotivational(profile, missionsCompleted, totalMissions);
  const trainingLink = focusQuickLink(profile.goal);
  const trainingSubtitle =
    trainingLink.label === 'Yoga'
      ? 'Flows & breathwork'
      : trainingLink.label === 'Safety'
        ? 'Defence & awareness'
        : 'Workouts & training';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'sunrise' : hour < 17 ? 'sun' : 'moon';
  const greetingColor = hour < 17 ? colors.warmYellow : colors.lavender;
  const headlineName = user?.firstName?.trim() || profile.name.split(' ')[0] || profile.name || 'there';
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const progressPct = Math.round(progress * 100);
  const missionsLabel =
    totalMissions === 0
      ? 'No missions yet'
      : missionsCompleted === totalMissions
        ? 'All missions complete'
        : `${totalMissions - missionsCompleted} left today`;

  const handleMissionPress = (href?: string, category?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (href) {
      router.push(href as never);
      return;
    }
    switch (category) {
      case 'fitness': router.push('/library/fitness' as never); break;
      case 'yoga': router.push('/yoga'); break;
      case 'safety': router.push('/library/self-defence' as never); break;
      case 'nutrition': router.push('/scan-food'); break;
      case 'recipe': router.push('/recipe'); break;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 100 }}
      >
        {/* Header + daily dashboard */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.headerGradient, { paddingTop: topPad }]}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.heroCopy}>
            <View style={styles.nameRow}>
              <Text style={[styles.heroName, { color: colors.foreground }]} numberOfLines={1}>
                {headlineName}
              </Text>
              <TouchableOpacity
                style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                accessibilityLabel="Notifications"
                activeOpacity={0.82}
              >
                <Feather name="bell" size={18} color={colors.foreground} />
                <View style={[styles.notifDot, { backgroundColor: colors.primary, borderColor: colors.card }]} />
              </TouchableOpacity>
            </View>
            <View style={styles.heroMetaRow}>
              <Text style={[styles.heroPlan, { color: colors.foreground }]} numberOfLines={1}>
                {profile.planName}
              </Text>
              <View style={[styles.dayPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
                <Text style={[styles.dayPillText, { color: colors.primary }]}>Day {profile.journeyDay}</Text>
              </View>
            </View>
            <View style={styles.contextRow}>
              <View style={[styles.greetingIconWrap, { backgroundColor: greetingColor + '20' }]}>
                <Feather name={greetingIcon} size={11} color={greetingColor} />
              </View>
              <Text style={[styles.contextText, { color: colors.mutedForeground }]}>
                {greeting} · {dateLabel}
              </Text>
            </View>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(130).duration(480)}
            style={[
              styles.dashboardCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...Platform.select({
                  ios: {
                    shadowColor: '#17181C',
                    shadowOffset: { width: 0, height: 10 },
                    shadowOpacity: 0.07,
                    shadowRadius: 24,
                  },
                  android: { elevation: 4 },
                  default: {},
                }),
              },
            ]}
          >
            <View style={styles.dashboardTop}>
              <Text style={[styles.dashboardEyebrow, { color: colors.mutedForeground }]}>TODAY'S PROGRESS</Text>
              <View style={[styles.missionCountPill, { backgroundColor: colors.muted }]}>
                <Feather name="target" size={11} color={colors.primary} />
                <Text style={[styles.missionCountText, { color: colors.foreground }]}>
                  {missionsCompleted}/{totalMissions || 0}
                </Text>
              </View>
            </View>

            <View style={styles.dashboardMain}>
              <ProgressRing
                progress={progress}
                size={112}
                strokeWidth={10}
                color={colors.primary}
                label={`${progressPct}%`}
                sublabel="done"
              />
              <View style={styles.dashboardProgressCopy}>
                <Text style={[styles.dashboardTitle, { color: colors.foreground }]}>
                  {totalMissions > 0 ? `${missionsCompleted} of ${totalMissions} missions` : 'Missions loading'}
                </Text>
                <Text style={[styles.dashboardSub, { color: colors.mutedForeground }]}>{missionsLabel}</Text>
                <ProgressBar
                  progress={progressPct}
                  color={colors.primary}
                  trackColor={colors.muted}
                  height={6}
                  style={styles.dashboardBar}
                />
              </View>
            </View>

            <View style={[styles.dashboardDivider, { backgroundColor: colors.border }]} />

            <View style={styles.statsGrid}>
              <DashboardStat
                ionIcon="flame"
                value={formatStreakValue(profile.streak)}
                label={formatStreakLabel(profile.streak)}
                accent={colors.warmYellow}
                colors={colors}
              />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <DashboardStat
                icon="award"
                value={levelName}
                label={`Level ${profile.level}`}
                accent={levelColor}
                colors={colors}
              />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <DashboardStat
                icon="star"
                value={profile.points.toLocaleString()}
                label="Points earned"
                accent={colors.primary}
                colors={colors}
              />
            </View>
          </Animated.View>
        </LinearGradient>

        <View style={styles.bodyPad}>
          {/* Motivational message */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={[styles.quoteRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="sun" size={16} color={colors.warmYellow} />
              <Text style={[styles.quoteText, { color: colors.foreground }]}>{motivational}</Text>
            </View>
          </Animated.View>

          {/* Cycle Insight */}
          {profile.cyclePhase !== 'none' && (
            <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <TouchableOpacity
                style={[styles.cycleCard, { backgroundColor: phaseInfo.color + '12', borderColor: phaseInfo.color + '30' }]}
                onPress={() => router.push('/cycle')}
                activeOpacity={0.8}
              >
                <View style={[styles.cycleDot, { backgroundColor: phaseInfo.color }]} />
                <View style={styles.cycleText}>
                  <Text style={[styles.cyclePhase, { color: phaseInfo.color }]}>{phaseInfo.name} Phase · Day {profile.cycleDay}</Text>
                  <Text style={[styles.cycleInsight, { color: colors.foreground }]}>{phaseInfo.insight}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Quick links */}
          <Animated.View entering={FadeInDown.delay(175).duration(480)} style={styles.quickLinksSection}>
            <Text style={[styles.quickLinksTitle, { color: colors.foreground }]}>Your libraries</Text>
            <View style={styles.quickLinksGrid}>
              {[
                {
                  label: trainingLink.label,
                  subtitle: trainingSubtitle,
                  icon: trainingLink.icon,
                  gradient: [colors.pink, colors.deepPink] as [string, string],
                  route: trainingLink.route,
                },
                {
                  label: 'Diet',
                  subtitle: 'Nutrition & recipes',
                  icon: 'coffee',
                  gradient: [colors.mint, colors.skyBlue] as [string, string],
                  route: '/library/diet-nutrition',
                },
                {
                  label: 'Safety',
                  subtitle: 'Self-defence skills',
                  icon: 'shield',
                  gradient: [colors.lavender, colors.pink] as [string, string],
                  route: '/library/self-defence',
                },
                {
                  label: 'Cycle',
                  subtitle: 'Health & pregnancy',
                  icon: 'heart',
                  gradient: [colors.coral, colors.pink] as [string, string],
                  route: '/library/cycle-pregnancy-health',
                },
              ].map((link, i) => (
                <Animated.View
                  key={link.route}
                  entering={FadeInDown.delay(200 + i * 60).duration(420)}
                  style={styles.quickLinkWrap}
                >
                  <TouchableOpacity
                    style={[styles.quickLinkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(link.route as never);
                    }}
                    activeOpacity={0.88}
                  >
                    <LinearGradient
                      colors={link.gradient}
                      style={styles.quickLinkHero}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <View style={styles.quickLinkIconWrap}>
                        <Feather name={link.icon as keyof typeof Feather.glyphMap} size={22} color="#FFFFFF" />
                      </View>
                    </LinearGradient>
                    <View style={styles.quickLinkBody}>
                      <Text style={[styles.quickLinkLabel, { color: colors.foreground }]} numberOfLines={1}>
                        {link.label}
                      </Text>
                      <View style={styles.quickLinkFooter}>
                        <Text style={[styles.quickLinkSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                          {link.subtitle}
                        </Text>
                        <View style={[styles.quickLinkArrow, { backgroundColor: colors.muted }]}>
                          <Feather name="arrow-right" size={14} color={colors.primary} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              ))}
            </View>
          </Animated.View>

          {/* Today's Missions */}
          <View style={styles.missionsSection}>
            <View style={styles.missionsSectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Missions</Text>
              <View style={[styles.completedBadge, { backgroundColor: missionsCompleted === totalMissions ? colors.mint + '30' : colors.muted }]}>
                <Text style={[styles.completedText, { color: missionsCompleted === totalMissions ? '#2d8a6b' : colors.mutedForeground }]}>
                  {missionsCompleted === totalMissions ? 'Done for today' : `${missionsCompleted}/${totalMissions} done`}
                </Text>
              </View>
            </View>

            {missionsCompleted === totalMissions && totalMissions > 0 ? (
              <View style={[styles.doneCard, { backgroundColor: colors.mint + '18', borderColor: colors.mint + '50' }]}>
                <View style={[styles.doneIcon, { backgroundColor: colors.mint }]}>
                  <Feather name="check" size={22} color="#FFFFFF" />
                </View>
                <Text style={[styles.doneTitle, { color: colors.foreground }]}>You did it. Done for today.</Text>
                <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
                  {profile.journeyDay <= 1 && profile.streak <= 1
                    ? `All ${totalMissions} missions complete. Great first day — come back tomorrow to keep building your streak.`
                    : `All ${totalMissions} missions complete. That consistency is how unstoppable confidence is built. Rest well — tomorrow's plan is waiting.`}
                </Text>
              </View>
            ) : null}

            {missions.map((mission, i) => (
              <Animated.View key={mission.id} entering={FadeInDown.delay(200 + i * 80).duration(400)}>
                <MissionCard
                  mission={mission}
                  onPress={() => handleMissionPress(mission.href, mission.category)}
                  onComplete={() => completeMission(mission.id)}
                />
              </Animated.View>
            ))}
          </View>

          {/* AI Coach shortcut */}
          <Animated.View entering={FadeInDown.delay(700).duration(500)}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push('/(tabs)/coach'); }}
            >
            <LinearGradient
              colors={[colors.deepPink, colors.lavender]}
              style={styles.aiCoachCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.aiCoachContent}>
                <View>
                  <Text style={styles.aiCoachLabel}>AI Coach</Text>
                  <Text style={styles.aiCoachTitle}>Ask me anything</Text>
                  <Text style={styles.aiCoachSub}>Personalized advice, motivation & tips</Text>
                </View>
                <View style={[styles.aiCoachBtn, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Feather name="message-circle" size={22} color="#FFFFFF" />
                </View>
              </View>
            </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 8 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroCopy: { marginBottom: 18, gap: 8 },
  heroName: {
    flex: 1,
    fontSize: 32,
    fontWeight: '800',
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.8,
    lineHeight: 38,
  },
  contextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 2,
  },
  contextText: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  greetingIconWrap: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    flexShrink: 0,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  heroPlan: {
    flexShrink: 1,
    fontSize: 15,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  dayPillText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.3,
  },
  dashboardCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
    marginBottom: 8,
  },
  dashboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dashboardEyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.1,
  },
  missionCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  missionCountText: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
  },
  dashboardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  dashboardProgressCopy: {
    flex: 1,
    gap: 6,
    minWidth: 0,
  },
  dashboardTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 23,
  },
  dashboardSub: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  dashboardBar: { marginTop: 4 },
  dashboardDivider: {
    height: 1,
    marginVertical: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.2,
  },
  statLabel: {
    fontSize: 10,
    fontFamily: 'Manrope_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 4,
  },
  bodyPad: { paddingHorizontal: 22, paddingTop: 16, gap: 12 },
  quoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  quoteText: { flex: 1, fontSize: 13, fontFamily: 'Manrope_600SemiBold', lineHeight: 19 },
  cycleCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, borderWidth: 1 },
  cycleDot: { width: 10, height: 10, borderRadius: 5 },
  cycleText: { flex: 1 },
  cyclePhase: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 2 },
  cycleInsight: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  missionsSection: { gap: 0 },
  missionsSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  completedBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  completedText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  doneCard: { borderRadius: 18, borderWidth: 1, padding: 18, alignItems: 'center', gap: 8, marginBottom: 14 },
  doneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  doneTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  doneText: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 20, textAlign: 'center' },
  aiCoachCard: { borderRadius: 20, padding: 20, marginTop: 4 },
  aiCoachContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiCoachLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Manrope_600SemiBold', marginBottom: 4, letterSpacing: 0.5 },
  aiCoachTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  aiCoachSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  aiCoachBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  quickLinksSection: { gap: 12, marginTop: 4 },
  quickLinksTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  quickLinksGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  quickLinkWrap: { width: '47.5%', flexGrow: 1 },
  quickLinkCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 148,
  },
  quickLinkHero: {
    height: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: 'flex-end',
  },
  quickLinkIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLinkBody: { padding: 12, gap: 8, flex: 1 },
  quickLinkLabel: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  quickLinkFooter: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  quickLinkSub: { flex: 1, fontSize: 11.5, fontFamily: 'Manrope_500Medium', lineHeight: 16 },
  quickLinkArrow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
