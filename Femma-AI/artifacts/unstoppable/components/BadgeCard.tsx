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
      <Text style={[styles.title, { color: badge.earned ? colors.foreground : colors.mutedForeground }]} numberOfLines={2}>
        {badge.title}
      </Text>
      <Text style={[styles.desc, { color: colors.mutedForeground }]} numberOfLines={2}>
        {badge.description}
      </Text>
      {!badge.earned && (
        <Text style={[styles.locked, { color: badge.color }]}>In progress</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 118,
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    minHeight: 148,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    textAlign: 'center',
    lineHeight: 16,
  },
  desc: {
    fontSize: 10,
    fontFamily: 'Manrope_400Regular',
    textAlign: 'center',
    lineHeight: 14,
  },
  locked: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
  },
});
