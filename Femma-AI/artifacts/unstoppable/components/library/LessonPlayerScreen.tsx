import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { libraryPath, resolveCategoryId, type LibraryCategoryId } from '@/lib/catalog';
import { useCatalogLesson } from '@/hooks/useCatalog';
import { useColors } from '@/hooks/useColors';

type Props = { categoryId: LibraryCategoryId; lessonId: string };

const AUTO_COMPLETE_AT = 90;

function UploadedVideo({
  url,
  resumePercent = 0,
  onWatchProgress,
}: {
  url: string;
  resumePercent?: number;
  onWatchProgress: (percent: number) => void;
}) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
    instance.timeUpdateEventInterval = 0.5;
  });
  const resumeTargetRef = useRef(resumePercent);
  const resumeAppliedRef = useRef(false);

  useEffect(() => {
    resumeAppliedRef.current = false;
    resumeTargetRef.current = resumePercent;
  }, [url]);

  // Allow async-loaded saved progress to update the seek target until applied once.
  useEffect(() => {
    if (!resumeAppliedRef.current) {
      resumeTargetRef.current = resumePercent;
    }
  }, [resumePercent]);

  const applyResumeIfNeeded = () => {
    const target = resumeTargetRef.current;
    if (resumeAppliedRef.current) return false;
    if (target <= 0 || target >= 100) {
      resumeAppliedRef.current = true;
      return false;
    }
    const duration = player.duration || 0;
    if (duration <= 0) return false;
    resumeAppliedRef.current = true;
    player.currentTime = (target / 100) * duration;
    onWatchProgress(target);
    return true;
  };

  useEventListener(player, 'statusChange', ({ status }) => {
    if (status === 'readyToPlay') applyResumeIfNeeded();
  });

  useEventListener(player, 'timeUpdate', ({ currentTime }) => {
    const duration = player.duration || 0;
    if (duration <= 0) return;
    if (applyResumeIfNeeded()) return;
    const percent = Math.min(100, Math.round((currentTime / duration) * 100));
    onWatchProgress(percent);
  });

  useEventListener(player, 'playToEnd', () => {
    onWatchProgress(100);
  });

  return (
    <VideoView
      key={url}
      player={player}
      style={styles.video}
      contentFit="contain"
      nativeControls
      fullscreenOptions={{ enable: true }}
      allowsPictureInPicture
    />
  );
}

