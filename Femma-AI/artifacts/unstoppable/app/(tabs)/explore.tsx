import React, { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AppLoading from '@/components/AppLoading';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useCatalog } from '@/hooks/useCatalog';
import { useJourneys } from '@/hooks/useJourneys';
import { getCourseLessons, courseProgressPercent, libraryPath, type CatalogBundle } from '@/lib/catalog';
import ProgressBar from '@/components/ProgressBar';

function vibrate() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

function journeyProgress(
  catalog: CatalogBundle,
  courseIds: string[],
  completedLessonIds: string[],
  lessonWatchProgress: Record<string, number>
) {
  const journeyCourses = catalog.courses.filter((course) => courseIds.includes(course.id));
  const lessons = journeyCourses.flatMap(getCourseLessons);
  const total = lessons.length;
  if (!total) return { percent: 0, completed: 0, total: 0, firstCourse: journeyCourses[0] };
  const completed = lessons.filter((lesson) => completedLessonIds.includes(lesson.id)).length;
  return {
    percent: courseProgressPercent(lessons, completedLessonIds, lessonWatchProgress),
    completed,
    total,
    firstCourse: journeyCourses[0],
  };
}

export default function ExploreScreen() {
  const colors = useColors();
  const { savedCourseIds, completedLessonIds, lessonWatchProgress } = useApp();
  const { data: catalog, isLoading, error, refetch } = useCatalog();
  const { data: journeyRows, refetch: refetchJourneys } = useJourneys();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [query, setQuery] = useState('');
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), refetchJourneys()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetch, refetchJourneys]);

  const journeys = useMemo(() => {
    if (!catalog || !journeyRows) return [];
    return journeyRows.map((journey) => {
      const progress = journeyProgress(catalog, journey.courseIds, completedLessonIds, lessonWatchProgress);
      const route = progress.firstCourse
        ? libraryPath(progress.firstCourse.categoryId, progress.firstCourse.id)
        : '/(tabs)/explore';
      return {
        ...journey,
        route,
        progress: progress.percent,
        progressLabel: progress.total ? `${progress.completed}/${progress.total}` : 'Coming soon',
        hasLessons: progress.total > 0,
      };
    });
  }, [catalog, journeyRows, completedLessonIds, lessonWatchProgress]);

  const categories = useMemo(() => {
    if (!catalog) return [];

    const mapCourse = (categoryId: string, course: (typeof catalog.courses)[number]) => {
      const lessons = getCourseLessons(course);
      return {
        id: course.id,
        title: course.title,
        meta: `${course.modules.length} Modules • ${lessons.length} Lessons`,
        icon: course.icon,
        color: course.color,
        imageUrl: course.imageUrl,
        route: libraryPath(categoryId, course.id),
        modules: course.modules.map((module) => ({
          title: module.title,
          detail: `${module.lessons.length} lessons`,
        })),
        disclaimer: course.disclaimer,
      };
    };

    // Fold Self Defence courses into Fitness so Explore shows one combined section.
    const selfDefence = catalog.categories.find((c) => c.id === 'self-defence');
    const mapped = catalog.categories
      .filter((category) => category.id !== 'self-defence')
      .map((category) => {
        const courses =
          category.id === 'fitness' && selfDefence
            ? [
                ...selfDefence.courses.map((course) => mapCourse(selfDefence.id, course)),
                ...category.courses.map((course) => mapCourse(category.id, course)),
              ]
            : category.courses.map((course) => mapCourse(category.id, course));

        return {
          id: category.id,
          label: category.title.toUpperCase(),
          color: category.color,
          courses,
        };
      });

    return mapped;
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

  if (isLoading) {
    return <AppLoading />;
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
                    {journey.imageUrl ? (
                      <ImageBackground
                        source={{ uri: journey.imageUrl }}
                        style={styles.journeyHero}
                        imageStyle={styles.journeyHeroImage}
                      >
                        <View style={styles.journeyHeroOverlay} />
                        <View style={styles.journeyHeroContent}>
                          <Text style={styles.journeyEyebrow}>{journey.eyebrow}</Text>
                          <Text style={styles.journeyTitle}>{journey.title}</Text>
                          {comingSoon && (
                            <View style={styles.comingSoonBadge}>
                              <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                            </View>
                          )}
                        </View>
                      </ImageBackground>
                    ) : (
                      <LinearGradient colors={journey.colors} style={styles.journeyHero}>
                        <Text style={styles.journeyEyebrow}>{journey.eyebrow}</Text>
                        <Text style={styles.journeyTitle}>{journey.title}</Text>
                        {comingSoon && (
                          <View style={styles.comingSoonBadge}>
                            <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
                          </View>
                        )}
                      </LinearGradient>
                    )}
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

              <View style={[styles.courseList, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {category.courses.map((course, courseIndex) => (
                  <TouchableOpacity
                    key={course.id}
                    activeOpacity={0.7}
                    style={[
                      styles.courseRow,
                      courseIndex < category.courses.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                    ]}
                    onPress={() => {
                      vibrate();
                      router.push(course.route as never);
                    }}
                  >
                    {course.imageUrl ? (
                      <Image source={{ uri: course.imageUrl }} style={styles.courseIcon} contentFit="contain" />
                    ) : (
                      <View style={[styles.courseIcon, { backgroundColor: `${course.color}18` }]}>
                        <Feather name={course.icon} size={20} color={course.color} />
                      </View>
                    )}
                    <View style={styles.courseText}>
                      <Text style={[styles.courseTitle, { color: colors.foreground }]}>{course.title}</Text>
                      <Text style={[styles.courseMeta, { color: colors.mutedForeground }]}>{course.meta}</Text>
                    </View>
                    <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
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
  container: { flex: 1, width: '100%', overflow: 'hidden' },
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
  journeyHeroImage: { resizeMode: 'contain' },
  journeyHeroOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  journeyHeroContent: { justifyContent: 'flex-end', flex: 1 },
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
  courseList: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  courseRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12 },
  courseIcon: { width: 64, height: 64, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  courseText: { flex: 1 },
  courseTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  courseMeta: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  emptyTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  emptyText: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 2 },
});
