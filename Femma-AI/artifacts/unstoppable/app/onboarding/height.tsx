import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

const ITEM_H = 48;
const VISIBLE = 5;
const PAD = ITEM_H * Math.floor(VISIBLE / 2);

const FEET = [4, 5, 6, 7];
const INCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const CM_LIST = Array.from({ length: 91 }, (_, i) => i + 140);

function cmFromFtIn(ft: number, inch: number) {
  return Math.round((ft * 12 + inch) * 2.54);
}

function ftInFromCm(cm: number) {
  const totalIn = Math.round(cm / 2.54);
  const ft = Math.min(7, Math.max(4, Math.floor(totalIn / 12)));
  const inch = Math.min(11, Math.max(0, totalIn % 12));
  return { ft, inch };
}

function WheelColumn({
  data,
  value,
  onChange,
  suffix,
  colors,
}: {
  data: number[];
  value: number;
  onChange: (value: number) => void;
  suffix: string;
  colors: ReturnType<typeof useColors>;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const startIndex = Math.max(0, data.indexOf(value));
  const [visualIndex, setVisualIndex] = useState(startIndex);
  const ready = useRef(false);
  const lastHaptic = useRef(startIndex);
  const valueRef = useRef(value);
  valueRef.current = value;

  const scrollToIndex = useCallback(
    (index: number, animated: boolean) => {
      const clamped = Math.max(0, Math.min(data.length - 1, index));
      scrollRef.current?.scrollTo({ y: clamped * ITEM_H, animated });
    },
    [data.length]
  );

  // Mount once at the correct row (unit switches remount via key).
  useEffect(() => {
    const t = setTimeout(() => {
      scrollToIndex(startIndex, false);
      setVisualIndex(startIndex);
      ready.current = true;
    }, 32);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only sync
  }, []);

  const applyOffset = (y: number) => {
    const next = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, next));
    setVisualIndex(clamped);
    if (clamped !== lastHaptic.current) {
      lastHaptic.current = clamped;
      Haptics.selectionAsync();
      if (data[clamped] !== valueRef.current) onChange(data[clamped]);
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ready.current) return;
    applyOffset(e.nativeEvent.contentOffset.y);
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!ready.current) return;
    const next = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    const clamped = Math.max(0, Math.min(data.length - 1, next));
    scrollToIndex(clamped, true);
    applyOffset(clamped * ITEM_H);
  };

  return (
    <View style={styles.wheelCol}>
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        contentContainerStyle={{ paddingVertical: PAD }}
      >
        {data.map((item, i) => {
          const active = i === visualIndex;
          return (
            <View
              key={`${suffix}-${item}`}
              style={[
                styles.wheelItem,
                active && { backgroundColor: colors.muted, borderRadius: 12, marginHorizontal: 8 },
              ]}
            >
              <Text
                style={[
                  styles.wheelText,
                  {
                    color: active ? colors.foreground : colors.mutedForeground,
                    opacity: active ? 1 : Math.abs(i - visualIndex) === 1 ? 0.45 : 0.28,
                  },
                ]}
              >
                {item} {suffix}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export default function HeightStep() {
  const colors = useColors();
  const { profile, updateProfile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const startCm = profile.heightCm && profile.heightCm >= 140 ? profile.heightCm : 160;
  const startFtIn = ftInFromCm(startCm);
  const [unit, setUnit] = useState<'ft' | 'cm'>('ft');
  const [ft, setFt] = useState(startFtIn.ft);
  const [inch, setInch] = useState(startFtIn.inch);
  const [cm, setCm] = useState(startCm);

  const displayCm = unit === 'cm' ? cm : cmFromFtIn(ft, inch);
  const label = useMemo(() => {
    if (unit === 'cm') return `${cm} cm`;
    return `${ft} ft ${inch} in`;
  }, [unit, ft, inch, cm]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.progressBar}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <View key={i} style={[styles.progressDot, { backgroundColor: i <= 4 ? colors.primary : colors.border }]} />
          ))}
        </View>
        <Text style={[styles.stepLabel, { color: colors.mutedForeground }]}>Step 4 of 6</Text>
        <Text style={[styles.question, { color: colors.foreground }]}>What is your height?</Text>
        <Text style={[styles.subtext, { color: colors.mutedForeground }]}>
          This will be taken into account when calculating your daily nutrition goals.
        </Text>
      </View>

      <View style={styles.body}>
        <View style={[styles.unitToggle, { backgroundColor: colors.muted }]}>
          {(['ft', 'cm'] as const).map((u) => (
            <TouchableOpacity
              key={u}
              style={[styles.unitBtn, unit === u && { backgroundColor: colors.card }]}
              onPress={() => {
                Haptics.selectionAsync();
                if (u === unit) return;
                if (u === 'cm') setCm(cmFromFtIn(ft, inch));
                else {
                  const next = ftInFromCm(cm);
                  setFt(next.ft);
                  setInch(next.inch);
                }
                setUnit(u);
              }}
              activeOpacity={0.85}
            >
              <Text style={[styles.unitText, { color: unit === u ? colors.foreground : colors.mutedForeground }]}>
                {u === 'ft' ? 'ft, in' : 'cm'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.selectedLabel, { color: colors.foreground }]}>{label}</Text>

        <View style={styles.wheels}>
          {unit === 'ft' ? (
            <>
              <WheelColumn key={`ft-${unit}`} data={FEET} value={ft} onChange={setFt} suffix="ft" colors={colors} />
              <WheelColumn key={`in-${unit}`} data={INCHES} value={inch} onChange={setInch} suffix="in" colors={colors} />
            </>
          ) : (
            <WheelColumn key={`cm-${unit}`} data={CM_LIST} value={cm} onChange={setCm} suffix="cm" colors={colors} />
          )}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: botPad + 16 }]}>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: colors.primary }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            updateProfile({ heightCm: displayCm });
            router.push('/onboarding/weight');
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
  body: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  unitToggle: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 4,
    marginTop: 8,
    width: 200,
  },
  unitBtn: { flex: 1, height: 36, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  selectedLabel: { marginTop: 20, fontSize: 28, fontFamily: 'Manrope_800ExtraBold' },
  wheels: {
    flexDirection: 'row',
    height: ITEM_H * VISIBLE,
    marginTop: 16,
    width: '100%',
    maxWidth: 280,
    overflow: 'hidden',
  },
  wheelCol: { flex: 1, height: ITEM_H * VISIBLE, overflow: 'hidden' },
  wheelItem: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 22, fontFamily: 'Manrope_700Bold' },
  footer: { paddingHorizontal: 24, paddingTop: 12 },
  nextBtn: { height: 56, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#FFFFFF', fontSize: 17, fontFamily: 'Manrope_700Bold' },
});
