import React, { useMemo, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { getCourseLessons, getVideoCategory, getVideoLessonContext, type LibraryCategoryId } from '@/data/videoLibrary';
import { useColors } from '@/hooks/useColors';

type Props = { categoryId: LibraryCategoryId };

const percent = (complete: number, total: number) => total ? Math.round((complete / total) * 100) : 0;

export default function LibraryHubScreen({ categoryId }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completedLessonIds, lastViewedLessonId, savedCourseIds } = useApp();
  const category = getVideoCategory(categoryId)!;
  const topPad = Platform.OS === 'web' ? 58 : insets.top + 8;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [query, setQuery] = useState('');
  const [savedOnly, setSavedOnly] = useState(false);

  const allLessons = category.courses.flatMap(getCourseLessons);
  const completedCount = allLessons.filter(item => completedLessonIds.includes(item.id)).length;
  const uploadedCount = allLessons.filter(item => Boolean(item.videoUrl)).length;
  const lastContext = lastViewedLessonId ? getVideoLessonContext(lastViewedLessonId) : null;
  const continueContext = lastContext?.category.id === categoryId ? lastContext : null;

  const courses = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return category.courses.filter(course => {
      if (savedOnly && !savedCourseIds.includes(course.id)) return false;
      if (!normalized) return true;
      return [
        course.title,
        course.description,
        ...course.modules.flatMap(module => [module.title, ...module.lessons.map(item => item.title)]),
      ].join(' ').toLowerCase().includes(normalized);
    });
  }, [category.courses, query, savedCourseIds, savedOnly]);

  const openCourse = (courseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    router.push(`/${categoryId}/${courseId}` as never);
  };

  const openLesson = (lessonId: string) => {
    router.push(`/${categoryId}/player?lessonId=${encodeURIComponent(lessonId)}` as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 40 }}>
        <LinearGradient colors={[category.gradient[0], category.gradient[1]]} style={[styles.hero, { paddingTop: topPad }]}> 
          <View style={styles.navRow}>
            <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={styles.glassButton}>
              <Feather name="arrow-left" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <View style={styles.libraryPill}>
              <Feather name="video" size={13} color="#FFFFFF" />
              <Text style={styles.libraryPillText}>VIDEO LIBRARY</Text>
            </View>
            <View style={styles.glassButton}>
              <Feather name={category.icon} size={20} color="#FFFFFF" />
            </View>
          </View>
          <Text style={styles.heroTitle}>{category.title}</Text>
          <Text style={styles.heroSubtitle}>{category.subtitle}</Text>
          <Text style={styles.heroDescription}>{category.description}</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{category.courses.length}</Text>
              <Text style={styles.heroStatLabel}>Courses</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{allLessons.length}</Text>
              <Text style={styles.heroStatLabel}>Lessons</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{percent(completedCount, allLessons.length)}%</Text>
              <Text style={styles.heroStatLabel}>Complete</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {continueContext && (
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => openLesson(continueContext.lesson.id)}
              style={[styles.continueCard, { backgroundColor: colors.charcoal }]}
            >
              <View style={[styles.continueIcon, { backgroundColor: `${category.color}35` }]}> 
                <Feather name="play" size={20} color={category.color} />
              </View>
              <View style={styles.continueText}>
                <Text style={styles.continueEyebrow}>CONTINUE LEARNING</Text>
                <Text numberOfLines={1} style={styles.continueTitle}>{continueContext.lesson.title}</Text>
                <Text style={styles.continueMeta}>{continueContext.course.title} · {continueContext.lesson.durationMinutes} min</Text>
              </View>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          )}

          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={`Search ${category.title.toLowerCase()} lessons…`}
              placeholderTextColor={colors.mutedForeground}
              style={[styles.searchInput, { color: colors.foreground }]}
            />
            {query.length > 0 && (
              <TouchableOpacity accessibilityLabel="Clear search" onPress={() => setQuery('')}>
                <Feather name="x-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sectionHeading}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Course library</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.mutedForeground }]}>Choose a structured path and learn in order.</Text>
            </View>
            <TouchableOpacity
              onPress={() => setSavedOnly(current => !current)}
              style={[styles.savedFilter, {
                backgroundColor: savedOnly ? `${category.color}18` : colors.card,
                borderColor: savedOnly ? category.color : colors.border,
              }]}
            >
              <Feather name="bookmark" size={15} color={savedOnly ? category.color : colors.mutedForeground} />
              <Text style={[styles.savedFilterText, { color: savedOnly ? category.color : colors.mutedForeground }]}>Saved</Text>
            </TouchableOpacity>
          </View>

          {courses.map(course => {
            const lessons = getCourseLessons(course);
            const courseCompleted = lessons.filter(item => completedLessonIds.includes(item.id)).length;
            const courseUploaded = lessons.filter(item => Boolean(item.videoUrl)).length;
            const progress = percent(courseCompleted, lessons.length);
            return (
              <TouchableOpacity
                key={course.id}
                activeOpacity={0.86}
                onPress={() => openCourse(course.id)}
                style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <LinearGradient colors={[`${course.gradient[0]}25`, `${course.gradient[1]}08`]} style={styles.courseAccent} />
                <View style={[styles.courseIcon, { backgroundColor: `${course.color}18` }]}> 
                  <Feather name={course.icon} size={22} color={course.color} />
                </View>
                <View style={styles.courseContent}>
                  <View style={styles.courseTitleRow}>
                    <Text style={[styles.courseTitle, { color: colors.foreground }]}>{course.title}</Text>
                    {savedCourseIds.includes(course.id) && <Feather name="bookmark" size={15} color={course.color} />}
                  </View>
                  <Text numberOfLines={2} style={[styles.courseDescription, { color: colors.mutedForeground }]}>{course.description}</Text>
                  <View style={styles.metaRow}>
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{course.modules.length} modules</Text>
                    <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                    <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{lessons.length} lessons</Text>
                    <View style={[styles.metaDot, { backgroundColor: colors.border }]} />
                    <Text style={[styles.metaText, { color: courseUploaded ? course.color : colors.mutedForeground }]}>
                      {courseUploaded ? `${courseUploaded} uploaded` : 'Upload-ready'}
                    </Text>
                  </View>
                  <View style={styles.progressRow}>
                    <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}> 
                      <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: course.color }]} />
                    </View>
                    <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{courseCompleted}/{lessons.length}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={19} color={colors.mutedForeground} />
              </TouchableOpacity>
            );
          })}

          {courses.length === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}> 
                <Feather name={savedOnly ? 'bookmark' : 'search'} size={22} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{savedOnly ? 'No saved courses yet' : 'No lessons found'}</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{savedOnly ? 'Save a course from its detail page.' : 'Try another search term.'}</Text>
            </View>
          )}

          <View style={[styles.uploadNote, { backgroundColor: `${category.color}0F`, borderColor: `${category.color}30` }]}> 
            <Feather name="upload-cloud" size={20} color={category.color} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.uploadTitle, { color: colors.foreground }]}>Library prepared for your videos</Text>
              <Text style={[styles.uploadText, { color: colors.mutedForeground }]}>
                All {allLessons.length} lesson slots are structured. {uploadedCount} currently have a video URL.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  glassButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  libraryPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(23,24,28,0.18)', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 100 },
  libraryPillText: { color: '#FFFFFF', fontSize: 9.5, letterSpacing: 1.1, fontFamily: 'Manrope_800ExtraBold' },
  heroTitle: { color: '#FFFFFF', fontSize: 32, lineHeight: 39, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.7 },
  heroSubtitle: { color: 'rgba(255,255,255,0.95)', fontSize: 14, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  heroDescription: { color: 'rgba(255,255,255,0.78)', fontSize: 12.5, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: 8, maxWidth: 330 },
  heroStats: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.14)', borderRadius: 18, paddingVertical: 12 },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatValue: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  heroStatLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 9.5, fontFamily: 'Manrope_600SemiBold', marginTop: 1 },
  heroDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  body: { padding: 20, gap: 13 },
  continueCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 18, padding: 14 },
  continueIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  continueText: { flex: 1 },
  continueEyebrow: { color: 'rgba(255,255,255,0.48)', fontSize: 8.5, letterSpacing: 1, fontFamily: 'Manrope_800ExtraBold' },
  continueTitle: { color: '#FFFFFF', fontSize: 13.5, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  continueMeta: { color: 'rgba(255,255,255,0.55)', fontSize: 10.5, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  searchBar: { height: 48, borderWidth: 1, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14 },
  searchInput: { flex: 1, fontSize: 13.5, fontFamily: 'Manrope_500Medium', outlineStyle: 'none' } as never,
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 1 },
  sectionTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  sectionSubtitle: { fontSize: 10.5, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  savedFilter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 11, borderWidth: 1 },
  savedFilterText: { fontSize: 10.5, fontFamily: 'Manrope_700Bold' },
  courseCard: { minHeight: 132, borderRadius: 20, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  courseAccent: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  courseIcon: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  courseContent: { flex: 1 },
  courseTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courseTitle: { fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  courseDescription: { fontSize: 10.8, lineHeight: 16, fontFamily: 'Manrope_500Medium', marginTop: 3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, flexWrap: 'wrap' },
  metaText: { fontSize: 9.6, fontFamily: 'Manrope_600SemiBold' },
  metaDot: { width: 3, height: 3, borderRadius: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  progressTrack: { flex: 1, height: 5, borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 5 },
  progressLabel: { fontSize: 9.5, fontFamily: 'Manrope_700Bold' },
  emptyState: { alignItems: 'center', paddingVertical: 38 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  emptyText: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  uploadNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, borderWidth: 1, borderRadius: 16, padding: 14, marginTop: 4 },
  uploadTitle: { fontSize: 12.5, fontFamily: 'Manrope_700Bold' },
  uploadText: { fontSize: 10.5, lineHeight: 16, fontFamily: 'Manrope_500Medium', marginTop: 2 },
});
