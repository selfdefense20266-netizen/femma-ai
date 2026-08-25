import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

export interface BadgeData {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  earned: boolean;
  earnedDate?: string;
}

interface Props {
  badge: BadgeData;
}

export default function BadgeCard({ badge }: Props) {
  const colors = useColors();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: badge.earned ? badge.color + '40' : colors.border, opacity: badge.earned ? 1 : 0.5 }]}>
      <View style={[styles.iconCircle, { backgroundColor: badge.earned ? badge.color + '20' : colors.muted }]}>
        <Feather name={badge.icon as any} size={22} color={badge.earned ? badge.color : colors.mutedForeground} />
      </View>
      <Text style={[styles.title, { color: badge.earned ? colors.foreground : colors.mutedForeground }]} numberOfLines={1}>{badge.title}</Text>
      {badge.earned && badge.earnedDate && (
        <Text style={[styles.date, { color: colors.mutedForeground }]}>{badge.earnedDate}</Text>
      )}
      {!badge.earned && (
        <Text style={[styles.date, { color: colors.mutedForeground }]}>Locked</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 90,
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 6,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
  date: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
  },
});
