import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import FilterChip from '@/components/FilterChip';
import SectionHeader from '@/components/SectionHeader';
import { useApp } from '@/context/AppContext';
import {
  YOGA_FILTERS,
  recommendedYogaFilter,
  recommendedYogaSessionId,
  yogaSessionsForProfile,
} from '@/data/yogaSessions';

export default function YogaHub() {
  const colors = useColors();
  const { missions, profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const defaultFilter = recommendedYogaFilter(profile);
  const [activeFilter, setActiveFilter] = useState(defaultFilter);
  const [filterTouched, setFilterTouched] = useState(false);
  const yogaDone = missions.some((m) => m.category === 'yoga' && m.completed);
  const planSessionId = recommendedYogaSessionId(profile);
  const sessions = useMemo(
    () => yogaSessionsForProfile(profile, activeFilter),
    [profile, activeFilter]
  );

  useEffect(() => {
    if (!filterTouched) setActiveFilter(defaultFilter);
  }, [defaultFilter, filterTouched]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.softLavender + 'AA', colors.background]} style={styles.headerGrad}>
        <View style={[styles.header, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.foreground }]}>Yoga & Recovery</Text>
          <Feather name="search" size={22} color={colors.foreground} />
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: botPad + 32 }}
        nestedScrollEnabled
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersRow}
          nestedScrollEnabled
        >
          {YOGA_FILTERS.map((f) => (
            <FilterChip
              key={f}
              label={f}
              selected={activeFilter === f}
              onPress={() => {
                Haptics.selectionAsync();
                setFilterTouched(true);
                setActiveFilter(f);
              }}
              color={colors.lavender}
            />
          ))}
        </ScrollView>

        <View style={styles.body}>
          <SectionHeader
            title={activeFilter === 'All' ? 'Sessions' : `${activeFilter} sessions`}
          />
          {sessions.length === 0 ? (
            <Text style={[styles.empty, { color: colors.mutedForeground }]}>
              No sessions in this filter yet. Try All.
            </Text>
          ) : (
            sessions.map((s, i) => {
              const isPlan = s.id === planSessionId;
              return (
                <Animated.View key={s.id} entering={FadeInDown.delay(i * 70).duration(400)}>
                  <TouchableOpacity
                    style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      router.push(`/yoga/${s.id}` as never);
                    }}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={s.colors} style={styles.sessionLeft} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Feather name="wind" size={24} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.sessionInfo}>
                      {isPlan ? (
                        <View style={[styles.sessionTag, { backgroundColor: colors.lavender + '20', borderColor: colors.lavender + '40' }]}>
                          <Text style={[styles.sessionTagText, { color: colors.lavender }]}>Your Plan</Text>
                        </View>
                      ) : s.filters[0] ? (
                        <View style={[styles.sessionTag, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                          <Text style={[styles.sessionTagText, { color: colors.mutedForeground }]}>{s.filters[0]}</Text>
                        </View>
                      ) : null}
                      <Text style={[styles.sessionTitle, { color: colors.foreground }]}>{s.title}</Text>
                      <Text style={[styles.sessionDesc, { color: colors.mutedForeground }]}>{s.desc}</Text>
                      <View style={styles.sessionMeta}>
                        <Text style={[styles.sessionMetaText, { color: colors.mutedForeground }]}>
                          {s.duration} min · {s.level}
                        </Text>
                      </View>
                    </View>
                    <Feather
                      name={yogaDone && isPlan ? 'check-circle' : 'chevron-right'}
                      size={18}
                      color={yogaDone && isPlan ? colors.lavender : colors.mutedForeground}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
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
  scroll: { flex: 1 },
  filtersRow: { paddingHorizontal: 22, paddingVertical: 12, gap: 8 },
  body: { paddingHorizontal: 22, gap: 10 },
  empty: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, paddingVertical: 12 },
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
