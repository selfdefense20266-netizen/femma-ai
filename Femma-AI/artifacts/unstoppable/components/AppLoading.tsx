import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '@/hooks/useColors';

type Props = {
  style?: StyleProp<ViewStyle>;
  fullScreen?: boolean;
  size?: number;
};

const PETAL_COUNT = 12;

function ThemeSpinner({ size = 36, color }: { size: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1000, easing: Easing.linear }),
      -1,
      false
    );
  }, [progress]);

  const petalW = Math.max(2.5, size * 0.085);
  const petalH = size * 0.28;
  const radius = size * 0.34;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: PETAL_COUNT }, (_, index) => (
        <Petal
          key={index}
          index={index}
          progress={progress}
          color={color}
          width={petalW}
          height={petalH}
          radius={radius}
        />
      ))}
    </View>
  );
}

function Petal({
  index,
  progress,
  color,
  width,
  height,
  radius,
}: {
  index: number;
  progress: SharedValue<number>;
  color: string;
  width: number;
  height: number;
  radius: number;
}) {
  const angle = (index / PETAL_COUNT) * 360;

  const animatedStyle = useAnimatedStyle(() => {
    // Bright spoke trails behind the head — classic iOS fade.
    const phase = (progress.value * PETAL_COUNT - index + PETAL_COUNT) % PETAL_COUNT;
    const opacity = 0.18 + (1 - phase / PETAL_COUNT) * 0.82;
    return { opacity };
  });

  return (
    <Animated.View
      style={[
        styles.petal,
        {
          width,
          height,
          borderRadius: width,
          backgroundColor: color,
          transform: [{ rotate: `${angle}deg` }, { translateY: -radius }],
        },
        animatedStyle,
      ]}
    />
  );
}

/** iOS petal spinner tinted with brand pink. */
export default function AppLoading({ style, fullScreen = true, size = 36 }: Props) {
  const colors = useColors();

  return (
    <View
      style={[
        fullScreen ? styles.full : styles.inline,
        fullScreen ? { backgroundColor: colors.background } : null,
        style,
      ]}
    >
      <ThemeSpinner size={size} color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  full: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inline: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  petal: {
    position: 'absolute',
  },
});
