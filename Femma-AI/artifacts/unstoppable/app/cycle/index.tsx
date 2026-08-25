import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, CYCLE_PHASE_INFO } from '@/context/AppContext';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const PHASES = [
  { id: 'menstrual', label: 'Menstrual', days: '1-5', color: '#FF928F' },
  { id: 'follicular', label: 'Follicular', days: '6-13', color: '#A9E4D2' },
  { id: 'ovulation', label: 'Ovulation', days: '14', color: '#F26BB5' },
  { id: 'luteal', label: 'Luteal', days: '15-28', color: '#B9A7F2' },
];

const RECS = [
  { category: 'Fitness', icon: 'zap', color: '#F26BB5', rec: 'Moderate cardio and strength work — energy is building.', gradient: ['#F26BB5', '#D94A9A'] as [string, string] },
  { category: 'Yoga', icon: 'wind', color: '#B9A7F2', rec: 'Energizing yoga flows and flexibility work.', gradient: ['#B9A7F2', '#77CDED'] as [string, string] },
  { category: 'Nutrition', icon: 'coffee', color: '#A9E4D2', rec: 'Focus on iron-rich foods and leafy greens.', gradient: ['#A9E4D2', '#C9F2F6'] as [string, string] },
];

export default function CycleScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const phaseInfo = CYCLE_PHASE_INFO[profile.cyclePhase];

  // Build a simple 28-day calendar (just current week for display)
  const today = new Date();
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + i);
    return { date: d.getDate(), dayLabel: DAYS[i], isToday: d.getDate() === today.getDate() };
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.coral + '30', colors.background]} style={styles.headerGrad}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Cycle Tracking</Text>
          <TouchableOpacity style={[styles.settingsBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="settings" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 32 }}>
        <View style={styles.body}>
          {/* Current phase card */}
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <LinearGradient colors={[phaseInfo.color + 'EE', phaseInfo.color + '88']} style={styles.phaseCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.phaseTop}>
                <View>
                  <Text style={styles.phaseCardLabel}>Current Phase</Text>
                  <Text style={styles.phaseCardName}>{phaseInfo.name}</Text>
                  <Text style={styles.phaseCardDay}>Day {profile.cycleDay} of your cycle</Text>
                </View>
                <View style={[styles.phaseRing, { borderColor: 'rgba(255,255,255,0.5)' }]}>
                  <Text style={styles.phaseRingNum}>{profile.cycleDay}</Text>
                </View>
              </View>
              <View style={[styles.phaseInsight, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <Text style={styles.phaseInsightText}>{phaseInfo.insight}</Text>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Week Calendar */}
          <Animated.View entering={FadeInDown.delay(150).duration(500)}>
            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>This Week</Text>
              <View style={styles.weekRow}>
                {weekDays.map(day => (
                  <TouchableOpacity
                    key={day.date}
                    style={[styles.dayCell, day.isToday && { backgroundColor: colors.primary }]}
                    onPress={() => Haptics.selectionAsync()}
                  >
                    <Text style={[styles.dayLabel, { color: day.isToday ? '#FFFFFF' : colors.mutedForeground }]}>{day.dayLabel}</Text>
                    <Text style={[styles.dayNum, { color: day.isToday ? '#FFFFFF' : colors.foreground }]}>{day.date}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* Log */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)}>
            <View style={styles.logRow}>
              {[{ icon: 'droplet', label: 'Log Period', color: colors.coral }, { icon: 'smile', label: 'Log Mood', color: colors.lavender }, { icon: 'zap', label: 'Log Energy', color: colors.warmYellow }].map(l => (
                <TouchableOpacity
                  key={l.label}
                  style={[styles.logBtn, { backgroundColor: l.color + '18', borderColor: l.color + '40' }]}
                  onPress={() => Haptics.selectionAsync()}
                  activeOpacity={0.8}
                >
                  <Feather name={l.icon as any} size={20} color={l.color} />
                  <Text style={[styles.logBtnText, { color: colors.foreground }]}>{l.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Phase Cycle */}
          <Animated.View entering={FadeInDown.delay(250).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cycle Phases</Text>
            {PHASES.map(p => (
              <View key={p.id} style={[styles.phaseRow, { backgroundColor: colors.card, borderColor: p.id === profile.cyclePhase ? p.color + '50' : colors.border }]}>
                <View style={[styles.phaseDot, { backgroundColor: p.color }]} />
                <View style={styles.phaseInfo}>
                  <Text style={[styles.phaseLabel, { color: colors.foreground }]}>{p.label}</Text>
                  <Text style={[styles.phaseDays, { color: colors.mutedForeground }]}>Days {p.days}</Text>
                </View>
                {p.id === profile.cyclePhase && (
                  <View style={[styles.currentBadge, { backgroundColor: p.color + '20', borderColor: p.color + '50' }]}>
                    <Text style={[styles.currentText, { color: p.color }]}>Now</Text>
                  </View>
                )}
              </View>
            ))}
          </Animated.View>

          {/* Phase Recommendations */}
          <Animated.View entering={FadeInDown.delay(300).duration(500)}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Phase Recommendations</Text>
            {RECS.map(r => (
              <TouchableOpacity key={r.category} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8}>
                <View style={[styles.recIcon, { backgroundColor: r.color + '20' }]}>
                  <Feather name={r.icon as any} size={18} color={r.color} />
                </View>
                <View style={styles.recInfo}>
                  <Text style={[styles.recCategory, { color: r.color }]}>{r.category}</Text>
                  <Text style={[styles.recText, { color: colors.foreground }]}>{r.rec}</Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
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