export default function LessonPlayerScreen({ categoryId, lessonId }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    completedLessonIds,
    lessonWatchProgress,
    setLessonComplete,
    setLessonWatchProgress,
    setLastViewedLesson,
    completeMission,
  } = useApp();
  const resolvedCategoryId = resolveCategoryId(categoryId);
  const { context, isLoading, error, refetch } = useCatalogLesson(lessonId);
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const savedWatch = lessonWatchProgress[lessonId] ?? 0;
  const [watchPercent, setWatchPercent] = useState(() =>
    completedLessonIds.includes(lessonId) ? 100 : savedWatch
  );
  const autoCompletedRef = useRef(false);
  const activeLessonRef = useRef(lessonId);

  useEffect(() => {
    const complete = completedLessonIds.includes(lessonId);
    const target = complete ? 100 : savedWatch;
    const switchedLesson = activeLessonRef.current !== lessonId;
    activeLessonRef.current = lessonId;
    setWatchPercent((prev) => (switchedLesson ? target : Math.max(prev, target)));
    autoCompletedRef.current = complete || savedWatch >= AUTO_COMPLETE_AT;
  }, [lessonId, savedWatch, completedLessonIds]);

  useEffect(() => {
    if (context?.lesson.id) setLastViewedLesson(context.lesson.id);
  }, [context?.lesson.id]);

  const handleWatchProgress = useCallback(
    (percent: number) => {
      setWatchPercent((prev) => (percent > prev ? percent : prev));
      if (!context?.lesson.id) return;
      setLessonWatchProgress(context.lesson.id, percent);
      if (percent < AUTO_COMPLETE_AT || autoCompletedRef.current) return;
      if (completedLessonIds.includes(context.lesson.id)) {
        autoCompletedRef.current = true;
        return;
      }
      autoCompletedRef.current = true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
      setLessonComplete(context.lesson.id, true);
      if (!completeMission(context.lesson.id) && !completeMission(context.course.id)) {
        completeMission(resolvedCategoryId);
      }
    },
    [completedLessonIds, context?.lesson.id, resolvedCategoryId, completeMission, setLessonComplete, setLessonWatchProgress]
  );

  if (isLoading) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.missingTitle, { color: colors.foreground }]}>Loading lesson…</Text>
      </View>
    );
  }

  if (error || !context || context.category.id !== resolvedCategoryId) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="video-off" size={34} color={colors.mutedForeground} />
        <Text style={[styles.missingTitle, { color: colors.foreground }]}>Lesson not found</Text>
        <TouchableOpacity onPress={() => (error ? refetch() : router.back())} style={[styles.missingButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.actionText}>{error ? 'Retry' : 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { course, lesson, nextLesson } = context;
  const isComplete = completedLessonIds.includes(lesson.id);
  const hasVideo = Boolean(lesson.videoUrl);

  const openLesson = (nextId: string) => {
    router.replace(libraryPath(resolvedCategoryId, undefined, nextId) as never);
  };

  const toggleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    const nextComplete = !isComplete;
    setLessonComplete(lesson.id, nextComplete);
    if (nextComplete) {
      if (!completeMission(lesson.id) && !completeMission(course.id)) {
        completeMission(resolvedCategoryId);
      }
    }
  };

  const goHome = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 28, flexGrow: 1 }}
      >
        <View style={[styles.darkHeader, { paddingTop: topPad }]}>
          <View style={styles.navRow}>
            <TouchableOpacity accessibilityLabel="Go back" onPress={goHome} style={styles.darkButton}>
              <Feather name="arrow-left" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <Text numberOfLines={1} style={styles.navTitle}>
              {lesson.title}
            </Text>
            <View style={styles.darkButton} />
          </View>

          <View style={styles.videoFrame}>
            {hasVideo ? (
              <UploadedVideo
                url={lesson.videoUrl!}
                resumePercent={isComplete ? 0 : savedWatch}
                onWatchProgress={handleWatchProgress}
              />
            ) : (
              <LinearGradient colors={['#232631', '#121319']} style={styles.placeholder}>
                <View style={[styles.placeholderIcon, { backgroundColor: `${course.color}25`, borderColor: `${course.color}55` }]}>
                  <Feather name="upload-cloud" size={32} color={course.color} />
                </View>
                <Text style={styles.placeholderTitle}>Video not uploaded yet</Text>
                <Text style={styles.placeholderText}>This lesson will play here once the video is added.</Text>
              </LinearGradient>
            )}
          </View>

          <View style={styles.videoControlsHint}>
            <Text style={styles.videoCount}>
              {lesson.durationMinutes} min
            </Text>
            {hasVideo ? (
              <Text style={[styles.watchProgressValue, { color: course.color }]}>{watchPercent}% watched</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.body}>
          <Text style={[styles.lessonTitle, { color: colors.foreground }]}>{lesson.title}</Text>
          {lesson.description ? (
            <Text style={[styles.lessonDescription, { color: colors.mutedForeground }]}>{lesson.description}</Text>
          ) : null}

          {isComplete ? (
            <View style={[styles.doneBanner, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.doneDot, { backgroundColor: course.color }]}>
                <Feather name="check" size={14} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.completeTitle, { color: colors.foreground }]}>Completed</Text>
                <Text style={[styles.completeText, { color: colors.mutedForeground }]}>Saved to your progress</Text>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={toggleComplete}
              style={[styles.markDoneBtn, { backgroundColor: course.color }]}
            >
              <Feather name="check" size={16} color="#FFFFFF" />
              <Text style={styles.actionText}>Mark as done</Text>
            </TouchableOpacity>
          )}

          {nextLesson ? (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => openLesson(nextLesson.id)}
              style={[styles.nextButton, { backgroundColor: course.color }]}
            >
              <Text style={styles.actionText}>Next video</Text>
              <Feather name="arrow-right" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  missingTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  missingButton: { borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12 },
  darkHeader: { backgroundColor: '#111219', paddingHorizontal: 16, paddingBottom: 13 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  darkButton: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  navTitle: {
    flex: 1,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginHorizontal: 12,
    fontSize: 13,
    fontFamily: 'Manrope_700Bold',
  },
  videoFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden', backgroundColor: '#090A0D' },
  video: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  placeholderIcon: { width: 66, height: 66, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginTop: 12 },
  placeholderText: {
    color: 'rgba(255,255,255,0.52)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: 'Manrope_500Medium',
    maxWidth: 260,
    marginTop: 6,
  },
  watchProgressValue: { fontSize: 12, fontFamily: 'Manrope_800ExtraBold' },
  videoControlsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingHorizontal: 2,
  },
  videoCount: { color: 'rgba(255,255,255,0.58)', fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  body: { padding: 20, gap: 13 },
  lessonTitle: { fontSize: 22, lineHeight: 29, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.35 },
  lessonDescription: { fontSize: 14, lineHeight: 21, fontFamily: 'Manrope_500Medium' },
  markDoneBtn: {
    height: 52,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  doneBanner: {
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  doneDot: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  completeTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  completeText: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  nextButton: { height: 52, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
