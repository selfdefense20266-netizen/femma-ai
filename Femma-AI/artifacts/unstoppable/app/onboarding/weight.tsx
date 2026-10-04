import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

const TICK = 10;
const MIN_KG = 35;
const MAX_KG = 150;
const MIN_LB = 77;
const MAX_LB = 330;

function kgToLb(kg: number) {
  return Math.round(kg * 2.20462 * 10) / 10;
}

function lbToKg(lb: number) {
  return Math.round((lb / 2.20462) * 10) / 10;
}

export default function WeightStep() {
  const colors = useColors();
  const { profile, updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const scrollRef = useRef<ScrollView>(null);

  const startKg = profile.weightKg && profile.weightKg >= 35 ? profile.weightKg : 60;
  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const [kg, setKg] = useState(startKg);

  const display = unit === 'kg' ? kg : kgToLb(kg);
  const min = unit === 'kg' ? MIN_KG : MIN_LB;
  const max = unit === 'kg' ? MAX_KG : MAX_LB;
  const ticks = useMemo(() => {
    const out: number[] = [];
    for (let v = min; v <= max; v += 0.1) out.push(Math.round(v * 10) / 10);
    return out;
  }, [min, max]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const idx = Math.round(x / TICK);
    const clamped = Math.max(0, Math.min(ticks.length - 1, idx));
    const value = ticks[clamped];
    const nextKg = unit === 'kg' ? value : lbToKg(value);
    if (Math.abs(nextKg - kg) >= 0.05) {
      setKg(nextKg);
    }
  };

  const centerPad = 160;

  useEffect(() => {
    const value = unit === 'kg' ? kg : kgToLb(kg);
    const idx = Math.round((value - min) * 10);
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ x: Math.max(0, idx) * TICK, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [unit]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i <= 5 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 5 of 6</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>What is your weight?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          This will be taken into account when calculating your daily nutrition goals.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.unitToggle, { backgroundColor: colors.muted }]}>
          {(['lbs', 'kg'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, unit === u && { backgroundColor: colors.card }]}
              onPress={() => {
                Haptics.selectionAsync();
                setUnit(u);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.unitText, { color: unit === u ? colors.foreground : colors.mutedForeground }]}>
                {u}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.currentLabel, { color: colors.mutedForeground }]}>Current weight</Text>
        <Text style={[styles.value, { color: colors.foreground }]}>
          {display.toFixed(1)} {unit}
        </Text>

        <View style={styles.rulerWrap}>
          <View style={[styles.rulerCenter, { backgroundColor: colors.foreground }]} />
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={TICK}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: centerPad }}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={() => Haptics.selectionAsync()}
          >
            {ticks.map((v, i) => {
              const major = Math.round(v * 10) % 10 === 0;
              const mid = Math.round(v * 10) % 5 === 0;
              return (
                <View key={`${v}-${i}`} style={styles.tickCol}>
                  <View
                    style={[
                      styles.tick,
                      {
                        height: major ? 36 : mid ? 24 : 14,
                        backgroundColor: colors.foreground,
                        opacity: major ? 0.85 : 0.35,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ weightKg: Math.round(kg * 10) / 10 });
            router.push('/onboarding/cycle');
          }}
          activeOpacity={0.85}
        >
          <Text style={styles.nextBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 24, paddingBottom: 12, gap: 8 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 4 },
  progressDot: { height: 4, flex: 1, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: 'Manrope_600SemiBold' },
  question: { fontSize: 26, fontFamily: 'Manrope_800ExtraBold', lineHeight: 34 },
  subtext: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20 },
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
  unitToggle: { flexDirection: 'row', borderRadius: 100, padding: 4, width: 160 },
  unitBtn: { flex: 1, height: 36, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  currentLabel: { marginTop: 28, fontSize: 13, fontFamily: 'Manrope_500Medium' },
  value: { marginTop: 6, fontSize: 40, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -1 },
  rulerWrap: { marginTop: 28, height: 70, width: '100%', justifyContent: 'flex-end' },
  rulerCenter: {
    position: 'absolute',
    alignSelf: 'center',
    width: 2,
    height: 52,
    borderRadius: 2,
    zIndex: 2,
    bottom: 0,
  },
  tickCol: { width: TICK, alignItems: 'center', justifyContent: 'flex-end', height: 52 },
  tick: { width: 2, borderRadius: 2 },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Manrope_700Bold' },
});
