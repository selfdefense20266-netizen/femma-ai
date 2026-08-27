import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useCatalog } from '@/hooks/useCatalog';
import { getCourseLessons, courseProgressPercent, getVideoCategory, libraryPath } from '@/lib/catalog';
import ProgressBar from '@/components/ProgressBar';

type Journey = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  colors: [string, string];
  categoryId: string;
};

const JOURNEYS: Journey[] = [
  {
    id: 'new-mom',
    eyebrow: 'RECOVERY',
    title: 'New Mom Recovery',
    detail: 'Postpartum + Nutrition + Yoga',
    colors: ['#FF928F', '#F26BB5'],
    categoryId: 'cycle-pregnancy-health',
  },
  {
    id: 'confidence-safety',
    eyebrow: 'ACTIVE JOURNEY',
    title: 'Confidence & Safety',
    detail: 'Self Defence courses',
    colors: ['#B9A7F2', '#F26BB5'],
    categoryId: 'self-defence',
  },
  {
    id: 'fat-loss',
    eyebrow: 'FITNESS',
    title: 'Fitness Library',
    detail: 'Strength, cardio, yoga & more',
    colors: ['#F26BB5', '#D94A9A'],
    categoryId: 'fitness',
  },
  {
    id: 'cycle-aligned',
    eyebrow: 'LIFESTYLE',
    title: 'Cycle-Aligned Living',
    detail: 'Cycle, pregnancy & health paths',
    colors: ['#77CDED', '#B9A7F2'],
    categoryId: 'cycle-pregnancy-health',
  },
];

function vibrate() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function categoryProgress(
  catalog: NonNullable<ReturnType<typeof useCatalog>['data']>,
  categoryId: string,
  completedLessonIds: string[],
  lessonWatchProgress: Record<string, number>
) {
  const category = getVideoCategory(catalog, categoryId);
  if (!category) return { percent: 0, completed: 0, total: 0 };
  const lessons = category.courses.flatMap(getCourseLessons);
  const total = lessons.length;
  if (!total) return { percent: 0, completed: 0, total: 0 };
  const completed = lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  return {
    percent: courseProgressPercent(lessons, completedLessonIds, lessonWatchProgress),
    completed,
    total,
  };
}

