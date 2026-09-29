import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Mission } from '@/context/AppContext';

import MissionIcon from '@/components/MissionIcon';

interface Props {
  mission: Mission;
  onPress?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  yoga: 'Yoga',
  safety: 'Safety',
  nutrition: 'Nutrition',
  recipe: 'Recipe',
};

// Bundled fallback photos for missions without a matching exercise GIF
// (recipe/nutrition). Local assets so they always render, even offline.
const STATIC_MISSION_IMAGES: Record<string, number> = {
  recipe: require('@/assets/recipes/r1.webp'),
  nutrition: require('@/assets/recipes/r5.webp'),
};

export default function MissionCard({ mission, onPress }: Props) {
  const colors = useColors();
  const resolved = mission.completed || mission.skipped;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: mission.completed ? mission.accentColor + '40' : colors.border,
          opacity: resolved ? 0.78 : 1,
        },
      ]}
    >
      <TouchableOpacity activeOpacity={0.9} onPress={onPress} disabled={mission.skipped}>
        <MissionIcon
          title={mission.title}
          animation={mission.animation}
          category={mission.category}
          slot={mission.slot}
          icon={mission.icon}
          accentColor={mission.accentColor}
          size={150}
          iconSize={34}
          style={styles.cover}
          contentFit="contain"
          imageUrl={STATIC_MISSION_IMAGES[mission.id]}
        />

        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[styles.category, { color: mission.accentColor }]} numberOfLines={1}>
              {(mission.skipped ? 'Skipped' : mission.label || CATEGORY_LABELS[mission.category] || 'Mission').toUpperCase()}
              {mission.duration > 0 ? ` · ${mission.duration} min` : ''}
            </Text>
          </View>
          <Text style={[styles.title, { color: resolved ? colors.mutedForeground : colors.foreground }]} numberOfLines={2}>
            {mission.title}
          </Text>
          {mission.cue ? (
            <Text style={[styles.cue, { color: colors.mutedForeground }]} numberOfLines={1}>
              {mission.animation ? 'How to · ' : ''}
              {mission.cue}
            </Text>
          ) : null}
          {mission.calories > 0 || mission.difficulty ? (
            <View style={styles.metaRow}>
              {mission.difficulty ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{mission.difficulty}</Text>
              ) : null}
              {mission.calories > 0 ? (
                <Text style={[styles.meta, { color: colors.mutedForeground }]}>{mission.calories} kcal</Text>
              ) : null}
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    borderRadius: 0,
  },
  body: {
    padding: 14,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  category: {
    flex: 1,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    lineHeight: 22,
  },
  cue: {
    fontSize: 12.5,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
});
