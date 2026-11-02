import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Pressable,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  useApp,
  CYCLE_PHASE_INFO,
  phaseFromCycleDay,
  cycleUpdateForDay,
  type CyclePhase,
} from '@/context/AppContext';
import { BrandLogo } from '@/components/BrandLogo';
import { useCatalog } from '@/hooks/useCatalog';
import { libraryPath, type VideoCourse } from '@/lib/catalog';

const PERIOD_PINK = '#FF6B8A';
const HEADER_PINK = '#FCD6DE';
const CARD_BLUE = '#D7EEF8';
const CARD_LAVENDER = '#E4D9F8';
const CYCLE_LOGS_KEY = 'cycle_daily_logs';

const SYMPTOM_OPTIONS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Mood swings',
  'Acne',
  'Back pain',
  'Cravings',
  'Tender breasts',
  'Nausea',
  'Insomnia',
  'Spotting',
] as const;

const EXPECTED: Record<Exclude<CyclePhase, 'none'>, string[]> = {
  menstrual: ['Cramps', 'Fatigue', 'Back pain', 'Mood swings', 'Cravings'],
  follicular: ['Higher energy', 'Clearer skin', 'Better mood', 'Motivation'],
  ovulation: ['Peak energy', 'Libido up', 'Mild twinges', 'Clear skin'],
  luteal: ['Bloating', 'Cravings', 'Mood swings', 'Tender breasts', 'Fatigue'],
};

const PHASE_DETAIL: Record<
  CyclePhase,
  { title: string; body: string; focus: string[]; tags: string[] }
> = {
  menstrual: {
    title: 'During your period',
    body: 'Hormones are at their lowest. Prefer rest, warmth, hydration, and gentle movement. Heavy training can wait — comfort comes first.',
    focus: ['Rest & recovery', 'Warm meals + iron', 'Light stretch or walk'],
    tags: ['period', 'rest', 'cramps', 'recovery'],
  },
  follicular: {
    title: 'Follicular phase',
    body: 'Energy and mood usually rise after your period. This is a strong window to build fitness, try new workouts, and stay consistent.',
    focus: ['Strength training', 'Skill practice', 'Protein-rich meals'],
    tags: ['follicular', 'strength', 'energy', 'fitness'],
  },
  ovulation: {
    title: 'Ovulation window',
    body: 'Many people feel peak energy and confidence here. If you feel good, use it for harder sessions — and still listen to your body.',
    focus: ['Higher intensity', 'Cardio or HIIT', 'Stay hydrated'],
    tags: ['ovulation', 'energy', 'cardio', 'hiit'],
  },
  luteal: {
    title: 'Luteal phase',
    body: 'Energy can dip and PMS symptoms may show up. Keep moving, but ease intensity. Sleep, magnesium-rich foods, and yoga help.',
    focus: ['Steady strength', 'Yoga & breath', 'Sleep & snacks'],
    tags: ['luteal', 'pms', 'yoga', 'sleep'],
  },
  none: {
    title: 'Start tracking',
    body: 'Set your cycle day to unlock phase tips, period highlighting, and yoga or courses matched to where you are.',
    focus: ['Pick today’s cycle day', 'Log symptoms', 'Open related yoga'],
    tags: ['cycle', 'tips', 'yoga'],
  },
};

/** Prefer these catalog course ids when present; otherwise keyword match. */
const COURSE_IDS_BY_PHASE: Record<CyclePhase, string[]> = {
  menstrual: ['cph-menstrual-cycle', 'cph-recovery-wellness', 'fit-yoga', 'fit-mobility', 'dn-hydration'],
  follicular: ['fit-strength', 'fit-foundations', 'fit-yoga', 'cph-menstrual-cycle'],
  ovulation: ['fit-hiit', 'fit-cardio', 'fit-endurance', 'fit-yoga'],
  luteal: ['fit-yoga', 'fit-pilates', 'cph-recovery-wellness', 'dn-hydration', 'fit-mobility'],
  none: ['cph-menstrual-cycle', 'fit-yoga', 'cph-recovery-wellness'],
};

