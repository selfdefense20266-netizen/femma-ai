import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import SectionHeader from '@/components/SectionHeader';

const FILTERS = ['All', 'Beginner', 'Stress Relief', 'Sleep', 'Flexibility', 'Pregnancy', 'Recovery', 'Breathwork'];

const SESSIONS = [
  { id: 'y1', title: 'Morning Energy Flow', duration: 20, level: 'Beginner', desc: 'Wake up your body gently', colors: ['#77CDED', '#B9A7F2'] as [string,string], tag: 'Morning' },
  { id: 'y2', title: 'Stress Relief Sequence', duration: 15, level: 'All levels', desc: 'Release tension in 15 minutes', colors: ['#B9A7F2', '#E9E2FC'] as [string,string], tag: 'Your Plan' },
  { id: 'y3', title: 'Deep Flexibility Flow', duration: 30, level: 'Intermediate', desc: 'Open hips, hamstrings & spine', colors: ['#A9E4D2', '#77CDED'] as [string,string] },
  { id: 'y4', title: 'Sleep Yoga', duration: 20, level: 'All levels', desc: 'Prepare your body for deep sleep', colors: ['#1a1a2e', '#2d1b4e'] as [string,string], tag: 'Evening' },
  { id: 'y5', title: 'Menstrual Comfort', duration: 20, level: 'Gentle', desc: 'Ease cramps and discomfort', colors: ['#FF928F', '#F26BB5'] as [string,string] },
  { id: 'y6', title: 'Pregnancy Yoga', duration: 25, level: 'Gentle', desc: 'Safe & nurturing movement', colors: ['#FFD88A', '#FF928F'] as [string,string], tag: 'Pregnancy' },
];

export default function YogaHub() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [activeFilter, setActiveFilter] = useState('All');

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.softLavender + 'AA', colors.background]} style={styles.headerGrad}>
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Yoga & Recovery</Text>
          <Feather name="search" size={22} color={colors.foreground} />
        </View>
      </LinearGradient>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 32 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersRow}>
          {FILTERS.map(f => (
            <FilterChip key={f} label={f} selected={activeFilter === f} onPress={() => { Haptics.selectionAsync(); setActiveFilter(f); }} color={colors.lavender} />
          ))}
        </ScrollView>

        <View style={styles.body}>
          <SectionHeader title="Sessions" />
          {SESSIONS.map((s, i) => (
            <Animated.View key={s.id} entering={FadeInDown.delay(i * 70).duration(400)}>
              <TouchableOpacity
                style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push(`/yoga/${s.id}` as any); }}
                activeOpacity={0.85}
              >
                <LinearGradient colors={s.colors} style={styles.sessionLeft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Feather name="wind" size={24} color="#FFFFFF" />
                </LinearGradient>
                <View style={styles.sessionInfo}>
                  {s.tag && (
                    <View style={[styles.sessionTag, { backgroundColor: colors.lavender + '20', borderColor: colors.lavender + '40' }]}>
                      <Text style={[styles.sessionTagText, { color: colors.lavender }]}>{s.tag}</Text>
                    </View>
                  )}
                  <Text style={[styles.sessionTitle, { color: colors.foreground }]}>{s.title}</Text>
                  <Text style={[styles.sessionDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
                  <View style={styles.sessionMeta}>
                    <Text style={[styles.sessionMetaText, { color: colors.mutedForeground }]}>{s.duration} min · {s.level}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </TouchableOpacity>
            </Animated.View>
          ))}
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
  filtersRow: { paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  body: { paddingHorizontal: 22, gap: 10 },
  sessionCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, borderWidth: 1, overflow: 'hidden', gap: 14 },
  sessionLeft: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  sessionInfo: { flex: 1, paddingVertical: 12, gap: 3 },
  sessionTag: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1, marginBottom: 2 },
  sessionTagText: { fontSize: 10, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  sessionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  sessionDesc: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 17 },
  sessionMeta: { marginTop: 2 },
  sessionMetaText: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
});
