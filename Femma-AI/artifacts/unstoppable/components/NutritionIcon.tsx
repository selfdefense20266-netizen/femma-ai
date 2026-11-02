import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import {
  NUTRITION_ICONS,
  nutritionIconForLabel,
  type NutritionIconKey,
} from '@/constants/nutritionIcons';

type Props = {
  name?: NutritionIconKey;
  /** Falls back to name lookup via calories / protein / fat / carbs / scan */
  label?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
};

export default function NutritionIcon({ name, label, size = 34, style }: Props) {
  // Today’s meals: crisp pink knife/fork on white
  if (name === 'todayMeals') {
    const pad = Math.round(size * 0.18);
    return (
      <View
        style={[
          styles.wrap,
          {
            width: size,
            height: size,
            borderRadius: size * 0.28,
            padding: pad,
          },
          style,
        ]}
      >
        <Ionicons name="restaurant" size={Math.round(size * 0.58)} color="#F26BB5" />
      </View>
    );
  }

  const source =
    (name ? NUTRITION_ICONS[name] : undefined) ||
    (label ? nutritionIconForLabel(label) : NUTRITION_ICONS.bowl);

  // Scan meal (and other PNGs) need inset so the graphic isn't clipped by the well.
  const pad = name === 'scanMeal' ? Math.round(size * 0.06) : 0;
  const imgSize = size - pad * 2;

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          padding: pad,
        },
        style,
      ]}
    >
      <Image
        source={source}
        style={{ width: imgSize, height: imgSize }}
        contentFit="contain"
        cachePolicy="none"
        recyclingKey={`${name || label || 'bowl'}-${size}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'visible',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
