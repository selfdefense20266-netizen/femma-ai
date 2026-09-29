import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert, Modal } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, CYCLE_PHASE_INFO, LEVEL_COLORS } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePurchases } from '@/context/PurchaseContext';
import { useCatalog } from '@/hooks/useCatalog';
import ProgressRing from '@/components/ProgressRing';
import ProgressBar from '@/components/ProgressBar';
import MissionIcon from '@/components/MissionIcon';
import TodayCarousel, { type CarouselItem } from '@/components/TodayCarousel';
import { formatStreakLabel, formatStreakValue } from '@/lib/todayCopy';
import { resolveMissionHref } from '@/lib/missionHref';
import { sortTodayMissions } from '@/lib/buildCoursePlan';
import { FOOD_MEALS, FOOD_RECIPES } from '@/lib/foodLabels';
import { planTotalDays } from '@/lib/trainingPlan';
import BellButton from '@/components/BellButton';
import { useDailyPlan } from '@/hooks/useDailyPlan';
import { useRecoverySections } from '@/hooks/useRecoverySections';
import { useAppHomeTitles } from '@/hooks/useAppSettings';
import { useProgramCards } from '@/hooks/useProgramCards';
import { DEFAULT_HOME_TITLES } from '@/lib/appSettings';
import { itemMetaLine, itemsForDay, intensityFromProfile, userTypeFromProfile, type DailyPlanItem } from '@/lib/dailyPlans';
import { defaultMediaForDailyItem } from '@/lib/dailyPlanMedia';
import { sectionExercisesForLevel } from '@/lib/recoverySections';
import { Image } from 'expo-image';

type Palette = ReturnType<typeof useColors>;

function polishMission<T extends { slot?: string; category: string; label?: string; cue?: string; title: string }>(
  mission: T,
  foodPreference?: string,
  journeyDay = 1
): T {
  const diet = foodPreference && foodPreference !== 'Eat everything' ? foodPreference : '';
  const key =
    Object.keys(FOOD_RECIPES).find((item) => item.toLowerCase() === (foodPreference || '').toLowerCase()) ||
    'Eat everything';
  const index = Math.max(0, (journeyDay - 1) % 7);
  if (mission.slot === 'course' || mission.label === 'Watch') {
    return { ...mission, label: 'Course' };
  }
  if (mission.slot === 'recipe' || mission.category === 'recipe') {
    return {
      ...mission,
      title: FOOD_RECIPES[key]?.[index] || mission.title,
      label: 'Recipe',
      cue: diet
        ? `Fits your ${diet.toLowerCase()} meals — only what you can eat.`
        : 'A balanced recipe for your training plan.',
    };
  }
  if (mission.slot === 'meal' || mission.category === 'nutrition') {
    return {
      ...mission,
      title: FOOD_MEALS[key]?.[index] || mission.title,
      label: 'Scan',
      cue: diet
        ? `Scan to check calories and whether it fits ${diet.toLowerCase()}.`
        : 'Scan your plate for calories and plan fit.',
    };
  }
  return mission;
}

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

let planGateShownThisSession = false;

