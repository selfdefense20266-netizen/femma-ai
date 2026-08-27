import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, CYCLE_PHASE_INFO, LEVEL_COLORS } from '@/context/AppContext';
import { useCatalog } from '@/hooks/useCatalog';
import { focusQuickLink } from '@/lib/dailyMissions';
import ProgressRing from '@/components/ProgressRing';
import MissionCard from '@/components/MissionCard';

const MOTIVATIONAL = [
  'Small steps build unstoppable confidence.',
  'You are stronger than yesterday.',
  'Listen to your body and move at your pace.',
  'Your next level is closer than you think.',
  "Today's mission is ready. Let's go.",
];

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
  const motivational = MOTIVATIONAL[profile.journeyDay % MOTIVATIONAL.length];
  const trainingLink = focusQuickLink(profile.goal);

  const getHour = () => new Date().getHours();
  const greeting = getHour() < 12 ? 'Good morning' : getHour() < 17 ? 'Good afternoon' : 'Good evening';

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
        {/* Header */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.headerGradient, { paddingTop: topPad }]}
        >
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground }]}>{greeting},</Text>
              <Text style={[styles.name, { color: colors.foreground }]}>{profile.name}</Text>
            </View>
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
            >
              <Feather name="bell" size={20} color={colors.foreground} />
            </TouchableOpacity>
          </View>

          <View style={[styles.planTag, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}>
            <Feather name="zap" size={12} color={colors.primary} />
            <Text style={[styles.planTagText, { color: colors.primary }]}>{profile.planName} · Day {profile.journeyDay}</Text>
          </View>

          {/* Progress Hero */}
          <View style={styles.progressHero}>
            <ProgressRing
              progress={progress}
              size={130}
              strokeWidth={11}
              color={colors.primary}
              label={`${missionsCompleted}/${totalMissions}`}
              sublabel="missions"
            />
            <View style={styles.progressStats}>
              {/* Streak */}
              <View style={[styles.statBubble, { backgroundColor: colors.warmYellow + '20', borderColor: colors.warmYellow + '40' }]}>
                <Ionicons name="flame" size={16} color={colors.warmYellow} />
                <Text style={[styles.statBubbleValue, { color: colors.foreground }]}>{profile.streak}</Text>
                <Text style={[styles.statBubbleLabel, { color: colors.mutedForeground }]}>day streak</Text>
              </View>
              {/* Level */}
              <View style={[styles.statBubble, { backgroundColor: levelColor + '20', borderColor: levelColor + '40' }]}>
                <Feather name="award" size={16} color={levelColor} />
                <Text style={[styles.statBubbleValue, { color: colors.foreground }]}>{levelName}</Text>
                <Text style={[styles.statBubbleLabel, { color: colors.mutedForeground }]}>{profile.points} pts</Text>
              </View>
            </View>
          </View>
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
          <View style={styles.quickLinks}>
            {[
              { label: trainingLink.label, icon: trainingLink.icon, color: colors.pink, route: trainingLink.route },
              { label: 'Diet', icon: 'coffee', color: colors.lavender, route: '/library/diet-nutrition' },
              { label: 'Safety', icon: 'shield', color: colors.skyBlue, route: '/library/self-defence' },
              { label: 'Cycle', icon: 'calendar', color: colors.coral, route: '/library/cycle-pregnancy-health' },
            ].map(link => (
              <TouchableOpacity
                key={link.label}
                style={[styles.quickLink, { backgroundColor: link.color + '14', borderColor: link.color + '30' }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(link.route as any); }}
                activeOpacity={0.8}
              >
                <Feather name={link.icon as any} size={20} color={link.color} />
                <Text style={[styles.quickLinkText, { color: colors.foreground }]}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

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
                  All {totalMissions} missions complete. That consistency is how unstoppable confidence is built. Rest well — tomorrow's plan is waiting.
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
  headerGradient: { paddingHorizontal: 22, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  greeting: { fontSize: 14, fontFamily: 'Manrope_400Regular' },
  name: { fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  notifBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  planTag: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, marginBottom: 20 },
  planTagText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  progressHero: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  progressStats: { flex: 1, gap: 10 },
  statBubble: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 14, borderWidth: 1 },
  statBubbleValue: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  statBubbleLabel: { fontSize: 11, fontFamily: 'Manrope_400Regular' },
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
  quickLinks: { flexDirection: 'row', gap: 10 },
  quickLink: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  quickLinkText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
});