export default function ExploreScreen() {
  const colors = useColors();
  const { savedCourseIds, completedLessonIds, lessonWatchProgress } = useApp();
  const { data: catalog, isLoading, error, refetch } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [query, setQuery] = useState('');
  const [expandedCourse, setExpandedCourse] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const journeys = useMemo(() => {
    if (!catalog) return [];
    return JOURNEYS.map((journey) => {
      const progress = categoryProgress(catalog, journey.categoryId, completedLessonIds, lessonWatchProgress);
      return {
        ...journey,
        route: libraryPath(journey.categoryId),
        progress: progress.percent,
        progressLabel: progress.total ? `${progress.completed}/${progress.total}` : 'Coming soon',
        hasLessons: progress.total > 0,
      };
    });
  }, [catalog, completedLessonIds, lessonWatchProgress]);

  const categories = useMemo(() => {
    if (!catalog) return [];
    return catalog.categories.map((category) => ({
      id: category.id,
      label: category.title.toUpperCase(),
      color: category.color,
      courses: category.courses.map((course) => {
        const lessons = getCourseLessons(course);
        return {
          id: course.id,
          title: course.title,
          meta: `${course.modules.length} Modules • ${lessons.length} Lessons`,
          icon: course.icon,
          color: course.color,
          route: libraryPath(category.id, course.id),
          modules: course.modules.map((module) => ({
            title: module.title,
            detail: `${module.lessons.length} lessons`,
          })),
          disclaimer: course.disclaimer,
        };
      }),
    }));
  }, [catalog]);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        courses: category.courses.filter((course) => {
          if (showSavedOnly && !savedCourseIds.includes(course.id)) return false;
          if (!normalized) return true;
          return [course.title, course.meta, ...course.modules.map((module) => module.title)]
            .join(' ')
            .toLowerCase()
            .includes(normalized);
        }),
      }))
      .filter((category) => category.courses.length > 0);
  }, [categories, query, savedCourseIds, showSavedOnly]);

  const toggleCourse = (courseId: string) => {
    vibrate();
    setExpandedCourse((current) => (current === courseId ? '' : courseId));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.mutedForeground, fontFamily: 'Manrope_600SemiBold', marginTop: 10 }}>
          Loading courses…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: 'Manrope_700Bold' }}>Could not load catalog</Text>
        <TouchableOpacity
          onPress={() => refetch()}
          style={{ marginTop: 12, padding: 12, backgroundColor: colors.primary, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontFamily: 'Manrope_700Bold' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={[styles.header, { paddingTop: topPad }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>Explore</Text>
            <TouchableOpacity
              accessibilityLabel="Saved courses"
              onPress={() => setShowSavedOnly((current) => !current)}
              style={[
                styles.bookmarkButton,
                {
                  backgroundColor: showSavedOnly ? `${colors.primary}18` : colors.card,
                  borderColor: showSavedOnly ? colors.primary : colors.border,
                },
              ]}
            >
              <Feather name="bookmark" size={20} color={showSavedOnly ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Live courses from your Fema AI catalog.
          </Text>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search courses or modules…"
              placeholderTextColor={colors.mutedForeground}
              value={query}
              onChangeText={setQuery}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} accessibilityLabel="Clear search">
                <Feather name="x-circle" size={17} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {!query && (
          <Animated.View entering={FadeInDown.duration(420)} style={styles.journeysSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Guided Journeys</Text>
              <Text style={[styles.swipeLabel, { color: colors.mutedForeground }]}>SWIPE</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.journeyList}>
              {journeys.map((journey) => {
                const comingSoon = !journey.hasLessons;
                return (
                  <TouchableOpacity
                    key={journey.id}
                    activeOpacity={comingSoon ? 1 : 0.88}
                    disabled={comingSoon}
                    style={[
                      styles.journeyCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        opacity: comingSoon ? 0.55 : 1,
                      },
                    ]}
                    onPress={() => {
                      if (comingSoon) return;
                      vibrate();
                      router.push(journey.route as never);
                    }}
                  >
                    <LinearGradient colors={journey.colors} style={styles.journeyHero}>
                      <Text style={styles.journeyEyebrow}>{journey.eyebrow}</Text>
                      <Text style={styles.journeyTitle}>{journey.title}</Text>
                      {comingSoon && (
                        <View style={styles.comingSoonBadge}>
                          <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                        </View>
                      )}
                    </LinearGradient>
                    <View style={styles.journeyFooter}>
                      <View style={styles.journeyFooterText}>
                        <Text numberOfLines={1} style={[styles.journeyDetail, { color: colors.mutedForeground }]}>
                          {journey.detail}
                        </Text>
                        {comingSoon ? (
                          <Text style={[styles.comingSoonHint, { color: colors.mutedForeground }]}>
                            Content is being prepared
                          </Text>
                        ) : (
                          <View style={styles.journeyProgressRow}>
                            <ProgressBar
                              progress={journey.progress}
                              color={colors.primary}
                              trackColor={colors.muted}
                              height={4}
                              style={styles.journeyProgressBar}
                            />
                            <Text style={[styles.journeyProgressLabel, { color: colors.mutedForeground }]}>
                              {journey.progress}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Feather
                        name={comingSoon ? 'clock' : journey.progress > 0 ? 'play' : 'chevron-right'}
                        size={17}
                        color={comingSoon ? colors.mutedForeground : colors.primary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

        <View style={styles.curriculumHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Browse curriculum</Text>
          <Text style={[styles.curriculumHint, { color: colors.mutedForeground }]}>Course → module → video lesson</Text>
        </View>

        <View style={styles.categories}>
          {filteredCategories.map((category, categoryIndex) => (
            <Animated.View
              key={category.id}
              entering={FadeInDown.delay(categoryIndex * 70).duration(380)}
              style={styles.categorySection}
            >
              <View style={styles.categoryHeading}>
                <Text style={[styles.categoryLabel, { color: category.color }]}>{category.label}</Text>
                <Text style={[styles.categoryCount, { color: colors.mutedForeground }]}>
                  {category.courses.length} {category.courses.length === 1 ? 'course' : 'courses'}
                </Text>
              </View>

              {category.courses.map((course) => {
                const isExpanded = expandedCourse === course.id;
                return (
                  <View
                    key={course.id}
                    style={[styles.courseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  >
                    <TouchableOpacity activeOpacity={0.82} onPress={() => toggleCourse(course.id)} style={styles.courseHeader}>
                      <View style={[styles.courseIcon, { backgroundColor: `${course.color}18` }]}>
                        <Feather name={course.icon} size={19} color={course.color} />
                      </View>
                      <View style={styles.courseText}>
                        <Text style={[styles.courseTitle, { color: colors.foreground }]}>{course.title}</Text>
                        <Text style={[styles.courseMeta, { color: colors.mutedForeground }]}>{course.meta}</Text>
                      </View>
                      <View style={[styles.expandButton, { backgroundColor: colors.muted }]}>
                        <Feather
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={17}
                          color={colors.mutedForeground}
                        />
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={[styles.moduleList, { borderTopColor: colors.border }]}>
                        {course.modules.length === 0 ? (
                          <TouchableOpacity
                            activeOpacity={0.75}
                            style={styles.moduleRow}
                            onPress={() => {
                              vibrate();
                              router.push(course.route as never);
                            }}
                          >
                            <Text style={[styles.moduleTitle, { color: colors.foreground, flex: 1 }]}>Open course</Text>
                            <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                          </TouchableOpacity>
                        ) : (
                          course.modules.map((module, moduleIndex) => (
                            <TouchableOpacity
                              key={`${course.id}-${module.title}`}
                              activeOpacity={0.75}
                              style={styles.moduleRow}
                              onPress={() => {
                                vibrate();
                                router.push(course.route as never);
                              }}
                            >
                              <View style={[styles.moduleNumber, { backgroundColor: `${course.color}18` }]}>
                                <Text style={[styles.moduleNumberText, { color: course.color }]}>{moduleIndex + 1}</Text>
                              </View>
                              <Text style={[styles.moduleTitle, { color: colors.foreground }]}>{module.title}</Text>
                              <Text style={[styles.moduleDetail, { color: colors.mutedForeground }]}>{module.detail}</Text>
                              <Feather name="chevron-right" size={15} color={colors.mutedForeground} />
                            </TouchableOpacity>
                          ))
                        )}
                        {course.disclaimer ? (
                          <View style={[styles.disclaimer, { backgroundColor: `${course.color}10` }]}>
                            <Feather name="info" size={14} color={course.color} />
                            <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>{course.disclaimer}</Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                );
              })}
            </Animated.View>
          ))}

          {filteredCategories.length === 0 && (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
                <Feather name="search" size={22} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {showSavedOnly ? 'No saved courses yet' : 'No courses found'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {showSavedOnly ? 'Open a course and tap the bookmark to save it.' : 'Try another search term.'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 30, lineHeight: 38, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.6 },
  bookmarkButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 13.5, fontFamily: 'Manrope_500Medium', marginTop: 1, marginBottom: 14 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 46,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Manrope_500Medium', outlineStyle: 'none' } as never,
  journeysSection: { marginTop: 24 },
  sectionTitleRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  swipeLabel: { fontSize: 9.5, letterSpacing: 1, fontFamily: 'Manrope_800ExtraBold' },
  journeyList: { paddingHorizontal: 20, gap: 12 },
  journeyCard: { width: 250, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  journeyHero: { height: 110, padding: 14, justifyContent: 'flex-end' },
  journeyEyebrow: { color: 'rgba(255,255,255,0.75)', fontSize: 9, letterSpacing: 1, fontFamily: 'Manrope_800ExtraBold' },
  journeyTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: 'Manrope_800ExtraBold', marginTop: 4 },
  comingSoonBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  comingSoonBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    letterSpacing: 0.8,
    fontFamily: 'Manrope_800ExtraBold',
  },
  comingSoonHint: { fontSize: 10.5, fontFamily: 'Manrope_600SemiBold', marginTop: 8 },
  journeyFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12 },
  journeyFooterText: { flex: 1 },
  journeyDetail: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  journeyProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  journeyProgressBar: { flex: 1, minWidth: 0 },
  journeyProgressLabel: { fontSize: 10, fontFamily: 'Manrope_700Bold', minWidth: 30, textAlign: 'right' },
  curriculumHeader: { paddingHorizontal: 20, marginTop: 28, marginBottom: 12 },
  curriculumHint: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  categories: { paddingHorizontal: 20, gap: 18 },
  categorySection: { gap: 10 },
  categoryHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryLabel: { fontSize: 12, letterSpacing: 1, fontFamily: 'Manrope_800ExtraBold' },
  categoryCount: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  courseCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 },
  courseIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  courseText: { flex: 1 },
  courseTitle: { fontSize: 14.5, fontFamily: 'Manrope_700Bold' },
  courseMeta: { fontSize: 10.5, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  expandButton: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleList: { borderTopWidth: 1, paddingHorizontal: 12, paddingBottom: 10 },
  moduleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  moduleNumber: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { fontSize: 11, fontFamily: 'Manrope_800ExtraBold' },
  moduleTitle: { flex: 1, fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  moduleDetail: { fontSize: 10, fontFamily: 'Manrope_500Medium' },
  disclaimer: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 10, marginTop: 4 },
  disclaimerText: { flex: 1, fontSize: 10, lineHeight: 15, fontFamily: 'Manrope_500Medium' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  emptyText: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
});
