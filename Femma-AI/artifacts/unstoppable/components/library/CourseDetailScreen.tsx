import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useApp } from '@/context/AppContext';
import { getCourseLessons, courseProgressPercent, libraryPath, resolveCategoryId, type LibraryCategoryId } from '@/lib/catalog';
import { useCatalogCourse } from '@/hooks/useCatalog';
import { useColors } from '@/hooks/useColors';
import ProgressBar from '@/components/ProgressBar';

type Props = { categoryId: LibraryCategoryId; courseId: string };

export default function CourseDetailScreen({ categoryId, courseId }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { completedLessonIds, lessonWatchProgress, savedCourseIds, toggleSavedCourse } = useApp();
  const resolvedCategoryId = resolveCategoryId(categoryId);
  const { course, isLoading, error, refetch } = useCatalogCourse(courseId);
  const topPad = Platform.OS === 'web' ? 58 : insets.top + 8;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [collapsedModules, setCollapsedModules] = useState<string[]>([]);

  const lessons = useMemo(() => (course ? getCourseLessons(course) : []), [course]);
  const completedCount = lessons.filter((item) => completedLessonIds.includes(item.id)).length;
  const uploadedCount = lessons.filter((item) => Boolean(item.videoUrl)).length;
  const progress = courseProgressPercent(lessons, completedLessonIds, lessonWatchProgress);
  const firstIncomplete = lessons.find((item) => !completedLessonIds.includes(item.id)) ?? lessons[0];

  if (isLoading) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.missingTitle, { color: colors.foreground }]}>Loading course…</Text>
      </View>
    );
  }

  if (error || !course || course.categoryId !== resolvedCategoryId) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background, paddingTop: topPad }]}>
        <Feather name="alert-circle" size={32} color={colors.mutedForeground} />
        <Text style={[styles.missingTitle, { color: colors.foreground }]}>Course not found</Text>
        <TouchableOpacity onPress={() => (error ? refetch() : router.back())} style={[styles.missingButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.primaryButtonText}>{error ? 'Retry' : 'Go back'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isSaved = savedCourseIds.includes(course.id);
  const openLesson = (lessonId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    router.push(libraryPath(resolvedCategoryId, undefined, lessonId) as never);
  };

  const toggleModule = (moduleId: string) => {
    setCollapsedModules(current => current.includes(moduleId)
      ? current.filter(id => id !== moduleId)
      : [...current, moduleId]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}> 
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 104 }}>
        <LinearGradient colors={[course.gradient[0], course.gradient[1]]} style={[styles.hero, { paddingTop: topPad }]}> 
          <View style={styles.navRow}>
            <TouchableOpacity accessibilityLabel="Go back" onPress={() => router.back()} style={styles.glassButton}>
              <Feather name="arrow-left" size={21} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityLabel={isSaved ? 'Remove saved course' : 'Save course'}
              onPress={() => {
                Haptics.selectionAsync().catch(() => undefined);
                toggleSavedCourse(course.id);
              }}
              style={styles.glassButton}
            >
              <Feather name="bookmark" size={20} color="#FFFFFF" />
              {isSaved && <View style={styles.savedDot} />}
            </TouchableOpacity>
          </View>
          <View style={styles.heroIcon}>
            <Feather name={course.icon} size={28} color="#FFFFFF" />
          </View>
          <Text style={styles.heroEyebrow}>{resolvedCategoryId.replace(/-/g, ' ').toUpperCase()} COURSE</Text>
          <Text style={styles.heroTitle}>{course.title}</Text>
          <Text style={styles.heroDescription}>{course.description}</Text>
          <View style={styles.heroMeta}>
            <View style={styles.heroMetaItem}><Feather name="layers" size={13} color="rgba(255,255,255,0.8)" /><Text style={styles.heroMetaText}>{course.modules.length} modules</Text></View>
            <View style={styles.heroMetaItem}><Feather name="play-circle" size={13} color="rgba(255,255,255,0.8)" /><Text style={styles.heroMetaText}>{lessons.length} lessons</Text></View>
            <View style={styles.heroMetaItem}><Feather name="bar-chart-2" size={13} color="rgba(255,255,255,0.8)" /><Text style={styles.heroMetaText}>{course.level}</Text></View>
          </View>
        </LinearGradient>

        <View style={styles.body}>
          <View style={[styles.progressCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
            <View style={styles.progressTop}>
              <View>
                <Text style={[styles.progressTitle, { color: colors.foreground }]}>Your progress</Text>
                <Text style={[styles.progressMeta, { color: colors.mutedForeground }]}>{completedCount} of {lessons.length} lessons complete</Text>
              </View>
              <Text style={[styles.progressPercent, { color: course.color }]}>{progress}%</Text>
            </View>
            <View style={[styles.progressTrackWrap]}>
              <ProgressBar progress={progress} color={course.color} trackColor={colors.muted} height={6} />
            </View>
            <View style={styles.uploadStatus}>
              <Feather name={uploadedCount === lessons.length ? 'check-circle' : 'upload-cloud'} size={14} color={uploadedCount ? course.color : colors.mutedForeground} />
              <Text style={[styles.uploadStatusText, { color: colors.mutedForeground }]}>
                {uploadedCount} of {lessons.length} videos ready
              </Text>
            </View>
          </View>

          <View style={styles.aboutRow}>
            <View style={[styles.aboutItem, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={[styles.aboutIcon, { backgroundColor: `${course.color}18` }]}><Feather name="tool" size={17} color={course.color} /></View>
              <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Equipment</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>{course.equipment}</Text>
            </View>
            <View style={[styles.aboutItem, { backgroundColor: colors.card, borderColor: colors.border }]}> 
              <View style={[styles.aboutIcon, { backgroundColor: `${course.color}18` }]}><Feather name="award" size={17} color={course.color} /></View>
              <Text style={[styles.aboutLabel, { color: colors.mutedForeground }]}>Level</Text>
              <Text style={[styles.aboutValue, { color: colors.foreground }]}>{course.level}</Text>
            </View>
          </View>

          <Text style={[styles.curriculumTitle, { color: colors.foreground }]}>Course curriculum</Text>
          <Text style={[styles.curriculumSubtitle, { color: colors.mutedForeground }]}>Complete lessons in order or choose any video.</Text>

          {course.modules.map((module, moduleIndex) => {
            const collapsed = collapsedModules.includes(module.id);
            const moduleCompleted = module.lessons.filter(item => completedLessonIds.includes(item.id)).length;
            return (
              <View key={module.id} style={[styles.moduleCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <TouchableOpacity onPress={() => toggleModule(module.id)} activeOpacity={0.8} style={styles.moduleHeader}>
                  <View style={[styles.moduleNumber, { backgroundColor: `${course.color}18` }]}> 
                    <Text style={[styles.moduleNumberText, { color: course.color }]}>{moduleIndex + 1}</Text>
                  </View>
                  <View style={styles.moduleHeadingText}>
                    <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{module.title}</Text>
                    <Text style={[styles.moduleMeta, { color: colors.mutedForeground }]}>{moduleCompleted}/{module.lessons.length} complete · {module.lessons.length} lessons</Text>
                  </View>
                  <Feather name={collapsed ? 'chevron-down' : 'chevron-up'} size={18} color={colors.mutedForeground} />
                </TouchableOpacity>
                {!collapsed && (
                  <View style={[styles.lessonList, { borderTopColor: colors.border }]}> 
                    <Text style={[styles.moduleDescription, { color: colors.mutedForeground }]}>{module.description}</Text>
                    {module.lessons.map((item, lessonIndex) => {
                      const complete = completedLessonIds.includes(item.id);
                      return (
                        <TouchableOpacity key={item.id} onPress={() => openLesson(item.id)} activeOpacity={0.78} style={styles.lessonRow}>
                          <View style={[styles.lessonStatus, { backgroundColor: complete ? course.color : colors.muted }]}> 
                            <Feather name={complete ? 'check' : item.videoUrl ? 'play' : 'video'} size={13} color={complete ? '#FFFFFF' : item.videoUrl ? course.color : colors.mutedForeground} />
                          </View>
                          <View style={styles.lessonText}>
                            <Text numberOfLines={2} style={[styles.lessonTitle, { color: colors.foreground }]}>{lessonIndex + 1}. {item.title}</Text>
                            <View style={styles.lessonMetaRow}>
                              <Text style={[styles.lessonMeta, { color: colors.mutedForeground }]}>{item.durationMinutes} min</Text>
                              <View style={[styles.lessonMetaDot, { backgroundColor: colors.border }]} />
                              <Text style={[styles.lessonMeta, { color: item.videoUrl ? course.color : colors.mutedForeground }]}>
                                {item.videoUrl ? 'Ready to watch' : 'Awaiting upload'}
                              </Text>
                            </View>
                          </View>
                          <Feather name="chevron-right" size={17} color={colors.mutedForeground} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}

          {course.disclaimer && (
            <View style={[styles.disclaimer, { backgroundColor: `${course.color}10`, borderColor: `${course.color}28` }]}> 
              <Feather name="info" size={17} color={course.color} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{course.disclaimer}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad + 16 }]}> 
        <TouchableOpacity
          disabled={!firstIncomplete}
          activeOpacity={0.86}
          onPress={() => firstIncomplete && openLesson(firstIncomplete.id)}
          style={[styles.primaryButton, { backgroundColor: course.color }]}
        >
          <Feather name={completedCount ? 'play' : 'book-open'} size={18} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>{completedCount ? 'Continue course' : 'Start course'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, gap: 12 },
  missingTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  missingButton: { borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12 },
  hero: { paddingHorizontal: 20, paddingBottom: 25, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  glassButton: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  savedDot: { position: 'absolute', right: 8, top: 8, width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 13 },
  heroEyebrow: { color: 'rgba(255,255,255,0.7)', fontSize: 9.5, letterSpacing: 1.2, fontFamily: 'Manrope_800ExtraBold' },
  heroTitle: { color: '#FFFFFF', fontSize: 29, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.5, marginTop: 2 },
  heroDescription: { color: 'rgba(255,255,255,0.8)', fontSize: 12.5, lineHeight: 19, fontFamily: 'Manrope_500Medium', marginTop: 7, maxWidth: 350 },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 15 },
  heroMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroMetaText: { color: 'rgba(255,255,255,0.85)', fontSize: 10.5, fontFamily: 'Manrope_600SemiBold' },
  body: { padding: 20, gap: 12 },
  progressCard: { borderRadius: 18, borderWidth: 1, padding: 15 },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  progressMeta: { fontSize: 10.5, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  progressPercent: { fontSize: 21, fontFamily: 'Manrope_800ExtraBold' },
  progressTrackWrap: { marginTop: 11 },
  uploadStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  uploadStatusText: { fontSize: 10.5, fontFamily: 'Manrope_600SemiBold' },
  aboutRow: { flexDirection: 'row', gap: 10 },
  aboutItem: { flex: 1, minHeight: 104, borderRadius: 17, borderWidth: 1, padding: 13 },
  aboutIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  aboutLabel: { fontSize: 9.5, fontFamily: 'Manrope_600SemiBold' },
  aboutValue: { fontSize: 11.5, fontFamily: 'Manrope_700Bold', marginTop: 1 },
  curriculumTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginTop: 10 },
  curriculumSubtitle: { fontSize: 10.5, fontFamily: 'Manrope_500Medium', marginTop: -9, marginBottom: 2 },
  moduleCard: { borderRadius: 19, borderWidth: 1, overflow: 'hidden' },
  moduleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13 },
  moduleNumber: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  moduleHeadingText: { flex: 1 },
  moduleTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  moduleMeta: { fontSize: 9.7, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  lessonList: { borderTopWidth: 1, paddingHorizontal: 13, paddingBottom: 9 },
  moduleDescription: { fontSize: 10.3, lineHeight: 15, fontFamily: 'Manrope_500Medium', marginVertical: 9 },
  lessonRow: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  lessonStatus: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  lessonText: { flex: 1 },
  lessonTitle: { fontSize: 11.5, lineHeight: 16, fontFamily: 'Manrope_600SemiBold' },
  lessonMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 3 },
  lessonMeta: { fontSize: 9.3, fontFamily: 'Manrope_500Medium' },
  lessonMetaDot: { width: 3, height: 3, borderRadius: 2 },
  disclaimer: { flexDirection: 'row', gap: 9, borderRadius: 16, borderWidth: 1, padding: 13, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 10.3, lineHeight: 16, fontFamily: 'Manrope_500Medium' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12 },
  primaryButton: { height: 52, borderRadius: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14.5, fontFamily: 'Manrope_700Bold' },
});

