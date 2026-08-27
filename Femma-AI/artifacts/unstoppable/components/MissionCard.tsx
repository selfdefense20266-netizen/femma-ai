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
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: mission.completed ? mission.accentColor + '40' : colors.border,
          opacity: mission.completed ? 0.78 : 1,
        },
      ]}
    >
      <View style={[styles.stripe, { backgroundColor: mission.accentColor }]} />

      <TouchableOpacity style={styles.main} onPress={onPress} activeOpacity={0.8}>
        <View style={[styles.iconWrap, { backgroundColor: mission.accentColor + '18' }]}>
          <Feather name={mission.icon as any} size={20} color={mission.accentColor} />
        </View>

        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.category, { color: mission.accentColor }]}>
              {mission.label || CATEGORY_LABELS[mission.category] || 'Mission'}
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

      <TouchableOpacity
        style={[
          styles.checkBtn,
          {
            backgroundColor: mission.completed ? mission.accentColor : colors.card,
            borderColor: mission.completed ? mission.accentColor : colors.border,
          },
        ]}
        onPress={handleComplete}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        accessibilityLabel={mission.completed ? 'Mission completed' : 'Mark mission done'}
      >
        {mission.completed ? (
          <Feather name="check" size={16} color="#FFFFFF" />
        ) : (
          <View style={[styles.emptyCheck, { borderColor: colors.mutedForeground }]} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    paddingVertical: 8,
    paddingRight: 12,
    paddingLeft: 8,
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
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
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
  emptyCheck: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
  },
});
