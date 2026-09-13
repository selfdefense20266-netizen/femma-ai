import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Rect, Line } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  animation?: string;
  title?: string;
  mutedColor: string;
  accent?: string;
};

function isBreath(animation?: string, title?: string) {
  return /breath|pranayama|exhale|nidra|box breathing/i.test(`${animation || ''} ${title || ''}`);
}

function BreathDemo({ accent }: { accent: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [t]);

  const outerProps = useAnimatedProps(() => ({
    r: 58 + t.value * 28,
    opacity: 0.25 + t.value * 0.35,
  }));
  const midProps = useAnimatedProps(() => ({
    r: 42 + t.value * 18,
    opacity: 0.35 + t.value * 0.4,
  }));
  const coreProps = useAnimatedProps(() => ({
    r: 22 + t.value * 10,
    opacity: 0.55 + t.value * 0.35,
  }));

  return (
    <Svg width="100%" height="100%" viewBox="0 0 220 220">
      <AnimatedCircle cx={110} cy={118} animatedProps={outerProps} fill="none" stroke={accent} strokeWidth={5} />
      <AnimatedCircle cx={110} cy={118} animatedProps={midProps} fill="none" stroke="#B9A7F2" strokeWidth={4} />
      <AnimatedCircle cx={110} cy={118} animatedProps={coreProps} fill={accent} />
      <Circle cx={110} cy={78} r={14} fill={accent} />
      <Rect x={98} y={92} width={24} height={36} rx={10} fill="#B9A7F2" />
      <Line x1={90} y1={108} x2={72} y2={128} stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <Line x1={130} y1={108} x2={148} y2={128} stroke={accent} strokeWidth={6} strokeLinecap="round" />
      <Line x1={102} y1={126} x2={88} y2={156} stroke="#B9A7F2" strokeWidth={7} strokeLinecap="round" />
      <Line x1={118} y1={126} x2={132} y2={156} stroke="#B9A7F2" strokeWidth={7} strokeLinecap="round" />
    </Svg>
  );
}

function FlowDemo({ accent }: { accent: string }) {
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);

  const sway = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-5 + t.value * 10}deg` }],
  }));
  const auraProps = useAnimatedProps(() => ({
    r: 70 + t.value * 10,
    opacity: 0.18 + t.value * 0.22,
  }));

  return (
    <View style={styles.flowStage}>
      <Svg width="100%" height="100%" viewBox="0 0 220 240" style={StyleSheet.absoluteFill}>
        <AnimatedCircle cx={110} cy={100} animatedProps={auraProps} fill="none" stroke={accent} strokeWidth={4} />
        <Ellipse cx={110} cy={210} rx={70} ry={10} fill="#E9E2FC" />
      </Svg>
      <Animated.View style={[styles.figureWrap, sway]}>
        <Svg width={160} height={200} viewBox="0 0 160 200">
          <Circle cx={80} cy={28} r={16} fill={accent} />
          <Rect x={66} y={46} width={28} height={54} rx={12} fill="#B9A7F2" />
          <Line x1={70} y1={58} x2={48} y2={42} stroke={accent} strokeWidth={7} strokeLinecap="round" />
          <Line x1={90} y1={58} x2={112} y2={42} stroke={accent} strokeWidth={7} strokeLinecap="round" />
          <Line x1={48} y1={42} x2={80} y2={34} stroke={accent} strokeWidth={6} strokeLinecap="round" />
          <Line x1={112} y1={42} x2={80} y2={34} stroke={accent} strokeWidth={6} strokeLinecap="round" />
          <Line x1={76} y1={98} x2={74} y2={168} stroke="#B9A7F2" strokeWidth={10} strokeLinecap="round" />
          <Line x1={84} y1={98} x2={118} y2={118} stroke={accent} strokeWidth={9} strokeLinecap="round" />
          <Line x1={118} y1={118} x2={90} y2={128} stroke={accent} strokeWidth={8} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** Crisp vector yoga/breath demo (SVG + Reanimated) — works on web and native, no GIFs. */
export function YogaLottieDemo({ animation, title, mutedColor, accent = '#F26BB5' }: Props) {
  const breath = isBreath(animation, title);
  return (
    <View style={styles.wrap}>
      <View style={styles.stage}>{breath ? <BreathDemo accent={accent} /> : <FlowDemo accent={accent} />}</View>
      <Text style={[styles.label, { color: mutedColor }]}>{breath ? 'Deep breath' : 'Yoga flow'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stage: {
    width: '100%',
    height: 236,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowStage: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  figureWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope_600SemiBold',
    textTransform: 'capitalize',
    marginBottom: 8,
  },
});
