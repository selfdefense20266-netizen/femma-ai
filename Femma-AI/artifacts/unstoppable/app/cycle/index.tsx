import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, CYCLE_PHASE_INFO, phaseFromCycleDay, type CyclePhase } from '@/context/AppContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PHASES = [
  { id: 'menstrual', label: 'Menstrual', days: '1-5', color: '#FF928F' },
  { id: 'follicular', label: 'Follicular', days: '6-13', color: '#A9E4D2' },
  { id: 'ovulation', label: 'Ovulation', days: '14', color: '#F26BB5' },
  { id: 'luteal', label: 'Luteal', days: '15-28', color: '#B9A7F2' },
] as const;

const MOODS = ['Great', 'Good', 'Low', 'Irritable'];
const ENERGY = ['High', 'Steady', 'Low'];
const CYCLE_LOGS_KEY = 'cycle_daily_logs';

type DayLog = { mood?: string; energy?: string };

const RECS: Record<CyclePhase, { category: string; icon: string; color: string; rec: string }[]> = {
  menstrual: [
    { category: 'Fitness', icon: 'zap', color: '#FF928F', rec: 'Keep it gentle — walking, mobility, or a light stretch.' },
    { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'Restorative yoga and slow breathing help cramps and energy.' },
    { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Iron-rich foods, warm meals, and extra water.' },
  ],
  follicular: [
    { category: 'Fitness', icon: 'zap', color: '#F26BB5', rec: 'Energy is building — moderate cardio and strength work well.' },
    { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'Energizing flows and flexibility work.' },
    { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Protein and colorful plants to match rising energy.' },
  ],
  ovulation: [
    { category: 'Fitness', icon: 'zap', color: '#F26BB5', rec: 'Peak energy — a harder session is okay if you feel good.' },
    { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'Power yoga or a longer flow if your body wants it.' },
    { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Stay hydrated and keep meals balanced around training.' },
  ],
  luteal: [
    { category: 'Fitness', icon: 'zap', color: '#B9A7F2', rec: 'Wind down intensity. Strength still helps — skip the extra grind.' },
    { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'Gentle yoga, hips, and breathing for PMS tension.' },
    { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Magnesium-rich foods, steady snacks, and less caffeine if you crash.' },
  ],
  none: [
    { category: 'Fitness', icon: 'zap', color: '#F26BB5', rec: 'Follow your training plan and rest when you need it.' },
    { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'A short stretch after workouts keeps you consistent.' },
    { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Scan meals to stay aligned with your food preference.' },
  ],
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

export default function CycleScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const tracking = profile.cyclePhase !== 'none';

  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [logs, setLogs] = useState<Record<string, DayLog>>({});

  useEffect(() => {
    AsyncStorage.getItem(CYCLE_LOGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, DayLog>;
        if (parsed && typeof parsed === 'object') setLogs(parsed);
      })
      .catch(() => undefined);
  }, []);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const date = new Date(today);
        date.setDate(today.getDate() - today.getDay() + i);
        return {
          key: dateKey(date),
          date,
          dateNum: date.getDate(),
          dayLabel: DAYS[i],
          isToday: dateKey(date) === dateKey(today),
        };
      }),
    [today]
  );

  const offset = daysBetween(today, selectedDate);
  const previewDay = tracking ? cycleDayForOffset(profile.cycleDay, offset) : 0;
  const previewPhase: CyclePhase = tracking ? phaseFromCycleDay(previewDay) : 'none';
  const phaseInfo = CYCLE_PHASE_INFO[previewPhase] || CYCLE_PHASE_INFO.none;
  const selectedLog = logs[dateKey(selectedDate)] || {};
  const recs = RECS[previewPhase] || RECS.none;
  const isTodaySelected = dateKey(selectedDate) === dateKey(today);

  const persistLogs = (next: Record<string, DayLog>) => {
    setLogs(next);
    void AsyncStorage.setItem(CYCLE_LOGS_KEY, JSON.stringify(next)).catch(() => undefined);
  };

  const patchSelectedLog = (patch: DayLog) => {
    const key = dateKey(selectedDate);
    persistLogs({ ...logs, [key]: { ...logs[key], ...patch } });
  };

  const startTracking = () => {
    updateProfile({ cyclePhase: 'follicular', cycleDay: 1, isPregnant: false });
    setSelectedDate(today);
  };

  const stopTracking = () => {
    updateProfile({ cyclePhase: 'none', cycleDay: 0 });
  };

  const logPeriod = () => {
    Alert.alert('Log period start?', 'This sets the selected day as Day 1 of your cycle.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log',
        onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          const shift = daysBetween(selectedDate, today);
          const nextDay = cycleDayForOffset(1, shift);
          updateProfile({
            cyclePhase: phaseFromCycleDay(nextDay),
            cycleDay: nextDay,
            isPregnant: false,
          });
        },
      },
    ]);
  };

  const pickValue = (title: string, options: string[], onPick: (value: string) => void) => {
    Alert.alert(title, undefined, [
      ...options.map((value) => ({
        text: value,
        onPress: () => {
          Haptics.selectionAsync();
          onPick(value);
        },
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const openSettings = () => {
    Alert.alert(
      'Cycle settings',
      tracking
        ? 'Workouts and nutrition tips follow your cycle. You can turn this off anytime.'
        : 'Turn tracking on to personalize workouts around your cycle.',
      tracking
        ? [
            { text: 'Stop tracking', style: 'destructive', onPress: stopTracking },
            { text: 'Close', style: 'cancel' },
          ]
        : [
            { text: 'Start tracking', onPress: startTracking },
            { text: 'Close', style: 'cancel' },
          ]
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.coral + '30', colors.background]} style={styles.headerGrad}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Cycle Tracking</Text>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={openSettings}
          >
            <Feather name="settings" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 32 }}>
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <LinearGradient colors={[phaseInfo.color + 'EE', phaseInfo.color + '88']} style={styles.phaseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.phaseTop}>
                <View>
                  <Text style={styles.phaseCardLabel}>{isTodaySelected ? 'Current phase' : 'Predicted phase'}</Text>
                  <Text style={styles.phaseCardName}>{phaseInfo.name}</Text>
                  <Text style={styles.phaseCardDay}>
                    {tracking ? `Day ${previewDay} of your cycle` : 'Tracking is off'}
                  </Text>
                </View>
                <View style={[styles.phaseRing, { borderColor: 'rgba(255,255,255,0.5)' }]}>
                  <Text style={styles.phaseRingNum}>{tracking ? previewDay : '—'}</Text>
                </View>
              </View>
              <View style={[styles.phaseInsight, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.phaseInsightText}>
                  {phaseInfo.insight || 'Turn tracking on to get phase-based workout and nutrition tips.'}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This Week</Text>
              <View style={styles.weekRow}>
                {weekDays.map((day) => {
                  const selected = day.key === dateKey(selectedDate);
                  return (
                    <TouchableOpacity
                      key={day.key}
                      style={[styles.dayCell, selected && { backgroundColor: colors.primary }]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setSelectedDate(day.date);
                      }}
                    >
                      <Text style={[styles.dayLabel, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>{day.dayLabel}</Text>
                      <Text style={[styles.dayNum, { color: selected ? '#FFFFFF' : colors.foreground }]}>{day.dateNum}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {(selectedLog.mood || selectedLog.energy) ? (
                <Text style={[styles.logSummary, { color: colors.mutedForeground }]}>
                  {selectedLog.mood ? `Mood: ${selectedLog.mood}` : ''}
                  {selectedLog.mood && selectedLog.energy ? ' · ' : ''}
                  {selectedLog.energy ? `Energy: ${selectedLog.energy}` : ''}
                </Text>
              ) : null}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <View style={styles.logRow}>
              {[
                { icon: 'droplet', label: 'Log Period', color: colors.coral, action: logPeriod },
                {
                  icon: 'smile',
                  label: selectedLog.mood ? selectedLog.mood : 'Log Mood',
                  color: colors.lavender,
                  action: () => pickValue('How is your mood?', MOODS, (value) => patchSelectedLog({ mood: value })),
                },
                {
                  icon: 'zap',
                  label: selectedLog.energy ? selectedLog.energy : 'Log Energy',
                  color: colors.warmYellow,
                  action: () => pickValue('How is your energy?', ENERGY, (value) => patchSelectedLog({ energy: value })),
                },
              ].map((item) => (
                <TouchableOpacity
                  key={item.icon}
                  style={[styles.logBtn, { backgroundColor: item.color + '18', borderColor: item.color + '40' }]}
                  onPress={item.action}
                  activeOpacity={0.8}
                >
                  <Feather name={item.icon as never} size={20} color={item.color} />
                  <Text style={[styles.logBtnText, { color: colors.foreground }]}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cycle Phases</Text>
            {PHASES.map((phase) => (
              <View
                key={phase.id}
                style={[
                  styles.phaseRow,
                  { backgroundColor: colors.card, borderColor: phase.id === previewPhase ? phase.color + '50' : colors.border },
                ]}
              >
                <View style={[styles.phaseDot, { backgroundColor: phase.color }]} />
                <View style={styles.phaseInfo}>
                  <Text style={[styles.phaseLabel, { color: colors.foreground }]}>{phase.label}</Text>
                  <Text style={[styles.phaseDays, { color: colors.mutedForeground }]}>Days {phase.days}</Text>
                </View>
                {phase.id === previewPhase ? (
                  <View style={[styles.currentBadge, { backgroundColor: phase.color + '20', borderColor: phase.color + '50' }]}>
                    <Text style={[styles.currentText, { color: phase.color }]}>{isTodaySelected ? 'Now' : 'This day'}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Phase Recommendations</Text>
            {recs.map((rec) => (
              <View key={rec.category} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.recIcon, { backgroundColor: rec.color + '20' }]}>
                  <Feather name={rec.icon as never} size={18} color={rec.color} />
                </View>
                <View style={styles.recInfo}>
                  <Text style={[styles.recCategory, { color: rec.color }]}>{rec.category}</Text>
                  <Text style={[styles.recText, { color: colors.foreground }]}>{rec.rec}</Text>
                </View>
              </View>
            ))}

            <View style={[styles.disclaimer, { backgroundColor: colors.muted }]}>
              <Feather name="info" size={14} color={colors.mutedForeground} />
              <Text style={[styles.disclaimerText, { color: colors.mutedForeground }]}>
                Predictions are estimates based on your logged data. Always consult your healthcare provider for medical advice.
              </Text>
            </View>
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerGrad: { paddingBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  settingsBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  body: { paddingHorizontal: 22, gap: 16 },
  phaseCard: { borderRadius: 20, padding: 20, gap: 12 },
  phaseTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  phaseCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 12, fontFamily: 'Manrope_600SemiBold', marginBottom: 4 },
  phaseCardName: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  phaseCardDay: { color: 'rgba(255,255,255,0.8)', fontSize: 13, fontFamily: 'Manrope_400Regular', marginTop: 4 },
  phaseRing: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },
  phaseRingNum: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  phaseInsight: { padding: 12, borderRadius: 12 },
  phaseInsightText: { color: '#FFFFFF', fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21 },
  calendarCard: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { alignItems: 'center', padding: 8, borderRadius: 12, gap: 4, minWidth: 38 },
  dayLabel: { fontSize: 10, fontFamily: 'Manrope_600SemiBold' },
  dayNum: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  logSummary: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  logRow: { flexDirection: 'row', gap: 10 },
  logBtn: { flex: 1, alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 6 },
  logBtnText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold', textAlign: 'center' },
  phaseRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12, marginBottom: 8 },
  phaseDot: { width: 12, height: 12, borderRadius: 6 },
  phaseInfo: { flex: 1 },
  phaseLabel: { fontSize: 14, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  phaseDays: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  currentBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  currentText: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  recCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, marginBottom: 8, gap: 12 },
  recIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  recInfo: { flex: 1, gap: 3 },
  recCategory: { fontSize: 11, fontWeight: '700', fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 0.5 },
  recText: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19 },
  disclaimer: { padding: 14, borderRadius: 12, flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  disclaimerText: { flex: 1, fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
});
