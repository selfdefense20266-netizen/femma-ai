import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { ANIMATION_STEPS } from '@/lib/exerciseRoadmapData';
import { lookupExerciseGif } from '@/lib/exerciseDb';
import { defaultMediaForDailyItem, isVideoMediaUrl } from '@/lib/dailyPlanMedia';
import type { DailyPlanItemType } from '@/lib/dailyPlans';
import { durationLabel, durationPhrase, setCoachMuted, speakCoach, stopSpeaking, subscribeCoachMute } from '@/lib/coachSpeech';

export type DayTaskNav = {
  id: string;
  title: string;
  duration: number;
  restMinutes: number;
  mediaUrl: string;
  cue: string;
  steps: string;
  category: string;
};

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || '';
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseDayTasks(raw: string): DayTaskNav[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => ({
        id: String(row?.id || ''),
        title: String(row?.title || ''),
        duration: Math.max(1, Number(row?.duration) || 10),
        restMinutes: Math.max(0, Number(row?.restMinutes) || 0),
        mediaUrl: String(row?.mediaUrl || ''),
        cue: String(row?.cue || ''),
        steps: String(row?.steps || ''),
        category: String(row?.category || 'fitness'),
      }))
      .filter((row) => row.id && row.title);
  } catch {
    return [];
  }
}

/** Admin exercise demo video: muted, autoplay, loop. */
function LoopingExerciseVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = true;
    instance.muted = true;
    instance.play();
  });

  useEffect(() => {
    player.loop = true;
    player.muted = true;
    try {
      player.play();
    } catch {
      // ignore — player may still be loading
    }
  }, [player, url]);

  return (
    <VideoView
      key={url}
      player={player}
      style={styles.gif}
      contentFit="contain"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}

function openExercise(task: DayTaskNav, dayTasksJson: string, dayTaskIds: string) {
  router.replace({
    pathname: '/exercise-guide',
    params: {
      title: task.title,
      animation: 'flow',
      cue: task.cue || '',
      duration: String(task.duration || 10),
      steps: task.steps || '',
      missionId: task.id,
      category: task.category || 'fitness',
      mediaUrl: task.mediaUrl || '',
      restMinutes: String(task.restMinutes || 0),
      dayTasks: dayTasksJson,
      dayTaskIds,
    },
  } as never);
}

export default function ExerciseGuideScreen() {
  const params = useLocalSearchParams<{
    title?: string | string[];
    animation?: string | string[];
    cue?: string | string[];
    duration?: string | string[];
    steps?: string | string[];
    missionId?: string | string[];
    category?: string | string[];
    mediaUrl?: string | string[];
    dayTaskIds?: string | string[];
    dayTasks?: string | string[];
    restMinutes?: string | string[];
  }>();
  const title = first(params.title) || 'Exercise guide';
  const missionId = first(params.missionId);
  return <ExerciseGuideBody key={`${missionId}|${title}`} params={params} />;
}

