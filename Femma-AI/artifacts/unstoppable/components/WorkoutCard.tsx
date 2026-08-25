import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

export interface WorkoutData {
  id: string;
  title: string;
  subtitle?: string;
  duration: number;
  level: string;
  calories?: number;
  tag?: string;
  gradientColors: [string, string];
  locked?: boolean;
}

interface Props {
  item: WorkoutData;
  onPress?: () => void;
  wide?: boolean;
}

export default function WorkoutCard({ item, onPress, wide = false }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, wide && styles.wideCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={item.gradientColors}
        style={[StyleSheet.absoluteFill, { borderRadius: 18 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      {item.locked && (
        <View style={[styles.lockOverlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <Feather name="lock" size={20} color="#FFFFFF" />
          <Text style={styles.premiumText}>Premium</Text>
        </View>
      )}

      <View style={styles.cardContent}>
        {item.tag && (
          <View style={[styles.tagBadge, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.tagText}>{item.tag}</Text>
          </View>
        )}
        <View style={styles.bottomContent}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          {item.subtitle && <Text style={styles.cardSubtitle}>{item.subtitle}</Text>}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="clock" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>{item.duration} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="bar-chart-2" size={11} color="rgba(255,255,255,0.8)" />
              <Text style={styles.metaText}>{item.level}</Text>
            </View>
            {item.calories != null && item.calories > 0 && (
              <View style={styles.metaItem}>
                <Feather name="zap" size={11} color="rgba(255,255,255,0.8)" />
                <Text style={styles.metaText}>{item.calories} kcal</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    height: 220,
    borderRadius: 18,
    overflow: 'hidden',
    marginRight: 12,
  },
  wideCard: {
    width: '100%',
    height: 160,
    marginRight: 0,
    marginBottom: 12,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 18,
    gap: 6,
    zIndex: 10,
  },
  premiumText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  cardContent: {
    flex: 1,
    padding: 14,
    justifyContent: 'space-between',
  },
  tagBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
  bottomContent: {
    gap: 4,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
    lineHeight: 22,
  },
  cardSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  metaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  metaText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 11,
    fontFamily: 'Manrope_400Regular',
  },
});
