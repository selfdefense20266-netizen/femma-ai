import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { ANIMATION_STEPS } from '@/lib/exerciseRoadmapData';
import { lookupExerciseGif } from '@/lib/exerciseDb';

function first(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value || '';
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function ExerciseMotion({ kind, color }: { kind: string; color: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);

  const style = useAnimatedStyle(() => {
    const v = t.value;
    if (kind === 'punch' || kind === 'guard') {
      return { transform: [{ translateX: 8 + v * 26 }, { rotate: `${-8 + v * 16}deg` }] };
    }
    if (kind === 'kick') {
      return { transform: [{ rotate: `${-18 + v * 42}deg` }, { translateY: v * -12 }] };
    }
    if (kind === 'squat' || kind === 'lunge') {
      return { transform: [{ translateY: v * 22 }, { scaleY: 1 - v * 0.12 }] };
    }
    if (kind === 'plank' || kind === 'core') {
      return { transform: [{ scale: 0.92 + v * 0.12 }] };
    }
    if (kind === 'jump') {
      return { transform: [{ translateY: v * -28 }, { scale: 1 + v * 0.06 }] };
    }
    if (kind === 'walk') {
      return { transform: [{ translateX: -16 + v * 32 }, { rotate: `${-6 + v * 12}deg` }] };
    }
    if (kind === 'hip' || kind === 'flow') {
      return { transform: [{ rotate: `${-14 + v * 28}deg` }, { scale: 0.96 + v * 0.08 }] };
    }
    if (kind === 'stretch' || kind === 'prenatal' || kind === 'recover') {
      return { transform: [{ scaleX: 0.9 + v * 0.18 }, { translateY: v * 8 }] };
    }
    return { transform: [{ scale: 0.88 + v * 0.16 }] };
  });

  const icon =
    kind === 'punch' || kind === 'guard'
      ? 'target'
      : kind === 'kick'
        ? 'activity'
        : kind === 'breath'
          ? 'wind'
          : kind === 'walk' || kind === 'jump'
            ? 'navigation'
            : kind === 'stretch' || kind === 'flow'
              ? 'sun'
              : 'zap';

  return (
    <View style={styles.stage}>
      <View style={[styles.floor, { backgroundColor: color + '22' }]} />
      <Animated.View style={[styles.figure, { backgroundColor: color + '24', borderColor: color }, style]}>
        <Feather name={icon as never} size={36} color={color} />
      </Animated.View>
    </View>
  );
}

export default function ExerciseGuideScreen() {
  const params = useLocalSearchParams<{
    title?: string | string[];
    animation?: string | string[];
    cue?: string | string[];
    duration?: string | string[];
    steps?: string | string[];
    missionId?: string | string[];
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
  };
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completeMission } = useApp();
  const title = first(params.title) || 'Exercise guide';
  const animation = first(params.animation) || 'flow';
  const cue = first(params.cue);
  const durationMin = Math.max(1, Number(first(params.duration) || 15) || 15);
  const missionId = first(params.missionId);
  const steps = (first(params.steps) ? first(params.steps).split('|') : ANIMATION_STEPS[animation] || ANIMATION_STEPS.flow).filter(Boolean);
  const totalSeconds = durationMin * 60;

  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [gifUrls, setGifUrls] = useState<string[]>([]);
  const [gifIndex, setGifIndex] = useState(0);
  const [gifLocal, setGifLocal] = useState<number | undefined>();
  const [gifName, setGifName] = useState('');
  const [gifReady, setGifReady] = useState(false);
  const [gifFailed, setGifFailed] = useState(false);
  const finishingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    setGifUrls([]);
    setGifIndex(0);
    setGifLocal(undefined);
    setGifName('');
    setGifReady(false);
    setGifFailed(false);
    void lookupExerciseGif(title, animation).then((match) => {
      if (cancelled) return;
      if (match?.local || match?.urls.length) {
        setGifLocal(match.local);
        setGifUrls(match.urls);
        setGifName(match.name);
      } else setGifFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [title, animation]);

  const gifUrl = !gifFailed ? gifUrls[gifIndex] : undefined;
  const gifSource = gifUrl ? { uri: gifUrl } : gifLocal;
  const showGif = Boolean(gifSource);

  useEffect(() => {
    if (!running || done) return;
    const tick = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);
    return () => clearInterval(tick);
  }, [running, done]);

  const finish = (fromTimer = false) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setRunning(false);
    setDone(true);
    if (fromTimer) setRemaining(0);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    if (missionId) completeMission(missionId);
  };

  useEffect(() => {
    if (running && remaining <= 0 && !done) finish(true);
  }, [remaining, running, done]);

  const elapsed = totalSeconds - remaining;
  const progress = Math.min(1, elapsed / totalSeconds);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 36, flexGrow: 1 }}
      >
        <LinearGradient colors={[colors.softLavender, colors.background]} style={[styles.hero, { paddingTop: insets.top + 8 }]}>
          <View style={styles.heroHeader}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
              <Feather name="arrow-left" size={22} color={colors.foreground} />
            </TouchableOpacity>
            <Text style={[styles.kicker, { color: colors.primary }]}>WORKOUT</Text>
            <View style={{ width: 22 }} />
          </View>
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{durationMin} min session</Text>
          {showGif ? (
            <View style={styles.gifWrap}>
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
                  if (gifUrls.length) {
                    setGifUrls([]);
                    if (gifLocal) return;
                  }
                  setGifFailed(true);
                }}
              />
              {!gifReady ? (
                <View style={styles.gifLoading}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : null}
              <Text style={[styles.gifCredit, { color: colors.mutedForeground }]}>
                {gifName ? gifName : 'Exercise demo'}
              </Text>
            </View>
          ) : (
            <ExerciseMotion kind={animation} color={colors.primary} />
          )}
        </LinearGradient>

        <View style={styles.body}>
          <View style={[styles.timerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.timerLabel, { color: colors.mutedForeground }]}>
              {done ? 'Session complete' : running ? 'Time remaining' : remaining < totalSeconds ? 'On a break' : 'Ready when you are'}
            </Text>
            <Text style={[styles.timerValue, { color: colors.foreground }]}>{formatClock(remaining)}</Text>
            <View style={[styles.timerTrack, { backgroundColor: colors.muted }]}>
              <View style={[styles.timerFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: colors.primary }]} />
            </View>
            {!done ? (
              <View style={styles.timerActions}>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setRunning((value) => !value)}
                  activeOpacity={0.88}
                >
                  <Feather name={running ? 'pause' : 'play'} size={16} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>{running ? 'Take a break' : remaining < totalSeconds ? 'Resume' : 'Start timer'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => finish(false)}
                  activeOpacity={0.88}
                >
                  <Feather name="check" size={16} color={colors.foreground} />
                  <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Mark as done</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.timerActions}>
                <Text style={[styles.doneHint, { color: colors.mutedForeground }]}>Nice work. This exercise is marked done.</Text>
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

          {cue ? (
            <View style={[styles.cueCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.cueLabel, { color: colors.primary }]}>COACH CUE</Text>
              <Text style={[styles.cueText, { color: colors.foreground }]}>{cue}</Text>
            </View>
          ) : null}

          <Text style={[styles.section, { color: colors.foreground }]}>Do it like this</Text>
          {steps.map((step, index) => (
            <View key={`${index}-${step}`} style={[styles.stepRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.stepNum, { backgroundColor: colors.primary + '18' }]}>
                <Text style={[styles.stepNumText, { color: colors.primary }]}>{index + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: colors.foreground }]}>{step}</Text>
            </View>
          ))}
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
  gif: { width: '100%', height: 248 },
  gifLoading: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  gifCredit: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize', marginBottom: 8 },
  stage: { height: 180, alignItems: 'center', justifyContent: 'flex-end', marginBottom: 12 },
  floor: { position: 'absolute', bottom: 18, width: 160, height: 18, borderRadius: 100 },
  figure: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
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
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  secondaryBtn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