const COURSE_KEYWORDS_BY_PHASE: Record<CyclePhase, string[]> = {
  menstrual: ['menstrual', 'cycle', 'yoga', 'mobility', 'recovery', 'hydrat'],
  follicular: ['strength', 'foundation', 'yoga', 'cycle'],
  ovulation: ['hiit', 'cardio', 'endurance', 'yoga'],
  luteal: ['yoga', 'pilates', 'recovery', 'hydrat', 'mobility'],
  none: ['cycle', 'yoga', 'pregnancy', 'recovery'],
};

function coursesForPhase(phase: CyclePhase, all: VideoCourse[]): VideoCourse[] {
  if (!all.length) return [];
  const preferred = COURSE_IDS_BY_PHASE[phase] || [];
  const byId = preferred
    .map((id) => all.find((c) => c.id === id))
    .filter((c): c is VideoCourse => Boolean(c));
  if (byId.length >= 3) return byId.slice(0, 4);

  const keywords = COURSE_KEYWORDS_BY_PHASE[phase] || [];
  const matched = all.filter((course) => {
    const hay = `${course.id} ${course.title} ${course.description} ${course.categoryId}`.toLowerCase();
    return keywords.some((k) => hay.includes(k));
  });
  const seen = new Set(byId.map((c) => c.id));
  for (const course of matched) {
    if (seen.has(course.id)) continue;
    byId.push(course);
    seen.add(course.id);
    if (byId.length >= 4) break;
  }
  return byId.slice(0, 4);
}

type DayLog = {
  mood?: string;
  energy?: string;
  symptoms?: string[];
};

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function daysBetween(from: Date, to: Date) {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / 86400000);
}

function cycleDayForOffset(cycleDay: number, offset: number) {
  const base = Math.max(1, cycleDay || 1);
  return ((base - 1 + offset) % 28 + 28) % 28 + 1;
}

function isPeriodCycleDay(day: number) {
  return day >= 1 && day <= 5;
}