export default function TodayScreen() {
  const colors = useColors();
  const {
    profile,
    missions,
    missionsCompleted,
    totalMissions,
    onboardingCompleted,
    syncMissions,
    startNewPlan,
    activityLog,
    completeMission,
    skipTodayTasks,
  } = useApp();
  const { user } = useAuth();
  const { isPremium, ready: purchasesReady } = usePurchases();
  const { data: catalog } = useCatalog();
  const { data: adminDailyPlan } = useDailyPlan();
  const { data: recoverySections = [] } = useRecoverySections();
  const { data: programCards = [] } = useProgramCards();
  const { data: homeTitles = DEFAULT_HOME_TITLES } = useAppHomeTitles();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [restModalOpen, setRestModalOpen] = useState(false);
  const programItems: CarouselItem[] = programCards.map((card) => ({
    id: card.id,
    tag: 'Program',
    title: card.title,
    meta: card.subtitle || card.courseTitle || 'Open course',
    media: card.imageUrl ? (
      <Image source={{ uri: card.imageUrl }} style={styles.programMedia} contentFit="cover" />
    ) : (
      <View style={[styles.programMediaFallback, { backgroundColor: colors.primary + '14' }]}>
        <Feather name="book-open" size={36} color={colors.primary} />
      </View>
    ),
    onPress: () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(card.route as never);
    },
  }));


  useEffect(() => {
    if (!onboardingCompleted || !purchasesReady || isPremium || planGateShownThisSession) return;
    // Debounce: premium status can settle a beat after `ready` flips (DB sync,
    // RevenueCat listener correction, etc). Wait briefly and re-check instead
    // of navigating immediately — if isPremium corrects to true in the
    // meantime, this effect re-runs and the cleanup below cancels the timer,
    // so the gate never shows (no push-then-immediately-dismiss flash).
    // 1.8s covers the realistic worst case of several chained Supabase
    // round trips needed to resolve the member/plan on a cold start.
    const timer = setTimeout(() => {
      planGateShownThisSession = true;
      router.push('/plan-gate');
    }, 1800);
    return () => clearTimeout(timer);
  }, [onboardingCompleted, purchasesReady, isPremium]);

  useEffect(() => {
    if (!onboardingCompleted) return;
    if (profile.trainingPlan?.status === 'completed') return;
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
    profile.trainingPlan?.status,
    syncMissions,
  ]);

  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];
  const phaseInfo = CYCLE_PHASE_INFO[profile.cyclePhase] || CYCLE_PHASE_INFO.none;
  const orderedMissions = sortTodayMissions(missions)
    .filter((mission) => isPremium || mission.category !== 'nutrition')
    .map((mission) => polishMission(mission, profile.foodPreference, profile.journeyDay));

  const taskMissionsRaw = orderedMissions.filter(
    (m) => m.category !== 'recipe' && m.category !== 'nutrition' && m.slot !== 'meal' && m.slot !== 'recipe'
  );
  const taskMissions = taskMissionsRaw.length > 0 ? taskMissionsRaw : orderedMissions;

  const isItemCompleted = (id: string) => {
    if (!id) return false;
    if (missions.some((m) => (m.id === id || m.lessonId === id) && m.completed && !m.skipped)) return true;
    return activityLog.some((event) => event.ref === id);
  };

  const isItemSkipped = (id: string) => {
    if (!id) return false;
    if (missions.some((m) => (m.id === id || m.lessonId === id) && m.skipped)) return true;
    return activityLog.some((event) => event.ref === `skip:${id}`);
  };

  const daySkipped = activityLog.some((event) => event.ref === `day-skip:${profile.journeyDay || 1}`);

  const adminAccent = (item: DailyPlanItem) => {
    if (item.itemType === 'food') return colors.warmYellow;
    if (item.itemType === 'recovery') return colors.lavender;
    if (item.itemType === 'rest') return colors.mint;
    return colors.primary;
  };

  const adminItemToCarousel = (item: DailyPlanItem, dayTaskIds = ''): CarouselItem => {
    const levelTag = (item.intensityLevel || 'guided').replace(/-/g, ' ');
    const planTitle = (adminDailyPlan?.title || adminDailyPlan?.userType || 'plan').replace(/-/g, ' ');
    const planTag = adminDailyPlan ? `${planTitle} • ${levelTag}`.toUpperCase() : null;
    const completed = isItemCompleted(item.id);
    const skipped = !completed && (daySkipped || isItemSkipped(item.id));
    const media = item.mediaUrl?.trim()
      ? item.mediaUrl.trim()
      : defaultMediaForDailyItem({ ...item, mediaUrl: null });
    return {
      id: item.id,
      tag: planTag || item.tag || `${item.itemType} • Guided`,
      title: item.title,
      meta: itemMetaLine(item),
      completed,
      skipped,
      media: (
        <MissionIcon
          title={item.title}
          category={item.itemType === 'food' ? 'recipe' : item.itemType === 'recovery' ? 'yoga' : 'fitness'}
          slot={item.itemType === 'food' ? 'recipe' : 'exercise'}
          icon={item.itemType === 'food' ? 'coffee' : item.itemType === 'rest' ? 'pause' : 'activity'}
          accentColor={adminAccent(item)}
          size={220}
          iconSize={36}
          style={styles.carouselMedia}
          contentFit="contain"
          imageUrl={media}
          lockMedia
        />
      ),
      onPress: () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (item.itemType === 'food') {
          router.push('/recipe' as never);
          return;
        }
        router.push({
          pathname: '/exercise-guide',
          params: {
            title: item.title,
            animation: 'flow',
            cue: item.cue || '',
            duration: String(item.durationMinutes || 10),
            steps: (item.steps || []).join('|'),
            missionId: item.id,
            category: item.itemType === 'recovery' || item.itemType === 'rest' ? 'yoga' : 'fitness',
            mediaUrl: typeof media === 'string' ? media : '',
            dayTaskIds,
          },
        } as never);
      },
    };
  };

  const adminTaskRaw = itemsForDay(adminDailyPlan, profile.journeyDay || 1, ['exercise', 'rest']);
  const dayTaskIdsParam = adminTaskRaw.map((item) => item.id).join('|');
  const adminTaskItems = adminTaskRaw.map((item) => adminItemToCarousel(item, dayTaskIdsParam));
  const todayTaskIdList = adminTaskRaw.map((item) => item.id);

  const fallbackTaskItems: CarouselItem[] = taskMissions.map((mission) => {
    const tagParts = [
      mission.label || mission.category || 'Task',
      mission.difficulty || (mission.slot === 'course' ? 'Guided' : 'Today'),
    ];
    const completed = Boolean(mission.completed && !mission.skipped) || isItemCompleted(mission.id);
    const skipped = !completed && (Boolean(mission.skipped) || daySkipped || isItemSkipped(mission.id));
    return {
      id: mission.id,
      tag: tagParts.join(' • '),
      title: mission.title,
      meta: [
        mission.duration > 0 ? `${mission.duration} Mins` : null,
        mission.calories > 0 ? `${mission.calories} kcal` : null,
        completed ? 'Done' : skipped ? 'Skipped' : null,
      ]
        .filter(Boolean)
        .join(' • '),
      completed,
      skipped,
      media: (
        <MissionIcon
          title={mission.title}
          animation={mission.animation}
          category={mission.category}
          slot={mission.slot}
          icon={mission.icon}
          accentColor={mission.accentColor}
          size={220}
          iconSize={36}
          style={styles.carouselMedia}
          contentFit="contain"
          imageUrl={
            mission.slot === 'recipe' || mission.category === 'recipe'
              ? require('@/assets/recipes/r1.webp')
              : mission.slot === 'meal' || mission.category === 'nutrition'
                ? require('@/assets/recipes/r5.webp')
                : undefined
          }
        />
      ),
      onPress: () => handleMissionPress(mission),
    };
  });

  const hasAdminTasks = adminTaskItems.length > 0;
  const taskItems = hasAdminTasks ? adminTaskItems : fallbackTaskItems;
  const fallbackTaskIds = taskMissions.map((m) => m.id);
  const skipTargetIds = hasAdminTasks ? todayTaskIdList : fallbackTaskIds;

  // Progress ring follows Today Tasks count (admin plan = 5 exercises, not roadmap 4).
  const displayTotalMissions = hasAdminTasks
    ? taskItems.length
    : isPremium
      ? totalMissions
      : orderedMissions.length;
  const displayMissionsCompleted = hasAdminTasks
    ? taskItems.filter((item) => item.completed || item.skipped).length
    : isPremium
      ? missionsCompleted
      : orderedMissions.filter((m) => m.completed || m.skipped).length;

  const progress = displayTotalMissions > 0 ? displayMissionsCompleted / displayTotalMissions : 0;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'sun' : hour < 17 ? 'sun' : 'moon';
  const greetingColor = hour < 17 ? colors.warmYellow : colors.lavender;
  const rawHeadlineName = user?.firstName?.trim() || profile.name.split(' ')[0] || profile.name || 'there';
  const headlineName = rawHeadlineName.charAt(0).toUpperCase() + rawHeadlineName.slice(1);
  const planActivityRaw =
    adminDailyPlan?.userType ||
    userTypeFromProfile({
      goal: profile.goal,
      isPregnant: profile.isPregnant,
      fitnessLevel: profile.fitnessLevel,
    });
  const planActivityLabel = planActivityRaw
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const planLevelId = intensityFromProfile(profile.fitnessLevel);
  const planLevelLabel =
    planLevelId === 'active' ? 'Active' : planLevelId === 'intermediate' ? 'Intermediate' : 'Beginner';
  const planDisplayName = adminDailyPlan?.title || profile.planName || `${planActivityLabel} Plan`;
  const dateLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  const progressPct = Math.round(progress * 100);
  const totalDays = planTotalDays(profile.planDurationWeeks || profile.trainingPlan?.durationWeeks);
  const todayDone =
    daySkipped || (displayMissionsCompleted === displayTotalMissions && displayTotalMissions > 0);
  const todayTaskIdsKey = hasAdminTasks ? taskItems.map((item) => item.id).join('|') : '';

  // Rest only when no Today Task has been started/completed yet.
  const anyTodayTaskStarted = skipTargetIds.some((id) => isItemCompleted(id));
  const restDisabled = daySkipped || anyTodayTaskStarted;

  // Safety: if all Today Tasks are done but day points weren't awarded yet, grant once.
  useEffect(() => {
    if (!hasAdminTasks || !todayDone || !todayTaskIdsKey || daySkipped) return;
    const dayEarnRef = `day-earn:${profile.journeyDay || 1}`;
    if (activityLog.some((event) => event.ref === dayEarnRef)) return;
    const ids = todayTaskIdsKey.split('|').filter(Boolean);
    const lastId = ids[ids.length - 1];
    if (!lastId) return;
    completeMission(lastId, { dayTaskIds: ids });
  }, [hasAdminTasks, todayDone, todayTaskIdsKey, activityLog, profile.journeyDay, completeMission, daySkipped]);

  const confirmRestDay = () => {
    if (restDisabled) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    skipTodayTasks(skipTargetIds);
    setRestModalOpen(false);
  };

  const startRecoveryStretch = (sectionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (!anyTodayTaskStarted && !daySkipped) {
      skipTodayTasks(skipTargetIds);
    }
    router.push(`/recovery/${sectionId}` as never);
  };

  const planFinished =
    profile.trainingPlan?.status === 'completed' ||
    (!daySkipped && todayDone && (profile.journeyDay || 1) >= totalDays);
  const missionsLabel =
    displayTotalMissions === 0
      ? 'No missions yet'
      : daySkipped
        ? 'Rest / recovery day'
        : displayMissionsCompleted === displayTotalMissions
          ? 'All missions complete'
          : `${displayTotalMissions - displayMissionsCompleted} left today`;

  const handleMissionPress = (mission: (typeof missions)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (mission.slot === 'exercise' || mission.animation) {
      router.push({
        pathname: '/exercise-guide',
        params: {
          title: mission.title,
          animation: mission.animation || 'flow',
          cue: mission.cue || '',
          duration: String(mission.duration || 10),
          steps: (mission.steps || []).join('|'),
          missionId: mission.id,
          category: mission.category || '',
          mediaUrl: typeof mission.mediaUrl === 'string' ? mission.mediaUrl : '',
        },
      } as never);
      return;
    }
    const href = resolveMissionHref(mission, profile.trainingPlan, catalog);
    router.push(href as never);
  };

  if (planFinished) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.softLavender, colors.background, colors.primary + '18']}
          style={[styles.congratsScreen, { paddingTop: topPad, paddingBottom: botPad + 88 }]}
        >
          <Text style={[styles.congratsKicker, { color: colors.primary }]}>PLAN COMPLETE</Text>
          <View style={[styles.congratsIcon, { backgroundColor: colors.primary }]}>
            <Feather name="award" size={42} color="#FFFFFF" />
          </View>
          <Text style={[styles.congratsTitle, { color: colors.foreground }]}>Congratulations</Text>
          <Text style={[styles.congratsLead, { color: colors.foreground }]}>
            You finished your {profile.planName || 'plan'}.
          </Text>
          <Text style={[styles.congratsBody, { color: colors.mutedForeground }]}>
            Your streak, points, and level stay with you. Start a new plan whenever you’re ready.
          </Text>

          <View style={styles.congratsStats}>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{profile.streak}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Streak</Text>
            </View>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{profile.points.toLocaleString()}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Points</Text>
            </View>
            <View style={[styles.congratsStat, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.congratsStatValue, { color: colors.foreground }]}>{levelName}</Text>
              <Text style={[styles.congratsStatLabel, { color: colors.mutedForeground }]}>Level {profile.level}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.congratsBtn, { backgroundColor: colors.primary }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              startNewPlan();
              router.replace('/onboarding');
            }}
            activeOpacity={0.88}
          >
            <Text style={styles.congratsBtnText}>Start a new plan</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
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
              <BellButton />
            </View>
            <View style={styles.heroMetaRow}>
              <Text style={[styles.heroPlan, { color: colors.foreground }]} numberOfLines={1}>
                {planDisplayName}
              </Text>
              <View style={[styles.dayPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
                <Text style={[styles.dayPillText, { color: colors.primary }]}>Day {profile.journeyDay}</Text>
              </View>
            </View>
            <View style={styles.planTypeRow}>
              <View style={[styles.planTypePill, { backgroundColor: colors.lavender + '22', borderColor: colors.lavender + '40' }]}>
                <Text style={[styles.planTypeText, { color: colors.lavender }]}>{planActivityLabel}</Text>
              </View>
              <View style={[styles.planTypePill, { backgroundColor: colors.mint + '22', borderColor: colors.mint + '50' }]}>
                <Text style={[styles.planTypeText, { color: '#239B7A' }]}>{planLevelLabel}</Text>
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
            style={[styles.dashboardCardWrap, styles.softShadow]}
          >
            <LinearGradient
              colors={[colors.primary, colors.lavender]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.dashboardAccentBar}
            />
            <LinearGradient
              colors={['#FFFFFF', '#FCFBFE']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.dashboardCard, { borderColor: 'rgba(23,24,28,0.06)' }]}
            >
              <View style={styles.dashboardTop}>
                <View style={[styles.dashboardEyebrowPill, { backgroundColor: colors.primary + '12' }]}>
                  <Text style={[styles.dashboardEyebrow, { color: colors.primary }]}>TODAY</Text>
                </View>
                <Text style={[styles.missionCountText, { color: colors.mutedForeground }]}>
                  {displayMissionsCompleted}/{displayTotalMissions || 0} complete
                </Text>
              </View>

              <View style={styles.dashboardMain}>
                <View style={[styles.ringHalo, { backgroundColor: colors.primary + '0D' }]}>
                  <ProgressRing
                    progress={progress}
                    size={100}
                    strokeWidth={9}
                    color={colors.primary}
                    label={`${progressPct}%`}
                    sublabel="done"
                  />
                </View>
                <View style={styles.dashboardProgressCopy}>
                  <Text style={[styles.dashboardTitle, { color: colors.foreground }]}>
                    {displayTotalMissions > 0 ? `${displayMissionsCompleted} of ${displayTotalMissions} missions` : 'Your day is ready'}
                  </Text>
                  <Text style={[styles.dashboardSub, { color: colors.mutedForeground }]}>{missionsLabel}</Text>
                  <ProgressBar
                    progress={progressPct}
                    color={colors.primary}
                    trackColor={colors.muted}
                    height={5}
                    style={styles.dashboardBar}
                  />
                </View>
              </View>

              <View style={[styles.dashboardDivider, { backgroundColor: 'rgba(23,24,28,0.06)' }]} />

              <View style={styles.statsGrid}>
                <DashboardStat
                  ionIcon="flame"
                  value={formatStreakValue(profile.streak)}
                  label={formatStreakLabel(profile.streak)}
                  accent={colors.warmYellow}
                  colors={colors}
                />
                <View style={[styles.statDivider, { backgroundColor: 'rgba(23,24,28,0.06)' }]} />
                <DashboardStat
                  icon="award"
                  value={levelName}
                  label={`Level ${profile.level}`}
                  accent={levelColor}
                  colors={colors}
                />
                <View style={[styles.statDivider, { backgroundColor: 'rgba(23,24,28,0.06)' }]} />
                <DashboardStat
                  icon="star"
                  value={(profile.points || 0).toLocaleString()}
                  label="Points"
                  accent={colors.primary}
                  colors={colors}
                />
              </View>
            </LinearGradient>
          </Animated.View>
        </LinearGradient>

        <View style={styles.bodyPad}>
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
              <TouchableOpacity
                style={[
                  styles.cycleCard,
                  styles.softShadow,
                  { backgroundColor: colors.card, borderColor: 'rgba(23,24,28,0.06)' },
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push('/cycle' as never);
                }}
                activeOpacity={0.85}
              >
                <View
                  style={[
                    styles.cycleIcon,
                    {
                      backgroundColor:
                        (profile.cyclePhase !== 'none' ? phaseInfo.color : colors.mint) + '14',
                    },
                  ]}
                >
                  <Feather
                    name="heart"
                    size={14}
                    color={profile.cyclePhase !== 'none' ? phaseInfo.color : colors.mint}
                  />
                </View>
                <View style={styles.cycleText}>
                  {profile.cyclePhase !== 'none' ? (
                    <>
                      <Text style={[styles.cyclePhase, { color: phaseInfo.color }]}>
                        {phaseInfo.name} · Day {profile.cycleDay}
                      </Text>
                      <Text style={[styles.cycleInsight, { color: colors.mutedForeground }]}>
                        {phaseInfo.insight}
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.cyclePhase, { color: colors.mint }]}>Track your cycle</Text>
                      <Text style={[styles.cycleInsight, { color: colors.mutedForeground }]}>
                        Tap to set your cycle day and get phase tips
                      </Text>
                    </>
                  )}
                </View>
                <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Animated.View>

          {todayDone ? (
            <View style={[styles.doneCard, { backgroundColor: colors.mint + '18', borderColor: colors.mint + '50' }]}>
              <View style={[styles.doneIcon, { backgroundColor: colors.mint }]}>
                <Feather name="check" size={22} color="#FFFFFF" />
              </View>
              <Text style={[styles.doneTitle, { color: colors.foreground }]}>
                {daySkipped ? 'Rest day logged.' : 'You did it. Done for today.'}
              </Text>
              <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
                {daySkipped
                  ? 'Today’s tasks were skipped — no points today. Come back tomorrow stronger.'
                  : profile.journeyDay <= 1 && profile.streak <= 1
                    ? `All ${displayTotalMissions} missions complete. Great first day — come back tomorrow to keep building your streak.`
                    : `All ${displayTotalMissions} missions complete. That consistency is how unstoppable confidence is built. Rest well — tomorrow's plan is waiting.`}
              </Text>
            </View>
          ) : null}
        </View>

        <Animated.View entering={FadeInDown.delay(180).duration(500)} style={styles.carousels}>
          <TodayCarousel
            title={homeTitles.todayTasksTitle}
            items={taskItems}
            onSeeAll={() => router.push('/(tabs)/explore')}
          />

          <View style={styles.recoverySection}>
            <View style={styles.recoveryHeader}>
              <Text style={[styles.recoveryTitle, { color: colors.foreground }]}>{homeTitles.recoveryTitle}</Text>
              <Feather name="info" size={16} color={colors.mutedForeground} />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recoveryRow}
              decelerationRate="fast"
            >
              {recoverySections.map((section, index) => {
                const intensity = intensityFromProfile(profile.fitnessLevel);
                const count = section.isRest ? 0 : sectionExercisesForLevel(section, intensity).length;
                const showToday = index === 0 && !daySkipped;
                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[styles.recoveryPhotoCard, section.isRest || section.sectionKey === 'rest' ? (restDisabled ? { opacity: 0.45 } : null) : null]}
                    activeOpacity={0.9}
                    disabled={Boolean((section.isRest || section.sectionKey === 'rest') && restDisabled)}
                    onPress={() => {
                      if (section.isRest || section.sectionKey === 'rest') {
                        if (restDisabled) return;
                        Haptics.selectionAsync();
                        setRestModalOpen(true);
                        return;
                      }
                      startRecoveryStretch(section.id);
                    }}
                  >
                    <View style={styles.recoveryMediaWrap}>
                      {section.coverUrl ? (
                        <Image source={{ uri: section.coverUrl }} style={styles.recoveryMedia} contentFit="contain" />
                      ) : (
                        <View style={[styles.recoveryMedia, { backgroundColor: colors.muted, alignItems: 'center', justifyContent: 'center' }]}>
                          <Feather name="wind" size={32} color={colors.mutedForeground} />
                        </View>
                      )}
                      {showToday ? (
                        <View style={[styles.todayBadge, { backgroundColor: colors.lavender }]}>
                          <Text style={styles.todayBadgeText}>TODAY</Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={[styles.recoveryPhotoTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {section.title}
                    </Text>
                    {!section.isRest ? (
                      <Text style={[styles.recoveryPhotoMeta, { color: colors.mutedForeground }]}>
                        1 Section · {count} Exercises
                      </Text>
                    ) : (
                      <Text style={[styles.recoveryPhotoMeta, { color: colors.mutedForeground }]}>
                        {restDisabled
                          ? daySkipped
                            ? 'Rest logged today'
                            : 'Locked · tasks started'
                          : 'Skip today · no points'}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {programItems.length ? (
            <TodayCarousel
              title={homeTitles.programTitle}
              items={programItems}
              mediaAspectRatio={4 / 5}
              cardWidth={168}
            />
          ) : null}

          <View style={styles.foodSection}>
            <View style={styles.foodHeader}>
              <Text style={[styles.foodTitle, { color: colors.foreground }]}>{homeTitles.foodTitle}</Text>
            </View>
            <View style={styles.foodOptionsRow}>
              {isPremium ? (
                <TouchableOpacity
                  style={[styles.foodOptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  activeOpacity={0.88}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/scan-food' as never);
                  }}
                >
                  <View style={[styles.foodOptionIcon, { backgroundColor: colors.warmYellow + '22' }]}>
                    <Feather name="aperture" size={22} color={colors.warmYellow} />
                  </View>
                  <Text style={[styles.foodOptionLabel, { color: colors.foreground }]}>Scan Meal</Text>
                  <Text style={[styles.foodOptionMeta, { color: colors.mutedForeground }]}>Premium · plate scan</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.foodOptionCard,
                  !isPremium && styles.foodOptionCardWide,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/recipe' as never);
                }}
              >
                <View style={[styles.foodOptionIcon, { backgroundColor: colors.primary + '18' }]}>
                  <Feather name="coffee" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.foodOptionLabel, { color: colors.foreground }]}>Recipes</Text>
                <Text style={[styles.foodOptionMeta, { color: colors.mutedForeground }]}>Browse all recipes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>

        <View style={styles.bodyPad}>
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

      <Modal visible={restModalOpen} transparent animationType="fade" onRequestClose={() => setRestModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <View style={[styles.modalIcon, { backgroundColor: colors.mint + '22' }]}>
              <Feather name="moon" size={28} color={colors.mint} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Rest today?</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              {restDisabled
                ? anyTodayTaskStarted
                  ? 'You’ve already started today’s tasks, so rest is locked for today.'
                  : 'Rest is already logged for today.'
                : 'Today’s tasks will be marked skipped. You won’t earn points for this day.'}
            </Text>
            <TouchableOpacity
              style={[
                styles.modalPrimary,
                { backgroundColor: colors.primary, opacity: restDisabled ? 0.4 : 1 },
              ]}
              onPress={confirmRestDay}
              activeOpacity={0.88}
              disabled={restDisabled}
            >
              <Text style={styles.modalPrimaryText}>Yes, rest today</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setRestModalOpen(false)} activeOpacity={0.8}>
              <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  headerGradient: { paddingHorizontal: 20, paddingBottom: 4 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  heroCopy: { marginBottom: 10, gap: 8 },
  heroName: {
    flex: 1,
    minWidth: 0,
    fontSize: 24,
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
  planTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginTop: 2,
  },
  planTypePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  planTypeText: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.2,
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
  dashboardCardWrap: {
    borderRadius: 24,
    marginBottom: 8,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
  },
  softShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#17181C',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 18,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  dashboardAccentBar: {
    height: 3,
    width: '100%',
  },
  dashboardCard: {
    borderRadius: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 16,
  },
  dashboardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dashboardEyebrowPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  dashboardEyebrow: {
    fontSize: 10,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
  },
  ringHalo: {
    borderRadius: 999,
    padding: 5,
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
    fontFamily: 'Manrope_500Medium',
  },
  dashboardMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dashboardProgressCopy: {
    flex: 1,
    gap: 5,
    minWidth: 0,
  },
  dashboardTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  dashboardSub: {
    fontSize: 13,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 18,
  },
  dashboardBar: { marginTop: 6 },
  dashboardDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  statTile: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
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
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  statDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: 6,
  },
  bodyPad: { paddingHorizontal: 22, paddingTop: 16, gap: 12 },
  carousels: { paddingTop: 8, gap: 22 },
  recoverySection: { marginBottom: 4 },
  recoveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    marginBottom: 8,
    paddingTop: 0,
    paddingBottom: 0,
  },
  recoveryTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.3,
  },
  recoveryRow: { paddingHorizontal: 22, gap: 14 },
  recoveryPhotoCard: {
    width: 240,
    gap: 6,
  },
  recoveryMediaWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  recoveryMedia: {
    width: '100%',
    height: '100%',
  },
  todayBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  todayBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.8,
  },
  recoveryPhotoTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.2,
  },
  recoveryPhotoMeta: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    marginTop: 0,
  },
  foodSection: { marginBottom: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 20,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  modalIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  modalTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  modalBody: {
    fontSize: 14,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  modalPrimary: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalPrimaryText: { color: '#fff', fontSize: 16, fontFamily: 'Manrope_700Bold' },
  modalCancel: { paddingVertical: 8 },
  modalCancelText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  foodHeader: { paddingHorizontal: 22, marginBottom: 14 },
  foodTitle: {
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    letterSpacing: -0.3,
  },
  foodOptionsRow: { flexDirection: 'row', paddingHorizontal: 22, gap: 12 },
  foodOptionCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 6,
  },
  foodOptionCardWide: { flex: 1 },
  foodOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  foodOptionLabel: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  foodOptionMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  programMedia: { width: '100%', height: '100%' },
  programMediaFallback: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselMedia: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    borderRadius: 0,
  },
  carouselMediaFill: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cycleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cycleIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  cycleText: { flex: 1, gap: 3 },
  cyclePhase: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold', letterSpacing: 0.1 },
  cycleInsight: { fontSize: 12.5, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  doneCard: { borderRadius: 18, borderWidth: 1, padding: 18, alignItems: 'center', gap: 8, marginBottom: 14 },
  doneIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  doneTitle: { fontSize: 17, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  doneText: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 20, textAlign: 'center' },
  restartBtn: {
    marginTop: 6,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  restartBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  congratsScreen: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  congratsKicker: {
    fontSize: 12,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 1.4,
    marginBottom: 8,
  },
  congratsIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  congratsTitle: {
    fontSize: 34,
    fontFamily: 'Manrope_800ExtraBold',
    textAlign: 'center',
    letterSpacing: -0.8,
    lineHeight: 40,
  },
  congratsLead: {
    fontSize: 18,
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    marginTop: 4,
  },
  congratsBody: {
    fontSize: 15,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  congratsStats: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    marginVertical: 8,
  },
  congratsStat: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
  },
  congratsStatValue: {
    fontSize: 18,
    fontFamily: 'Manrope_800ExtraBold',
  },
  congratsStatLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  congratsBtn: {
    marginTop: 12,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'stretch',
  },
  congratsBtnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Manrope_700Bold' },
  aiCoachCard: { borderRadius: 20, padding: 20, marginTop: 4 },
  aiCoachContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aiCoachLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Manrope_600SemiBold', marginBottom: 4, letterSpacing: 0.5 },
  aiCoachTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  aiCoachSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  aiCoachBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
});
