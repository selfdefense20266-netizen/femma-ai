import React, { useMemo, useState } from 'react';
import {
  Platform,
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

type CourseModule = {
  title: string;
  detail: string;
};

type Course = {
  id: string;
  title: string;
  meta: string;
  icon: keyof typeof Feather.glyphMap;
  color: string;
  route: string;
  modules: CourseModule[];
  disclaimer?: string;
};

type Category = {
  id: string;
  label: string;
  color: string;
  courses: Course[];
};

type Journey = {
  id: string;
  eyebrow: string;
  title: string;
  detail: string;
  colors: [string, string];
  route: string;
  progress?: number;
};

const JOURNEYS: Journey[] = [
  {
    id: 'new-mom',
    eyebrow: 'RECOVERY',
    title: 'New Mom Recovery',
    detail: 'Postpartum + Nutrition + Yoga',
    colors: ['#FF928F', '#F26BB5'],
    route: '/cycle',
  },
  {
    id: 'confidence-safety',
    eyebrow: 'ACTIVE JOURNEY',
    title: 'Confidence & Safety',
    detail: 'Self-Defense + Confidence Drills',
    colors: ['#B9A7F2', '#F26BB5'],
    route: '/safety',
    progress: 35,
  },
  {
    id: 'fat-loss',
    eyebrow: '30 DAYS',
    title: '30-Day Fat Loss Kickstart',
    detail: 'Fat Loss + Diet + Meal Planner',
    colors: ['#F26BB5', '#D94A9A'],
    route: '/fitness',
  },
  {
    id: 'cycle-aligned',
    eyebrow: 'LIFESTYLE',
    title: 'Cycle-Aligned Living',
    detail: 'Cycle Sync + phase-matched fitness',
    colors: ['#77CDED', '#B9A7F2'],
    route: '/cycle',
  },
];

const CATEGORIES: Category[] = [
  {
    id: 'safety',
    label: 'SAFETY',
    color: '#B9A7F2',
    courses: [
      {
        id: 'self-defense',
        title: 'Self-Defense',
        meta: '3 Modules • 12 Lessons',
        icon: 'shield',
        color: '#B9A7F2',
        route: '/safety/self-defense',
        modules: [
          { title: 'Foundations', detail: '4 lessons' },
          { title: 'Core Techniques', detail: '4 lessons' },
          { title: 'Real-World Application', detail: '4 lessons' },
        ],
        disclaimer:
          'Educational content only. This course is not a substitute for in-person self-defense training.',
      },
      {
        id: 'confidence-drills',
        title: 'Confidence Drills',
        meta: '3 Modules • 9 Lessons',
        icon: 'zap',
        color: '#FFB7C5',
        route: '/safety/confidence-drills',
        modules: [
          { title: 'Mindset Foundations', detail: '3 lessons' },
          { title: 'Assertiveness Training', detail: '3 lessons' },
          { title: 'Applied Confidence', detail: '3 lessons' },
        ],
      },
    ],
  },
  {
    id: 'fitness',
    label: 'FITNESS',
    color: '#F26BB5',
    courses: [
      {
        id: 'fat-loss',
        title: 'Fat Loss',
        meta: '3 Modules • 9 Lessons',
        icon: 'activity',
        color: '#F26BB5',
        route: '/fitness/fat-loss',
        modules: [
          { title: 'Foundations', detail: '3 lessons' },
          { title: 'Building Momentum', detail: '3 lessons' },
          { title: 'Advanced', detail: '3 lessons' },
        ],
      },
      {
        id: 'sculpt',
        title: 'Sculpt',
        meta: '3 Modules • 9 Lessons',
        icon: 'target',
        color: '#FF928F',
        route: '/fitness/sculpt',
        modules: [
          { title: 'Foundations', detail: '3 lessons' },
          { title: 'Building', detail: '3 lessons' },
          { title: 'Advanced', detail: '3 lessons' },
        ],
      },
      {
        id: 'strength',
        title: 'Strength',
        meta: '3 Modules • 9 Lessons',
        icon: 'trending-up',
        color: '#B9A7F2',
        route: '/fitness/strength',
        modules: [
          { title: 'Foundations', detail: '3 lessons' },
          { title: 'Building', detail: '3 lessons' },
          { title: 'Advanced', detail: '3 lessons' },
        ],
      },
      {
        id: 'yoga',
        title: 'Yoga',
        meta: '3 Modules • 9 Lessons',
        icon: 'wind',
        color: '#77CDED',
        route: '/fitness/yoga',
        modules: [
          { title: 'Foundations', detail: '3 lessons' },
          { title: 'Building', detail: '3 lessons' },
          { title: 'Advanced', detail: '3 lessons' },
        ],
      },
    ],
  },
  {
    id: 'pregnancy-cycle',
    label: 'PREGNANCY, POSTPARTUM & CYCLE',
    color: '#FF928F',
    courses: [
      {
        id: 'cycle-sync',
        title: 'Cycle Sync',
        meta: '3 Modules • 10 Lessons',
        icon: 'refresh-cw',
        color: '#B9A7F2',
        route: '/cycle',
        modules: [
          { title: 'Understanding Your Cycle', detail: '2 lessons' },
          { title: 'Phase-by-Phase Guide', detail: '4 lessons' },
          { title: 'Applying It', detail: '4 lessons' },
        ],
      },
      {
        id: 'pregnancy',
        title: 'Pregnancy',
        meta: '3 Modules • 9 Lessons',
        icon: 'sun',
        color: '#FF928F',
        route: '/cycle',
        modules: [
          { title: 'First Trimester', detail: '3 lessons' },
          { title: 'Second Trimester', detail: '3 lessons' },
          { title: 'Third Trimester', detail: '3 lessons' },
        ],
        disclaimer:
          'Get clearance from your doctor or midwife before starting or continuing an exercise program.',
      },
      {
        id: 'postpartum',
        title: 'Postpartum',
        meta: '3 Modules • 9 Lessons',
        icon: 'heart',
        color: '#FFB7C5',
        route: '/cycle',
        modules: [
          { title: 'Early Recovery (0–6 weeks)', detail: '3 lessons' },
          { title: 'Rebuilding (6–12 weeks)', detail: '3 lessons' },
          { title: 'Returning to Fitness (12+ weeks)', detail: '3 lessons' },
        ],
        disclaimer:
          'Get clearance from your doctor or midwife before starting or continuing an exercise program.',
      },
    ],
  },
  {
    id: 'nutrition',
    label: 'NUTRITION',
    color: '#6FCBAB',
    courses: [
      {
        id: 'diet',
        title: 'Diet',
        meta: '3 Modules • 9 Lessons',
        icon: 'coffee',
        color: '#6FCBAB',
        route: '/nutrition',
        modules: [
          { title: 'Nutrition Basics', detail: '3 lessons' },
          { title: 'Diet Approaches', detail: '3 lessons' },
          { title: 'Sustainable Habits', detail: '3 lessons' },
        ],
      },
      {
        id: 'meal-scanner',
        title: 'Meal Scanner',
        meta: '4 Tutorials',
        icon: 'camera',
        color: '#FFD88A',
        route: '/scan-food',
        modules: [{ title: 'Feature Tutorials', detail: '4 videos' }],
      },
      {
        id: 'meal-planner',
        title: 'Meal Planner',
        meta: '4 Tutorials',
        icon: 'calendar',
        color: '#F26BB5',
        route: '/nutrition',
        modules: [{ title: 'Feature Tutorials', detail: '4 videos' }],
      },
      {
        id: 'recipes',
        title: 'Recipes',
        meta: '4 Collections • 16+ Videos',
        icon: 'book-open',
        color: '#77CDED',
        route: '/recipe',
        modules: [
          { title: 'Breakfast', detail: '4+ videos' },
          { title: 'Lunch & Dinner', detail: '4+ videos' },
          { title: 'Snacks', detail: '4+ videos' },
          { title: 'Healthy Swaps & Treats', detail: '4+ videos' },
        ],
      },
    ],
  },
];

function vibrate() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

export default function ExploreScreen() {
  const colors = useColors();
  const { savedCourseIds } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 58 : insets.top + 12;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [query, setQuery] = useState('');
  const [expandedCourse, setExpandedCourse] = useState('self-defense');
  const [showSavedOnly, setShowSavedOnly] = useState(false);

  const filteredCategories = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return CATEGORIES.map((category) => ({
      ...category,
      courses: category.courses.filter((course) => {
        if (showSavedOnly && !savedCourseIds.includes(course.id)) return false;
        if (!normalized) return true;
        return [course.title, course.meta, ...course.modules.map((module) => module.title)]
          .join(' ')
          .toLowerCase()
          .includes(normalized);
      }),
    })).filter((category) => category.courses.length > 0);
  }, [query, savedCourseIds, showSavedOnly]);

  const toggleCourse = (courseId: string) => {
    vibrate();
    setExpandedCourse((current) => (current === courseId ? '' : courseId));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 110 }}
      >
        <View style={[styles.header, { paddingTop: topPad }]}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.foreground }]}>Explore</Text>
            <TouchableOpacity
              accessibilityLabel="Saved courses"
              onPress={() => setShowSavedOnly(current => !current)}
              style={[styles.bookmarkButton, {
                backgroundColor: showSavedOnly ? `${colors.primary}18` : colors.card,
                borderColor: showSavedOnly ? colors.primary : colors.border,
              }]}
            >
              <Feather name="bookmark" size={20} color={showSavedOnly ? colors.primary : colors.foreground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Your journey from beginner to unstoppable.
          </Text>
          <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="search" size={18} color={colors.mutedForeground} />
            <TextInput
              style={[styles.searchInput, { color: colors.foreground }]}
              placeholder="Search courses, recipes, or tools…"
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.journeyList}
            >
              {JOURNEYS.map((journey) => (
                <TouchableOpacity
                  key={journey.id}
                  activeOpacity={0.88}
                  style={[styles.journeyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => {
                    vibrate();
                    router.push(journey.route as never);
                  }}
                >
                  <LinearGradient colors={journey.colors} style={styles.journeyHero}>
                    <Text style={styles.journeyEyebrow}>{journey.eyebrow}</Text>
                    <Text style={styles.journeyTitle}>{journey.title}</Text>
                  </LinearGradient>
                  <View style={styles.journeyFooter}>
                    <View style={styles.journeyFooterText}>
                      <Text numberOfLines={1} style={[styles.journeyDetail, { color: colors.mutedForeground }]}>
                        {journey.detail}
                      </Text>
                      {journey.progress != null && (
                        <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
                          <View style={[styles.progressFill, { width: `${journey.progress}%`, backgroundColor: colors.primary }]} />
                        </View>
                      )}
                    </View>
                    <Feather
                      name={journey.progress != null ? 'play' : 'chevron-right'}
                      size={17}
                      color={colors.primary}
                    />
                  </View>
                </TouchableOpacity>
              ))}
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
                    <TouchableOpacity
                      activeOpacity={0.82}
                      onPress={() => toggleCourse(course.id)}
                      style={styles.courseHeader}
                    >
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
                        {course.modules.map((module, moduleIndex) => (
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
                        ))}
                        {course.disclaimer && (
                          <View style={[styles.disclaimer, { backgroundColor: `${course.color}10` }]}>
                            <Feather name="info" size={14} color={course.color} />
                            <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                              {course.disclaimer}
                            </Text>
                          </View>
                        )}
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
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>{showSavedOnly ? 'No saved courses yet' : 'No courses found'}</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{showSavedOnly ? 'Open a course and tap the bookmark to save it.' : 'Try a course, module, or tool name.'}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.2 },
  swipeLabel: { fontSize: 9.5, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 1.1 },
  journeyList: { paddingHorizontal: 20, paddingBottom: 8, gap: 12 },
  journeyCard: {
    width: 280,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#F26BB5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 2,
  },
  journeyHero: { height: 108, padding: 15, justifyContent: 'flex-end' },
  journeyEyebrow: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1,
    marginBottom: 3,
  },
  journeyTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  journeyFooter: { minHeight: 48, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  journeyFooterText: { flex: 1 },
  journeyDetail: { fontSize: 10.5, fontFamily: 'Manrope_600SemiBold' },
  progressTrack: { height: 4, borderRadius: 4, overflow: 'hidden', marginTop: 6 },
  progressFill: { height: '100%', borderRadius: 4 },
  curriculumHeader: { paddingHorizontal: 20, marginTop: 24, marginBottom: 16 },
  curriculumHint: { fontSize: 11.5, fontFamily: 'Manrope_500Medium', marginTop: 2 },
  categories: { paddingHorizontal: 20 },
  categorySection: { marginBottom: 24 },
  categoryHeading: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  categoryLabel: { flexShrink: 1, fontSize: 11.5, fontFamily: 'Manrope_800ExtraBold', letterSpacing: 0.9 },
  categoryCount: { fontSize: 10.5, fontFamily: 'Manrope_600SemiBold', textTransform: 'capitalize' },
  courseCard: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#17181C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.025,
    shadowRadius: 7,
    elevation: 1,
  },
  courseHeader: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13 },
  courseIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  courseText: { flex: 1 },
  courseTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  courseMeta: { fontSize: 10.8, fontFamily: 'Manrope_600SemiBold', marginTop: 2 },
  expandButton: { width: 28, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  moduleList: { borderTopWidth: 1, paddingHorizontal: 13, paddingTop: 7, paddingBottom: 11 },
  moduleRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  moduleNumber: { width: 24, height: 24, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  moduleNumberText: { fontSize: 10.5, fontFamily: 'Manrope_800ExtraBold' },
  moduleTitle: { flex: 1, fontSize: 12.2, fontFamily: 'Manrope_600SemiBold' },
  moduleDetail: { fontSize: 10.2, fontFamily: 'Manrope_500Medium' },
  disclaimer: { flexDirection: 'row', gap: 8, borderRadius: 12, padding: 10, marginTop: 5, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 9.6, lineHeight: 14, fontFamily: 'Manrope_500Medium' },
  emptyState: { alignItems: 'center', paddingVertical: 52 },
  emptyIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  emptyText: { fontSize: 12, fontFamily: 'Manrope_500Medium', marginTop: 3 },
});
