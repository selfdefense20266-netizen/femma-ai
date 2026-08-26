import React, { useEffect } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { getCourseLessons, libraryPath, resolveCategoryId, type LibraryCategoryId } from '@/lib/catalog';
import { useCatalogLesson } from '@/hooks/useCatalog';
import { useColors } from '@/hooks/useColors';

type Props = { categoryId: LibraryCategoryId; lessonId: string };

function UploadedVideo({ url }: { url: string }) {
  const player = useVideoPlayer(url, (instance) => {
    instance.loop = false;
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
    setLessonComplete,
    setLastViewedLesson,
    savedCourseIds,
    toggleSavedCourse,
  } = useApp();
  const resolvedCategoryId = resolveCategoryId(categoryId);
  const { context, isLoading, error, refetch } = useCatalogLesson(lessonId);
  const topPad = Platform.OS === 'web' ? 58 : insets.top + 8;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  useEffect(() => {
    if (context?.lesson.id) setLastViewedLesson(context.lesson.id);
  }, [context?.lesson.id]);

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

  const { category, course, module, lesson, previousLesson, nextLesson, lessonNumber, lessonCount } = context;
  const isComplete = completedLessonIds.includes(lesson.id);
  const isSaved = savedCourseIds.includes(course.id);
  const courseLessons = getCourseLessons(course);
  const courseCompleted = courseLessons.filter((item) => completedLessonIds.includes(item.id)).length;
  const progress = Math.round((courseCompleted / courseLessons.length) * 100);

  const openLesson = (nextId: string) => {
    router.replace(libraryPath(resolvedCategoryId, undefined, nextId) as never);
  };

  const toggleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    setLessonComplete(lesson.id, !isComplete);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 102 }}>
        <View style={[styles.darkHeader, { paddingTop: topPad }]}> 
          <View style={styles.navRow}>
            <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={styles.darkButton}>
              <Feather name="arrow-left" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <Text numberOfLines={1} style={styles.navTitle}>{course.shortTitle}</Text>
            <TouchableOpacity
              accessibilityLabel={isSaved ? 'Remove saved course' : 'Save course'}
              onPress={() => toggleSavedCourse(course.id)}
              style={[styles.darkButton, isSaved && { backgroundColor: `${course.color}45` }]}
            >
              <Feather name="bookmark" size={19} color={isSaved ? course.color : '#FFFFFF'} />
            </TouchableOpacity>
          </View>

          <View style={styles.videoFrame}>
            {lesson.videoUrl ? (
              <UploadedVideo url={lesson.videoUrl} />
            ) : (
              <LinearGradient colors={['#232631', '#121319']} style={styles.placeholder}>
                <View style={[styles.placeholderIcon, { backgroundColor: `${course.color}25`, borderColor: `${course.color}55` }]}> 
                  <Feather name="upload-cloud" size={32} color={course.color} />
                </View>
                <Text style={styles.placeholderTitle}>Video slot ready</Text>
                <Text style={styles.placeholderText}>Your final lesson video will play here after its URL is added.</Text>
                <View style={styles.placeholderBadge}>
                  <View style={[styles.statusDot, { backgroundColor: course.color }]} />
                  <Text style={styles.placeholderBadgeText}>AWAITING UPLOAD</Text>
                </View>
              </LinearGradient>
            )}
          </View>

          <View style={styles.videoControlsHint}>
            <Text style={styles.videoCount}>Lesson {lessonNumber} of {lessonCount}</Text>
            <Text style={styles.videoDuration}>{lesson.durationMinutes} min</Text>
          </View>
        </View>

        <View style={styles.body}>
          <View style={[styles.courseTag, { backgroundColor: `${course.color}14` }]}> 
            <Feather name={course.icon} size={13} color={course.color} />
            <Text style={[styles.courseTagText, { color: course.color }]}>{module.title}</Text>
          </View>
          <Text style={[styles.lessonTitle, { color: colors.foreground }]}>{lesson.title}</Text>
          <Text style={[styles.lessonDescription, { color: colors.mutedForeground }]}>{lesson.description}</Text>

          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.progressTop}>
              <Text style={[styles.progressTitle, { color: colors.foreground }]}>{course.title} progress</Text>
              <Text style={[styles.progressPercent, { color: course.color }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}> 
              <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: course.color }]} />
            </View>
            <Text style={[styles.progressMeta, { color: colors.mutedForeground }]}>{courseCompleted} of {courseLessons.length} lessons complete</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.82}
            onPress={toggleComplete}
            style={[styles.completeCard, {
              backgroundColor: isComplete ? `${course.color}13` : colors.card,
              borderColor: isComplete ? `${course.color}55` : colors.border,
            }]}
          >
            <View style={[styles.completeIcon, { backgroundColor: isComplete ? course.color : colors.muted }]}> 
              <Feather name={isComplete ? 'check' : 'check-circle'} size={20} color={isComplete ? '#FFFFFF' : colors.mutedForeground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.completeTitle, { color: colors.foreground }]}>{isComplete ? 'Lesson completed' : 'Mark this lesson complete'}</Text>
              <Text style={[styles.completeText, { color: colors.mutedForeground }]}>{isComplete ? 'Tap to undo and update your progress.' : 'Your progress is saved on this device.'}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.lessonNav}>
            <TouchableOpacity
              disabled={!previousLesson}
              onPress={() => previousLesson && openLesson(previousLesson.id)}
              style={[styles.lessonNavButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: previousLesson ? 1 : 0.45 }]}
            >
              <Feather name="chevron-left" size={18} color={colors.mutedForeground} />
              <View style={styles.lessonNavText}>
                <Text style={[styles.lessonNavLabel, { color: colors.mutedForeground }]}>PREVIOUS</Text>
                <Text numberOfLines={1} style={[styles.lessonNavTitle, { color: colors.foreground }]}>{previousLesson?.title ?? 'First lesson'}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={!nextLesson}
              onPress={() => nextLesson && openLesson(nextLesson.id)}
              style={[styles.lessonNavButton, { backgroundColor: colors.card, borderColor: colors.border, opacity: nextLesson ? 1 : 0.45 }]}
            >
              <View style={[styles.lessonNavText, { alignItems: 'flex-end' }]}>
                <Text style={[styles.lessonNavLabel, { color: colors.mutedForeground }]}>NEXT</Text>
                <Text numberOfLines={1} style={[styles.lessonNavTitle, { color: colors.foreground, textAlign: 'right' }]}>{nextLesson?.title ?? 'Course complete'}</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {course.disclaimer && (
            <View style={[styles.disclaimer, { backgroundColor: `${category.color}10`, borderColor: `${category.color}28` }]}> 
              <Feather name="alert-triangle" size={16} color={category.color} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{course.disclaimer}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 15 }]}> 
        <TouchableOpacity
          activeOpacity={0.86}
          onPress={() =>
            nextLesson ? openLesson(nextLesson.id) : router.replace(libraryPath(resolvedCategoryId, course.id) as never)
          }
          style={[styles.actionButton, { backgroundColor: course.color }]}
        >
          <Text style={styles.actionText}>{nextLesson ? 'Next lesson' : 'Back to course'}</Text>
          <Feather name={nextLesson ? 'arrow-right' : 'check'} size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  missingTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  missingButton: { borderRadius: 22, paddingHorizontal: 22, paddingVertical: 12 },
  darkHeader: { backgroundColor: '#111219', paddingHorizontal: 16, paddingBottom: 13 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  darkButton: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.09)' },
  navTitle: { flex: 1, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginHorizontal: 12, fontSize: 13, fontFamily: 'Manrope_700Bold' },
  videoFrame: { width: '100%', aspectRatio: 16 / 9, borderRadius: 18, overflow: 'hidden', backgroundColor: '#090A0D' },
  video: { width: '100%', height: '100%' },
  placeholder: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  placeholderIcon: { width: 66, height: 66, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  placeholderTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold', marginTop: 12 },
  placeholderText: { color: 'rgba(255,255,255,0.52)', fontSize: 10.5, lineHeight: 15, textAlign: 'center', fontFamily: 'Manrope_500Medium', maxWidth: 240, marginTop: 3 },
  placeholderBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 9, paddingVertical: 5, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 100, marginTop: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  placeholderBadgeText: { color: 'rgba(255,255,255,0.58)', fontSize: 8.5, letterSpacing: 0.8, fontFamily: 'Manrope_800ExtraBold' },
  videoControlsHint: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, paddingHorizontal: 2 },
  videoCount: { color: 'rgba(255,255,255,0.58)', fontSize: 10.5, fontFamily: 'Manrope_600SemiBold' },
  videoDuration: { color: 'rgba(255,255,255,0.58)', fontSize: 10.5, fontFamily: 'Manrope_600SemiBold' },
  body: { padding: 20, gap: 13 },
  courseTag: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 6 },
  courseTagText: { fontSize: 9.5, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.3 },
  lessonTitle: { fontSize: 22, lineHeight: 29, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.35 },
  lessonDescription: { fontSize: 12.5, lineHeight: 20, fontFamily: 'Manrope_500Medium' },
  progressCard: { borderRadius: 17, borderWidth: 1, padding: 14, marginTop: 3 },
  progressTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressTitle: { fontSize: 12.5, fontFamily: 'Manrope_700Bold' },
  progressPercent: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  progressTrack: { height: 6, borderRadius: 6, overflow: 'hidden', marginTop: 9 },
  progressFill: { height: '100%', borderRadius: 6 },
  progressMeta: { fontSize: 9.8, fontFamily: 'Manrope_500Medium', marginTop: 6 },
  completeCard: { minHeight: 72, borderRadius: 17, borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  completeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  completeTitle: { fontSize: 12.5, fontFamily: 'Manrope_700Bold' },
  completeText: { fontSize: 9.8, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  lessonNav: { flexDirection: 'row', gap: 9 },
  lessonNavButton: { flex: 1, minWidth: 0, height: 62, borderRadius: 16, borderWidth: 1, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 4 },
  lessonNavText: { flex: 1, minWidth: 0 },
  lessonNavLabel: { fontSize: 7.8, letterSpacing: 0.7, fontFamily: 'Manrope_800ExtraBold' },
  lessonNavTitle: { fontSize: 9.3, fontFamily: 'Manrope_600SemiBold', marginTop: 2 },
  disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: 15, borderWidth: 1, padding: 12 },
  disclaimerText: { flex: 1, fontSize: 9.8, lineHeight: 15, fontFamily: 'Manrope_500Medium' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 11 },
  actionButton: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  actionText: { color: '#FFFFFF', fontSize: 14.5, fontFamily: 'Manrope_700Bold' },
});