function ExerciseGuideBody({
  params,
}: {
  params: {
    title?: string | string[];
    animation?: string | string[];
    cue?: string | string[];
    duration?: string | string[];
    steps?: string | string[];
    missionId?: string | string[];
    category?: string | string[];
    mediaUrl?: string | string[];
    dayTaskIds?: string | string[];
    dayTasks?: string | string[];
    restMinutes?: string | string[];
  };
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeMission } = useApp();
  const title = first(params.title) || 'Exercise guide';
  const animation = first(params.animation) || 'flow';
  const cue = first(params.cue);
  const durationSec = Math.max(1, Number(first(params.duration) || 60) || 60);
  const restSeconds = Math.max(0, Number(first(params.restMinutes) || 0) || 0);
  const missionId = first(params.missionId);
  const category = first(params.category).toLowerCase();
  const adminMediaUrl = first(params.mediaUrl).trim();
  const dayTasksJson = first(params.dayTasks);
  const dayTasks = useMemo(() => parseDayTasks(dayTasksJson), [dayTasksJson]);
  const dayTaskIds = first(params.dayTaskIds)
    .split('|')
    .map((id) => id.trim())
    .filter(Boolean);
  const stepsParam = first(params.steps);
  const steps = (stepsParam ? stepsParam.split('|') : ANIMATION_STEPS[animation] || ANIMATION_STEPS.flow).filter(Boolean);
  const totalSeconds = durationSec;
  const restTotalSeconds = Math.max(0, restSeconds);

  const currentIndex = dayTasks.findIndex((task) => task.id === missionId);
  const nextTask = currentIndex >= 0 ? dayTasks[currentIndex + 1] : undefined;

  const [phase, setPhase] = useState<'workout' | 'rest' | 'done'>('workout');
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(false);
  const [gifUrls, setGifUrls] = useState<string[]>([]);
  const [gifIndex, setGifIndex] = useState(0);
  const [gifLocal, setGifLocal] = useState<number | undefined>();
  const [gifName, setGifName] = useState('');
  const [gifReady, setGifReady] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const [gifMissing, setGifMissing] = useState(false);
  const finishingRef = useRef(false);
  const spokenIntroRef = useRef(false);

  useEffect(() => {
    return subscribeCoachMute(setMuted);
  }, []);

  useEffect(() => {
    return () => stopSpeaking();
  }, []);

  useEffect(() => {
    if (spokenIntroRef.current) return;
    spokenIntroRef.current = true;
    speakCoach(`${title}. ${durationPhrase(durationSec)}.`);
  }, [title, durationSec]);

  useEffect(() => {
    let cancelled = false;
    setGifUrls([]);
    setGifIndex(0);
    setGifLocal(undefined);
    setGifName('');
    setGifReady(false);
    setGifFailed(false);
    setGifMissing(false);

    if (adminMediaUrl) {
      setGifUrls([adminMediaUrl]);
      setGifName(title);
      if (isVideoMediaUrl(adminMediaUrl)) setGifReady(true);
      return () => {
        cancelled = true;
      };
    }

    const itemType: DailyPlanItemType =
      category === 'yoga' || category === 'recovery' || category === 'rest'
        ? category === 'rest'
          ? 'rest'
          : 'recovery'
        : category === 'recipe' || category === 'food'
          ? 'food'
          : 'exercise';
    const fallback = defaultMediaForDailyItem({
      id: missionId || 'guide',
      planId: '',
      dayNumber: 1,
      intensityLevel: 'beginner',
      recoveryType: '',
      itemType,
      title,
      tag: '',
      subtitle: '',
      scheduledTime: '',
      durationMinutes: durationSec,
      restMinutes: 0,
      mediaUrl: null,
      cue: cue || '',
      steps,
      sortOrder: 0,
    });
    if (typeof fallback === 'number') {
      setGifLocal(fallback);
      setGifName(title);
      return () => {
        cancelled = true;
      };
    }
    if (typeof fallback === 'string' && fallback.trim()) {
      setGifUrls([fallback.trim()]);
      setGifName(title);
      return () => {
        cancelled = true;
      };
    }

    void lookupExerciseGif(title, animation).then((match) => {
      if (cancelled) return;
      if (match?.missing) {
        setGifMissing(true);
        setGifName(match.name || title);
        return;
      }
      if (match?.urls.length || match?.local) {
        setGifUrls(match.urls);
        setGifLocal(match.urls.length ? undefined : match.local);
        setGifName(match.name);
      } else {
        setGifMissing(true);
        setGifFailed(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [title, animation, adminMediaUrl, category, missionId, durationSec, cue, stepsParam]);

  const gifUrl = !gifFailed && !gifMissing ? gifUrls[gifIndex] : undefined;
  const isAdminVideo = Boolean(gifUrl && isVideoMediaUrl(gifUrl));
  const gifSource = !isAdminVideo && gifUrl ? { uri: gifUrl } : gifLocal != null ? gifLocal : undefined;
  const showMedia = Boolean(isAdminVideo || gifSource);

  useEffect(() => {
    if (!gifUrl || gifReady || isAdminVideo) return;
    const timer = setTimeout(() => {
      setGifReady((ready) => {
        if (ready) return ready;
        if (gifIndex + 1 < gifUrls.length) {
          setGifIndex((value) => value + 1);
        } else {
          setGifMissing(true);
          setGifFailed(true);
        }
        return ready;
      });
    }, 9000);
    return () => clearTimeout(timer);
  }, [gifUrl, gifIndex, gifUrls.length, gifReady, isAdminVideo]);

  useEffect(() => {
    if (isAdminVideo) setGifReady(true);
  }, [isAdminVideo, gifUrl]);

  useEffect(() => {
    if (!running) return;
    const tick = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [running, phase]);

  const goToNextExercise = useCallback(() => {
    if (!nextTask) {
      setPhase('done');
      setRunning(false);
      speakCoach('Workout complete. Great job.');
      return;
    }
    const ids = dayTaskIds.length ? dayTaskIds.join('|') : dayTasks.map((task) => task.id).join('|');
    openExercise(nextTask, dayTasksJson || JSON.stringify(dayTasks), ids);
  }, [nextTask, dayTaskIds, dayTasks, dayTasksJson]);

  const beginRest = useCallback(() => {
    if (restTotalSeconds <= 0) {
      goToNextExercise();
      return;
    }
    setPhase('rest');
    setRemaining(restTotalSeconds);
    setRunning(true);
    const nextLine = nextTask
      ? ` Then ${nextTask.title}.`
      : ' Then you are done for today.';
    speakCoach(`Rest time. ${durationPhrase(restSeconds)}.${nextLine}`);
  }, [restTotalSeconds, restSeconds, nextTask, goToNextExercise]);

  const finishWorkout = useCallback(
    (fromTimer = false) => {
      if (finishingRef.current || phase !== 'workout') return;
      finishingRef.current = true;
      setRunning(false);
      if (fromTimer) setRemaining(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      if (missionId) completeMission(missionId, dayTaskIds.length ? { dayTaskIds } : undefined);
      beginRest();
    },
    [phase, missionId, dayTaskIds, completeMission, beginRest]
  );

  useEffect(() => {
    if (!running || remaining > 0) return;
    if (phase === 'workout') {
      finishWorkout(true);
      return;
    }
    if (phase === 'rest') {
      setRunning(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      goToNextExercise();
    }
  }, [remaining, running, phase, finishWorkout, goToNextExercise]);

  const phaseTotal = phase === 'rest' ? restTotalSeconds : totalSeconds;
  const elapsed = phaseTotal - remaining;
  const progress = phaseTotal > 0 ? Math.min(1, elapsed / phaseTotal) : 1;
  const isRest = phase === 'rest';
  const isDone = phase === 'done';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, flexGrow: 1 }}
      >
        <LinearGradient colors={[colors.softLavender, colors.background]} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroHeader}>
            <TouchableOpacity
              onPress={() => {
                stopSpeaking();
                router.back();
              }}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.kicker, { color: colors.primary }]}>{isRest ? 'REST' : 'WORKOUT'}</Text>
            <TouchableOpacity
              onPress={() => {
                void setCoachMuted(!muted);
              }}
              hitSlop={12}
              style={[styles.muteBtn, { backgroundColor: muted ? colors.primary + '22' : colors.muted }]}
            >
              <Feather name={muted ? 'volume-x' : 'volume-2'} size={18} color={muted ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{isRest ? 'Rest time' : title}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            {isRest
              ? `${durationLabel(restSeconds)} rest${nextTask ? ` · next: ${nextTask.title}` : ''}`
              : `${durationLabel(durationSec)} session`}
          </Text>
          {!isRest && showMedia ? (
            <View style={styles.gifWrap}>
              {isAdminVideo && gifUrl ? (
                <LoopingExerciseVideo url={gifUrl} />
              ) : (
                <Image
                  key={`${title}|${gifName}|${gifUrl || gifLocal || ''}`}
                  recyclingKey={`${title}|${gifName}`}
                  source={gifSource as never}
                  style={styles.gif}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                  onLoad={() => setGifReady(true)}
                  onError={() => {
                    if (gifIndex + 1 < gifUrls.length) {
                      setGifIndex((value) => value + 1);
                      return;
                    }
                    setGifMissing(true);
                    setGifFailed(true);
                  }}
                />
              )}
              {!gifReady ? (
                <View style={styles.gifLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
              <Text style={[styles.gifCredit, { color: colors.mutedForeground }]}>
                {gifName ? gifName : 'Exercise demo'}
              </Text>
            </View>
          ) : null}
          {isRest ? (
            <View style={[styles.gifWrap, styles.restWrap, { borderColor: colors.mint + '55', backgroundColor: colors.mint + '18' }]}>
              <Feather name="moon" size={42} color={colors.mint} />
              <Text style={[styles.missingTitle, { color: colors.foreground }]}>Breathe & recover</Text>
              <Text style={[styles.missingHint, { color: colors.mutedForeground }]}>
                {nextTask ? `Up next: ${nextTask.title}` : 'Last exercise — almost done'}
              </Text>
            </View>
          ) : null}
          {!isRest && !showMedia ? (
            <View style={[styles.gifWrap, styles.missingWrap]}>
              <Feather name="image" size={36} color={colors.mutedForeground} />
              <Text style={[styles.missingTitle, { color: colors.foreground }]}>No media available</Text>
              <Text style={[styles.missingHint, { color: colors.mutedForeground }]}>
                Upload a video or GIF in Admin Daily Plans for this move
              </Text>
            </View>
          ) : null}
        </LinearGradient>

        <View style={styles.body}>
          <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
              {isDone
                ? 'Session complete'
                : isRest
                  ? running
                    ? 'Rest remaining'
                    : 'Rest'
                  : running
                    ? 'Time remaining'
                    : remaining < totalSeconds
                      ? 'Paused'
                      : 'Ready when you are'}
            </Text>
            <Text style={[styles.timerValue, { color: colors.foreground }]}>{formatClock(remaining)}</Text>
            <View style={[styles.timerTrack, { backgroundColor: colors.muted }]}>
              <View
                style={[
                  styles.timerFill,
                  { width: `${Math.round(progress * 100)}%`, backgroundColor: isRest ? colors.mint : colors.primary },
                ]}
              />
            </View>
            {!isDone ? (
              <View style={styles.timerActions}>
                {phase === 'workout' ? (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                      onPress={() => {
                        setRunning((value) => {
                          const next = !value;
                          if (next && remaining === totalSeconds) {
                            speakCoach(`${title}. ${durationPhrase(durationSec)}. Let's go.`);
                          }
                          return next;
                        });
                      }}
                      activeOpacity={0.88}
                    >
                      <Feather name={running ? 'pause' : 'play'} size={16} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>
                        {running ? 'Pause' : remaining < totalSeconds ? 'Resume' : 'Start timer'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={() => finishWorkout(false)}
                      activeOpacity={0.88}
                    >
                      <Feather name="check" size={16} color={colors.foreground} />
                      <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Mark as done</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={[styles.primaryBtn, { backgroundColor: colors.mint }]}
                      onPress={() => setRunning((value) => !value)}
                      activeOpacity={0.88}
                    >
                      <Feather name={running ? 'pause' : 'play'} size={16} color="#FFFFFF" />
                      <Text style={styles.primaryBtnText}>{running ? 'Pause rest' : 'Resume rest'}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                      onPress={() => {
                        setRunning(false);
                        goToNextExercise();
                      }}
                      activeOpacity={0.88}
                    >
                      <Feather name="skip-forward" size={16} color={colors.foreground} />
                      <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                        {nextTask ? 'Skip to next' : 'Finish'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : (
              <View style={styles.timerActions}>
                <Text style={[styles.doneHint, { color: colors.mutedForeground }]}>Nice work. Today’s exercises are done.</Text>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => router.back()}
                  activeOpacity={0.88}
                >
                  <Text style={styles.primaryBtnText}>Back to Today</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {!isRest && cue ? (
            <View style={[styles.cueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cueLabel, { color: colors.primary }]}>COACH CUE</Text>
              <Text style={[styles.cueText, { color: colors.foreground }]}>{cue}</Text>
            </View>
          ) : null}

          {!isRest ? (
            <>
              <Text style={[styles.section, { color: colors.foreground }]}>Do it like this</Text>
              {steps.map((step, index) => (
                <View key={`${index}-${step}`} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.stepNum, { backgroundColor: colors.primary + '18' }]}>
                    <Text style={[styles.stepNumText, { color: colors.primary }]}>{index + 1}</Text>
                  </View>
                  <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
                </View>
              ))}
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 8 },
  heroHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  muteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 1 },
  title: { fontSize: 24, fontFamily: 'Manrope_800ExtraBold', lineHeight: 30, marginBottom: 6 },
  meta: { fontSize: 13, fontFamily: 'Manrope_400Regular', marginBottom: 16 },
  gifWrap: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restWrap: { borderWidth: 1, gap: 10, paddingHorizontal: 24 },
  gif: { width: '100%', height: 248 },
  gifLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gifCredit: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize', marginBottom: 8 },
  missingWrap: { gap: 8, paddingHorizontal: 24 },
  missingTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold', textAlign: 'center' },
  missingHint: { fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 18, marginBottom: 8 },
  body: { paddingHorizontal: 20, paddingTop: 8 },
  timerCard: { borderWidth: 1, borderRadius: 20, padding: 18, marginBottom: 18, alignItems: 'center' },
  timerLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.4, marginBottom: 8 },
  timerValue: { fontSize: 48, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -1, lineHeight: 56 },
  timerTrack: { width: '100%', height: 6, borderRadius: 100, overflow: 'hidden', marginTop: 12, marginBottom: 16 },
  timerFill: { height: 6, borderRadius: 100 },
  timerActions: { width: '100%', gap: 10 },
  doneHint: { fontSize: 13, fontFamily: 'Manrope_500Medium', textAlign: 'center', marginBottom: 4 },
  cueCard: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 18 },
  cueLabel: { fontSize: 11, fontFamily: 'Manrope_700Bold', letterSpacing: 0.8, marginBottom: 6 },
  cueText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', lineHeight: 22 },
  section: { fontSize: 18, fontFamily: 'Manrope_700Bold', marginBottom: 12 },
  stepRow: { flexDirection: 'row', gap: 12, borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontSize: 13, fontFamily: 'Manrope_700Bold' },
  stepText: { flex: 1, fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, paddingTop: 4 },
  primaryBtn: {
    height: 52,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  secondaryBtn: {
    height: 52,
    borderRadius: 100,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
