import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle, type TextStyle, type ImageStyle } from 'react-native';
import { useColors } from '@/hooks/useColors';

const LOGO = require('@/assets/logo.jpeg');

type BrandLogoProps = {
  /** Icon size in px */
  size?: number;
  /** Show "Femma AI" label beside or below the mark */
  showName?: boolean;
  /** Layout: stacked (welcome) or row (headers) */
  layout?: 'stack' | 'row';
  nameStyle?: StyleProp<TextStyle>;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
};

/** Shared Femma AI mark + wordmark. */
export function BrandLogo({
  size = 56,
  showName = true,
  layout = 'stack',
  nameStyle,
  style,
  imageStyle,
}: BrandLogoProps) {
  const colors = useColors();
  const radius = Math.max(10, Math.round(size * 0.28));

  return (
    <View style={[layout === 'row' ? styles.row : styles.stack, style]}>
      <Image
        source={LOGO}
        accessibilityLabel="Femma AI"
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
          },
          imageStyle,
        ]}
        resizeMode="cover"
      />
      {showName ? (
        <Text
          style={[
            layout === 'row' ? styles.nameRow : styles.nameStack,
            { color: colors.foreground },
            nameStyle,
          ]}
        >
          Femma AI
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: 'center', gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameStack: {
    fontSize: 22,
    letterSpacing: 0.4,
    fontFamily: 'Manrope_800ExtraBold',
  },
  nameRow: {
    fontSize: 15,
    letterSpacing: 0.3,
    fontFamily: 'Manrope_800ExtraBold',
  },
});