function monthTitle(date: Date) {
  return date.toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function statusHeadline(phase: CyclePhase, day: number, tracking: boolean) {
  if (!tracking) return { label: 'Not tracking', value: 'Set your day' };
  if (phase === 'menstrual') return { label: 'Period:', value: `Day ${day}` };
  if (phase === 'follicular') return { label: 'Follicular:', value: `Day ${day}` };
  if (phase === 'ovulation') return { label: 'Ovulation:', value: `Day ${day}` };
  return { label: 'Luteal:', value: `Day ${day}` };
}

export default function CycleScreen() {
  const { profile, updateProfile } = useApp();
  const { data: catalog } = useCatalog();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 6;
  const botPad = Math.max(insets.bottom, 16);
  const tracking = profile.cyclePhase !== 'none';

  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});
  const [editOpen, setEditOpen] = useState(!tracking);
  const [symptomsOpen, setSymptomsOpen] = useState(false);
  const [expectOpen, setExpectOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [draftSymptoms, setDraftSymptoms] = useState<string[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(CYCLE_LOGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, DayLog>;
        if (parsed && typeof parsed === 'object') setLogs(parsed);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!tracking) setEditOpen(true);
  }, [tracking]);

  const stripDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - 3 + i);
        const key = dateKey(date);
        const offset = daysBetween(today, date);
        const cDay = tracking ? cycleDayForOffset(profile.cycleDay, offset) : 0;
        return {
          key,
          date,
          dateNum: date.getDate(),
          isToday: key === dateKey(today),
          cycleDay: cDay,
          isPeriod: tracking && isPeriodCycleDay(cDay),
        };
      }),
    [today, tracking, profile.cycleDay]
  );

  const offset = daysBetween(today, selectedDate);
  const previewDay = tracking ? cycleDayForOffset(profile.cycleDay, offset) : 0;
  const previewPhase: CyclePhase = tracking ? phaseFromCycleDay(previewDay) : 'none';
  const phaseInfo = CYCLE_PHASE_INFO[previewPhase] || CYCLE_PHASE_INFO.none;
  const selectedKey = dateKey(selectedDate);
  const selectedLog = logs[selectedKey] || {};
  const isTodaySelected = selectedKey === dateKey(today);
  const headline = statusHeadline(previewPhase, previewDay, tracking);
  const expectedSymptoms =
    previewPhase === 'none' ? [] : EXPECTED[previewPhase as Exclude<CyclePhase, 'none'>];

  const phaseDetail = PHASE_DETAIL[previewPhase] || PHASE_DETAIL.none;

  const relatedCourses = useMemo(() => {
    const list = coursesForPhase(previewPhase, catalog?.courses || []);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c) =>
      `${c.title} ${c.description} ${c.shortTitle} course`.toLowerCase().includes(q)
    );
  }, [previewPhase, catalog?.courses, search]);

  const showPhaseDetail = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${phaseDetail.title} ${phaseDetail.body} ${phaseDetail.tags.join(' ')}`.toLowerCase().includes(q);
  }, [search, phaseDetail]);

  const persistLogs = (next: Record<string, DayLog>) => {
    setLogs(next);
    void AsyncStorage.setItem(CYCLE_LOGS_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const applyCycleDay = (day: number) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    updateProfile(cycleUpdateForDay(day));
    setSelectedDate(today);
    setEditOpen(false);
  };

  const markPeriodStartedOnSelected = () => {
    Alert.alert(
      'Log period start?',
      `Set ${monthTitle(selectedDate)} as Day 1 (period start). Today will update automatically.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log',
          onPress: () => {
            const shift = daysBetween(selectedDate, today);
            applyCycleDay(cycleDayForOffset(1, shift));
          },
        },
      ]
    );
  };

  const openSymptoms = () => {
    setDraftSymptoms(selectedLog.symptoms || []);
    setSymptomsOpen(true);
  };

  const saveSymptoms = () => {
    persistLogs({
      ...logs,
      [selectedKey]: { ...logs[selectedKey], symptoms: draftSymptoms },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSymptomsOpen(false);
  };

  const stopTracking = () => {
    Alert.alert('Stop cycle tracking?', 'Your logged symptoms stay on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Stop',
        style: 'destructive',
        onPress: () => {
          updateProfile({ cyclePhase: 'none', cycleDay: 0, cycleAnchorDate: '' });
          setEditOpen(true);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: '#FFFFFF' }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 28 }}
        keyboardShouldPersistTaps="handled"
      >
        <LinearGradient colors={[HEADER_PINK, '#FFE8EE', '#FFFFFF']} locations={[0, 0.55, 1]} style={styles.hero}>
          <View style={[styles.topBar, { paddingTop: topPad }]}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.topIconBtn}>
              <Feather name="chevron-left" size={24} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthTitle(selectedDate)}</Text>
            <TouchableOpacity
              style={styles.topIconBtn}
              onPress={() => setEditOpen(true)}
              hitSlop={12}
            >
              <Feather name="calendar" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          </View>

          <View style={styles.dateStrip}>
            {stripDays.map((day) => {
              const selected = day.key === selectedKey;
              return (
                <TouchableOpacity
                  key={day.key}
                  style={styles.dateCol}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSelectedDate(day.date);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.todayLabel, { opacity: day.isToday ? 1 : 0 }]}>TODAY</Text>
                  <View
                    style={[
                      styles.dateCircle,
                      day.isPeriod && styles.dateCirclePeriod,
                      selected && day.isPeriod && styles.dateCircleSelectedPeriod,
                      selected && !day.isPeriod && styles.dateCircleSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dateNum,
                        // White only on pink period fill; selected non-period stays dark on white.
                        day.isPeriod ? styles.dateNumOnPink : styles.dateNumDark,
                      ]}
                    >
                      {day.dateNum}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <Animated.View entering={FadeInDown.duration(400)} style={styles.statusBlock}>
            <Text style={styles.statusLine}>
              <Text style={styles.statusLabel}>{headline.label} </Text>
              <Text style={styles.statusValue}>{headline.value}</Text>
            </Text>
            {tracking ? (
              <Text style={styles.statusSub}>
                {isTodaySelected ? 'Today' : monthTitle(selectedDate)} · {phaseInfo.name} phase
              </Text>
            ) : (
              <Text style={styles.statusSub}>Set your cycle day to unlock tips and period days</Text>
            )}
            <TouchableOpacity
              style={styles.editPeriodBtn}
              onPress={() => setEditOpen(true)}
              activeOpacity={0.88}
            >
              <Text style={styles.editPeriodText}>Edit period dates</Text>
            </TouchableOpacity>
          </Animated.View>
        </LinearGradient>

        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(80).duration(400)}>
            <Text style={styles.sectionTitle}>
              My daily insights · {isTodaySelected ? 'Today' : monthTitle(selectedDate)}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.insightRow}
            >
              <TouchableOpacity style={styles.insightCard} onPress={openSymptoms} activeOpacity={0.9}>
                <Text style={styles.insightTitle}>
                  {(selectedLog.symptoms?.length || 0) > 0
                    ? `${selectedLog.symptoms!.length} symptom${selectedLog.symptoms!.length === 1 ? '' : 's'} logged`
                    : 'Log your symptoms'}
                </Text>
                <View style={styles.insightPlus}>
                  <Feather name="plus" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.insightCard, { backgroundColor: CARD_BLUE }]}
                onPress={() => setExpectOpen(true)}
                activeOpacity={0.9}
              >
                <Text style={styles.insightTitle}>Symptoms to expect</Text>
                <View style={styles.insightHeartWrap}>
                  <Feather name="heart" size={16} color={PERIOD_PINK} />
                </View>
              </TouchableOpacity>

              <View style={[styles.insightCard, styles.cycleDayCard, { backgroundColor: CARD_LAVENDER }]}>
                <Text style={styles.cycleDayLabel}>Cycle day</Text>
                <View style={styles.cycleDayBubble}>
                  <Text style={styles.cycleDayNum}>{tracking ? previewDay : '—'}</Text>
                </View>
              </View>
            </ScrollView>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(140).duration(400)} style={{ gap: 14 }}>
            <Text style={styles.sectionTitle}>
              For you · {tracking ? (previewPhase === 'menstrual' ? 'During period' : phaseInfo.name) : 'Tips'}
            </Text>
            <View style={styles.searchBar}>
              <Feather name="search" size={18} color="#8A8A8A" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search yoga, courses and tips"
                placeholderTextColor="#9A9A9A"
                style={styles.searchInput}
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
                  <Feather name="x" size={16} color="#8A8A8A" />
                </TouchableOpacity>
              ) : null}
            </View>

            {showPhaseDetail ? (
              <View style={styles.detailCard}>
                <Text style={styles.detailEyebrow}>Phase guide</Text>
                <Text style={styles.detailTitle}>{phaseDetail.title}</Text>
                <Text style={styles.detailBody}>{phaseDetail.body}</Text>
                <View style={styles.focusRow}>
                  {phaseDetail.focus.map((item) => (
                    <View key={item} style={styles.focusChip}>
                      <Text style={styles.focusChipText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            <View style={{ gap: 10 }}>
              <View style={styles.subHeadRow}>
                <Text style={styles.subHead}>Related courses</Text>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.selectionAsync();
                    router.push(libraryPath('cycle') as never);
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.seeAll}>Library</Text>
                </TouchableOpacity>
              </View>
              {relatedCourses.length === 0 ? (
                <Text style={styles.emptySearch}>
                  {search.trim()
                    ? 'No courses match that search.'
                    : 'Course library will appear here when available.'}
                </Text>
              ) : (
                relatedCourses.map((course) => (
                  <TouchableOpacity
                    key={course.id}
                    style={styles.forYouCard}
                    activeOpacity={0.88}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push(libraryPath(course.categoryId, course.id) as never);
                    }}
                  >
                    <View style={[styles.itemIcon, { backgroundColor: course.color + '18' }]}>
                      <Feather name={course.icon} size={16} color={course.color} />
                    </View>
                    <View style={{ flex: 1, gap: 3 }}>
                      <Text style={styles.forYouTitle}>{course.title}</Text>
                      <Text style={styles.forYouBlurb} numberOfLines={2}>
                        {course.description || course.shortTitle || 'Open course modules and lessons.'}
                      </Text>
                    </View>
                    <Feather name="chevron-right" size={16} color="#A0A0A0" />
                  </TouchableOpacity>
                ))
              )}
            </View>

            {!showPhaseDetail && relatedCourses.length === 0 ? (
              <Text style={styles.emptySearch}>No matches. Try “period”, “yoga”, or “strength”.</Text>
            ) : null}
          </Animated.View>

          {tracking ? (
            <TouchableOpacity onPress={stopTracking} style={styles.stopBtn}>
              <Text style={styles.stopText}>Stop tracking</Text>
            </TouchableOpacity>
          ) : null}

          <View style={styles.brandFoot}>
            <BrandLogo size={22} layout="row" nameStyle={{ fontSize: 12 }} />
          </View>
        </View>
      </ScrollView>

      {/* Edit period / cycle day */}
      <Modal visible={editOpen} animationType="slide" transparent onRequestClose={() => tracking && setEditOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => tracking && setEditOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit period dates</Text>
            <Text style={styles.sheetHint}>
              Tap which day of your cycle you are on today (1–28). Days 1–5 are shown as period days on the calendar.
            </Text>
            <View style={styles.dayGrid}>
              {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => {
                const active = tracking && profile.cycleDay === day;
                const period = isPeriodCycleDay(day);
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayChip,
                      period && { backgroundColor: PERIOD_PINK + '22', borderColor: PERIOD_PINK + '55' },
                      active && { backgroundColor: PERIOD_PINK, borderColor: PERIOD_PINK },
                    ]}
                    onPress={() => applyCycleDay(day)}
                  >
                    <Text style={[styles.dayChipText, active && { color: '#FFFFFF' }]}>{day}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.secondaryBtn} onPress={markPeriodStartedOnSelected}>
              <Text style={styles.secondaryBtnText}>
                Period started on {monthTitle(selectedDate)}
              </Text>
            </TouchableOpacity>
            {tracking ? (
              <TouchableOpacity onPress={() => setEditOpen(false)} style={styles.cancelSheet}>
                <Text style={styles.cancelSheetText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Log symptoms */}
      <Modal visible={symptomsOpen} animationType="slide" transparent onRequestClose={() => setSymptomsOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setSymptomsOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Log your symptoms</Text>
            <Text style={styles.sheetHint}>For {monthTitle(selectedDate)}</Text>
            <View style={styles.symptomWrap}>
              {SYMPTOM_OPTIONS.map((symptom) => {
                const on = draftSymptoms.includes(symptom);
                return (
                  <TouchableOpacity
                    key={symptom}
                    style={[styles.symptomChip, on && styles.symptomChipOn]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDraftSymptoms((prev) =>
                        on ? prev.filter((s) => s !== symptom) : [...prev, symptom]
                      );
                    }}
                  >
                    <Text style={[styles.symptomChipText, on && { color: '#FFFFFF' }]}>{symptom}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={saveSymptoms}>
              <Text style={styles.primaryBtnText}>Save symptoms</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Symptoms to expect */}
      <Modal visible={expectOpen} animationType="fade" transparent onRequestClose={() => setExpectOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setExpectOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: 28 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Symptoms to expect</Text>
            <Text style={styles.sheetHint}>
              {tracking
                ? `Common during ${phaseInfo.name.toLowerCase()} (cycle day ${previewDay}).`
                : 'Start tracking to see phase-based expectations.'}
            </Text>
            {expectedSymptoms.length ? (
              <View style={styles.symptomWrap}>
                {expectedSymptoms.map((s) => (
                  <View key={s} style={[styles.symptomChip, styles.symptomChipOn]}>
                    <Text style={[styles.symptomChipText, { color: '#FFFFFF' }]}>{s}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptySearch}>Turn on tracking to see predictions.</Text>
            )}
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setExpectOpen(false)}>
              <Text style={styles.primaryBtnText}>Got it</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 28 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  topIconBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 17,
    fontFamily: 'Manrope_700Bold',
    color: '#1A1A1A',
  },
  dateStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginBottom: 22,
  },
  dateCol: { alignItems: 'center', width: 44, gap: 6 },
  todayLabel: {
    fontSize: 9,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#1A1A1A',
    letterSpacing: 0.4,
  },
  dateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dateCirclePeriod: { backgroundColor: PERIOD_PINK },
  dateCircleSelectedPeriod: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  dateCircleSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: PERIOD_PINK,
  },
  dateNum: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  dateNumDark: { color: '#1A1A1A' },
  dateNumOnPink: { color: '#FFFFFF' },
  statusBlock: { alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  statusLine: { textAlign: 'center' },
  statusLabel: { fontSize: 28, fontFamily: 'Manrope_500Medium', color: '#1A1A1A' },
  statusValue: { fontSize: 32, fontFamily: 'Manrope_800ExtraBold', color: '#111111' },
  statusSub: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#6B6B6B',
    textAlign: 'center',
  },
  editPeriodBtn: {
    marginTop: 10,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  editPeriodText: {
    fontSize: 14,
    fontFamily: 'Manrope_700Bold',
    color: PERIOD_PINK,
  },
  body: { paddingHorizontal: 20, gap: 18, marginTop: 4 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  insightRow: { gap: 12, paddingRight: 8 },
  insightCard: {
    width: 132,
    height: 150,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    padding: 14,
    justifyContent: 'space-between',
  },
  insightTitle: {
    fontSize: 15,
    fontFamily: 'Manrope_700Bold',
    color: '#1A1A1A',
    lineHeight: 20,
  },
  insightPlus: {
    alignSelf: 'center',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: PERIOD_PINK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightHeartWrap: {
    alignSelf: 'center',
    width: 40,
    height: 28,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cycleDayCard: { alignItems: 'center' },
  cycleDayLabel: {
    fontSize: 13,
    fontFamily: 'Manrope_600SemiBold',
    color: '#5A5A5A',
    alignSelf: 'flex-start',
  },
  cycleDayBubble: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  cycleDayNum: { fontSize: 34, fontFamily: 'Manrope_800ExtraBold', color: '#1A1A1A' },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F2F2F4',
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 48,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  emptySearch: {
    fontSize: 13,
    fontFamily: 'Manrope_500Medium',
    color: '#8A8A8A',
    textAlign: 'center',
    paddingVertical: 8,
  },
  detailCard: {
    backgroundColor: '#FFF5F7',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: PERIOD_PINK + '28',
  },
  detailEyebrow: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    color: PERIOD_PINK,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  detailTitle: { fontSize: 18, fontFamily: 'Manrope_800ExtraBold', color: '#1A1A1A' },
  detailBody: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#555', lineHeight: 19 },
  focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  focusChip: {
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  focusChipText: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', color: '#444' },
  subHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subHead: { fontSize: 14, fontFamily: 'Manrope_800ExtraBold', color: '#1A1A1A' },
  seeAll: { fontSize: 13, fontFamily: 'Manrope_700Bold', color: PERIOD_PINK },
  forYouCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  itemIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  forYouTitle: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#1A1A1A' },
  forYouBlurb: { fontSize: 12, fontFamily: 'Manrope_400Regular', color: '#6B6B6B', lineHeight: 17 },
  stopBtn: { alignSelf: 'center', paddingVertical: 8 },
  stopText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: '#A0A0A0' },
  brandFoot: { alignItems: 'center', opacity: 0.7, paddingTop: 4 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 36,
    gap: 12,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 4,
  },
  sheetTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', color: '#1A1A1A' },
  sheetHint: { fontSize: 13, fontFamily: 'Manrope_400Regular', color: '#6B6B6B', lineHeight: 19 },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dayChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E6E6E6',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F7F8',
  },
  dayChipText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#1A1A1A' },
  secondaryBtn: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: PERIOD_PINK + '55',
    backgroundColor: PERIOD_PINK + '12',
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: PERIOD_PINK },
  cancelSheet: { alignSelf: 'center', paddingVertical: 8 },
  cancelSheetText: { fontSize: 14, fontFamily: 'Manrope_700Bold', color: '#6B6B6B' },
  symptomWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  symptomChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#F2F2F4',
    borderWidth: 1,
    borderColor: '#E8E8EA',
  },
  symptomChipOn: { backgroundColor: PERIOD_PINK, borderColor: PERIOD_PINK },
  symptomChipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold', color: '#333' },
  primaryBtn: {
    height: 52,
    borderRadius: 999,
    backgroundColor: PERIOD_PINK,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, fontFamily: 'Manrope_700Bold', color: '#FFFFFF' },
});
