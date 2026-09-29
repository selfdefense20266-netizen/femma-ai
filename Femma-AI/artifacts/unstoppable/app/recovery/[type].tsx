import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useRecoverySections } from '@/hooks/useRecoverySections';
import { intensityFromProfile } from '@/lib/dailyPlans';
import { sectionExercisesForLevel } from '@/lib/recoverySections';
import MissionIcon from '@/components/MissionIcon';

export default function RecoverySessionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, activityLog } = useApp();
  const { data: sections = [] } = useRecoverySections();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const type = Array.isArray(params.type) ? params.type[0] : params.type || '';
  const [heroRatio, setHeroRatio] = useState(16 / 10);

  const section = useMemo(
    () => sections.find((s) => s.id === type || s.sectionKey === type) || null,
    [sections, type]
  );

  const intensity = intensityFromProfile(profile.fitnessLevel);
  const items = useMemo(() => sectionExercisesForLevel(section, intensity), [section, intensity]);
  const isDone = (id: string) => activityLog.some((e) => e.ref === id);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {section?.title || 'Recovery'}
        </Text>
      </View>
      <Text style={[styles.sub, { color: colors.mutedForeground }]}>
        Today’s tasks are skipped · no points · do these recovery moves
      </Text>

      {section?.coverUrl ? (
        <Image
          source={{ uri: section.coverUrl }}
          style={[styles.hero, { aspectRatio: heroRatio }]}
          contentFit="contain"
          onLoad={(e) => {
            const w = e.source?.width;
            const h = e.source?.height;
            if (w && h) setHeroRatio(w / h);
          }}
        />
      ) : null}

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: insets.bottom + 40, gap: 12 }}>
        {!items.length ? (
          <View style={[styles.empty, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="wind" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No exercises yet</Text>
            <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
              Admin has not added moves for this recovery section yet.
            </Text>
          </View>
        ) : (
          items.map((item, index) => {
            const done = isDone(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.row, { borderColor: done ? colors.mint : colors.border, backgroundColor: colors.card }]}
                activeOpacity={0.88}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push({
                    pathname: '/exercise-guide',
                    params: {
                      title: item.title,
                      animation: 'flow',
                      cue: item.cue || '',
                      duration: String(item.durationMinutes || 10),
                      steps: (item.steps || []).join('|'),
                      missionId: item.id,
                      category: 'yoga',
                      mediaUrl: typeof item.mediaUrl === 'string' ? item.mediaUrl : '',
                    },
                  } as never);
                }}
              >
                <MissionIcon
                  title={item.title}
                  category="yoga"
                  slot="exercise"
                  icon="wind"
                  accentColor={colors.lavender}
                  size={64}
                  iconSize={22}
                  style={styles.thumb}
                  contentFit="contain"
                  imageUrl={item.mediaUrl || undefined}
                />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.rowIndex, { color: colors.mutedForeground }]}>Move {index + 1}</Text>
                  <Text style={[styles.rowTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>
                    {item.durationMinutes} Mins
                  </Text>
                </View>
                {done ? (
                  <View style={[styles.doneDot, { backgroundColor: '#22C55E' }]}>
                    <Feather name="check" size={14} color="#fff" />
                  </View>
                ) : (
                  <Feather name="chevron-right" size={20} color={colors.mutedForeground} />
                )}
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 0,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
    lineHeight: 17,
    paddingHorizontal: 16,
    paddingLeft: 62,
    marginTop: 2,
    marginBottom: 8,
  },
  hero: {
    width: '100%',
    backgroundColor: 'transparent',
  },
  empty: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  emptyBody: { fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 19 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  thumb: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden' },
  rowIndex: { fontSize: 11, fontFamily: 'Manrope_600SemiBold', letterSpacing: 0.4 },
  rowTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  rowMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
  doneDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
