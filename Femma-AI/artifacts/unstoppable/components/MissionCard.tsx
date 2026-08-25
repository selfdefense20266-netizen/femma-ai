import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import type { Mission } from '@/context/AppContext';

interface Props {
  mission: Mission;
  onPress?: () => void;
  onComplete?: () => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  fitness: 'Fitness',
  yoga: 'Yoga',
  safety: 'Safety',
  nutrition: 'Nutrition',
  recipe: 'Recipe',
};

export default function MissionCard({ mission, onPress, onComplete }: Props) {
  const colors = useColors();

  const handleComplete = () => {
    if (mission.completed) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete?.();
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: mission.completed ? mission.accentColor + '30' : colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Accent stripe */}
      <View style={[styles.stripe, { backgroundColor: mission.accentColor }]} />

      <View style={[styles.iconWrap, { backgroundColor: mission.accentColor + '18' }]}>
        <Feather name={mission.icon as any} size={20} color={mission.accentColor} />
      </View>

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.category, { color: mission.accentColor }]}>
            {CATEGORY_LABELS[mission.category]}
          </Text>
          {mission.duration > 0 && (
            <View style={[styles.durationBadge, { backgroundColor: colors.muted }]}>
              <Feather name="clock" size={10} color={colors.mutedForeground} />
              <Text style={[styles.durationText, { color: colors.mutedForeground }]}>{mission.duration} min</Text>
            </View>
          )}
        </View>
        <Text style={[styles.title, { color: mission.completed ? colors.mutedForeground : colors.foreground }]} numberOfLines={2}>
          {mission.title}
        </Text>
        {(mission.calories > 0 || mission.difficulty) && (
          <View style={styles.metaRow}>
            {mission.difficulty ? (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{mission.difficulty}</Text>
            ) : null}
            {mission.calories > 0 && (
              <Text style={[styles.meta, { color: colors.mutedForeground }]}>{mission.calories} kcal</Text>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.checkBtn, { backgroundColor: mission.completed ? mission.accentColor : colors.muted, borderColor: mission.completed ? mission.accentColor : colors.border }]}
        onPress={handleComplete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {mission.completed && <Feather name="check" size={16} color="#FFFFFF" />}
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 8,
    gap: 12,
    overflow: 'hidden',
  },
  stripe: {
    width: 3,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
    gap: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  category: {
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
  },
  durationText: {
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
  },
  meta: {
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  checkBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
