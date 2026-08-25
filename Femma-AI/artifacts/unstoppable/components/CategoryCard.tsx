import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';

export interface CategoryData {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  gradientColors: [string, string];
  count?: number;
}

interface Props {
  item: CategoryData;
  onPress?: () => void;
  fullWidth?: boolean;
}

export default function CategoryCard({ item, onPress, fullWidth = false }: Props) {
  const colors = useColors();

  return (
    <TouchableOpacity
      style={[styles.card, fullWidth && styles.fullWidthCard]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <LinearGradient
        colors={item.gradientColors}
        style={[StyleSheet.absoluteFill, { borderRadius: 20 }]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={styles.content}>
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
          <Feather name={item.icon as any} size={22} color="#FFFFFF" />
        </View>
        <View style={styles.textContent}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
        <View style={[styles.arrow, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Feather name="arrow-right" size={16} color="#FFFFFF" />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    height: 130,
    borderRadius: 20,
    overflow: 'hidden',
    minWidth: 150,
  },
  fullWidthCard: {
    height: 100,
    flex: 0,
  },
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontFamily: 'Manrope_400Regular',
  },
  arrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
