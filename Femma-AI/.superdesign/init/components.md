# Shared UI components

Framework: React Native 0.81 with Expo 54 and Expo Router. Components use React Native StyleSheet, Expo vector icons and gradients, and the Manrope family.

## CategoryCard

- File: artifacts/unstoppable/components/CategoryCard.tsx
- Reusable pastel gradient navigation card for product pillars.
- Props: item, onPress, fullWidth.

~~~tsx
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
~~~

## FilterChip

- File: artifacts/unstoppable/components/FilterChip.tsx
- Pill filter with selected and unselected states.
- Props: label, selected, onPress, color.

~~~tsx
import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export default function FilterChip({ label, selected = false, onPress, color }: Props) {
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accentColor : colors.muted,
          borderColor: selected ? accentColor : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.label, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});
~~~

## SectionHeader

- File: artifacts/unstoppable/components/SectionHeader.tsx
- Shared section title with optional See all action.
- Props: title, onSeeAll.

~~~tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  title: string;
  onSeeAll?: () => void;
}

export default function SectionHeader({ title, onSeeAll }: Props) {
  const colors = useColors();

  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={[styles.seeAll, { color: colors.primary }]}>See all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Manrope_700Bold',
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});
~~~

## WorkoutCard

- File: artifacts/unstoppable/components/WorkoutCard.tsx
- Reusable course/workout card with metadata, gradient, tag and premium lock state.
- Props: item, onPress, wide.

~~~tsx
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
    ...StyleSheet.absoluteFillObject,
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
~~~

## ProgressRing

- File: artifacts/unstoppable/components/ProgressRing.tsx
- Circular progress primitive used across missions and course progress.
- Props: progress, size, strokeWidth, label, sublabel, color.

~~~tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface Props {
  progress: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  color?: string;
}

export default function ProgressRing({ progress, size = 120, strokeWidth = 10, label, sublabel, color }: Props) {
  const colors = useColors();
  const ringColor = color ?? colors.primary;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - Math.min(1, Math.max(0, progress)));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.svg}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {(label || sublabel) && (
        <View style={styles.labelContainer}>
          {label && <Text style={[styles.label, { color: colors.foreground }]}>{label}</Text>}
          {sublabel && <Text style={[styles.sublabel, { color: colors.mutedForeground }]}>{sublabel}</Text>}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  svg: { position: 'absolute' },
  labelContainer: { alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 22, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  sublabel: { fontSize: 11, fontFamily: 'Manrope_400Regular', marginTop: 2 },
});
~~~
