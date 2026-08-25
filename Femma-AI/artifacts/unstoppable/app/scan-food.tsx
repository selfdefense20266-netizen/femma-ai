import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';

const SCAN_HISTORY = [
  { id: 's1', name: 'Greek Yogurt', score: 92, calories: 130, protein: 17, carbs: 9, fat: 0, time: '8:32 AM' },
  { id: 's2', name: 'Avocado Toast', score: 78, calories: 320, protein: 8, carbs: 38, fat: 16, time: 'Yesterday' },
  { id: 's3', name: 'Protein Bar', score: 65, calories: 210, protein: 20, carbs: 22, fat: 7, time: 'Yesterday' },
];

function ScoreColor(score: number, colors: any) {
  if (score >= 80) return colors.mint;
  if (score >= 60) return colors.warmYellow;
  return colors.coral;
}

export default function ScanScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [scanning, setScanning] = useState(false);

  const scanLineAnim = useSharedValue(0);
  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanLineAnim.value }] }));

  const startScan = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setScanning(true);
    scanLineAnim.value = 0;
    scanLineAnim.value = withRepeat(withTiming(200, { duration: 1500 }), -1, true);

    setTimeout(() => {
      setScanning(false);
      router.push('/nutrition/result' as any);
    }, 2200);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
    if (!result.canceled) {
      router.push('/nutrition/result' as any);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <TouchableOpacity
          style={{ marginBottom: 10, width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Food Scanner</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Scan any food for instant nutrition insights</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        {/* Camera Viewfinder */}
        <View style={styles.scannerSection}>
          <View style={[styles.viewfinder, { backgroundColor: colors.charcoal }]}>
            <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />

            {/* Corner brackets */}
            {[{t: 20, l: 20}, {t: 20, r: 20}, {b: 20, l: 20}, {b: 20, r: 20}].map((pos, i) => (
              <View
                key={i}
                style={[
                  styles.corner,
                  { borderColor: colors.mint },
                  pos.t !== undefined ? { top: pos.t } : { bottom: pos.b },
                  pos.l !== undefined ? { left: pos.l } : { right: pos.r },
                  pos.t !== undefined && pos.l !== undefined ? { borderTopWidth: 3, borderLeftWidth: 3 } : undefined,
                  pos.t !== undefined && pos.r !== undefined ? { borderTopWidth: 3, borderRightWidth: 3 } : undefined,
                  pos.b !== undefined && pos.l !== undefined ? { borderBottomWidth: 3, borderLeftWidth: 3 } : undefined,
                  pos.b !== undefined && pos.r !== undefined ? { borderBottomWidth: 3, borderRightWidth: 3 } : undefined,
                ]}
              />
            ))}

            {scanning && (
              <Animated.View style={[styles.scanLine, { backgroundColor: colors.mint }, scanLineStyle]} />
            )}

            <View style={styles.viewfinderCenter}>
              {!scanning ? (
                <View style={styles.viewfinderIdle}>
                  <Feather name="camera" size={40} color="rgba(255,255,255,0.5)" />
                  <Text style={styles.viewfinderText}>Tap to scan food</Text>
                </View>
              ) : (
                <View style={styles.viewfinderScanning}>
                  <Text style={styles.scanningText}>Analyzing...</Text>
                </View>
              )}
            </View>
          </View>

          {/* Scan Controls */}
          <View style={styles.scanControls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickImage}
            >
              <Feather name="image" size={22} color={colors.mutedForeground} />
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainScanBtn, { backgroundColor: colors.mint }]}
              onPress={startScan}
              activeOpacity={0.85}
            >
              <Feather name="camera" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={startScan}
            >
              <Feather name="maximize" size={22} color={colors.mutedForeground} />
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>Barcode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Daily Summary */}
        <View style={styles.body}>
          <Animated.View entering={FadeInDown.delay(100).duration(500)}>
            <View style={[styles.dailySummary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Today's Nutrition</Text>
              <View style={styles.macroRow}>
                {[
                  { label: 'Calories', value: '1,240', unit: '/ 1,800', color: colors.pink },
                  { label: 'Protein', value: '68g', unit: '/ 120g', color: colors.skyBlue },
                  { label: 'Carbs', value: '142g', unit: '/ 200g', color: colors.warmYellow },
                  { label: 'Fat', value: '38g', unit: '/ 60g', color: colors.lavender },
                ].map(m => (
                  <View key={m.label} style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={[styles.macroUnit, { color: colors.mutedForeground }]}>{m.unit}</Text>
                    <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          {/* History */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Scans</Text>
          {SCAN_HISTORY.map((item, i) => {
            const sc = ScoreColor(item.score, colors);
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(200 + i * 80).duration(400)}>
                <TouchableOpacity
                  style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => router.push('/nutrition/result' as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.scoreCircle, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
                    <Text style={[styles.scoreNum, { color: sc }]}>{item.score}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>{item.calories} kcal · {item.protein}g protein</Text>
                  </View>
                  <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>{item.time}</Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 22, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  subtitle: { fontSize: 14, fontFamily: 'Manrope_400Regular', marginTop: 4 },
  scannerSection: { paddingHorizontal: 22, gap: 16 },
  viewfinder: { height: 240, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  corner: { position: 'absolute', width: 24, height: 24 },
  scanLine: { position: 'absolute', left: 20, right: 20, height: 2, opacity: 0.8 },
  viewfinderCenter: { alignItems: 'center' },
  viewfinderIdle: { alignItems: 'center', gap: 10 },
  viewfinderText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, fontFamily: 'Manrope_400Regular' },
  viewfinderScanning: { alignItems: 'center' },
  scanningText: { color: '#A9E4D2', fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  scanControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  controlBtn: { alignItems: 'center', gap: 4, padding: 14, borderRadius: 16, borderWidth: 1, width: 72 },
  controlLabel: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  mainScanBtn: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
  body: { paddingHorizontal: 22, paddingTop: 24, gap: 14 },
  dailySummary: { padding: 16, borderRadius: 18, borderWidth: 1, gap: 14 },
  sectionTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  macroUnit: { fontSize: 10, fontFamily: 'Manrope_400Regular' },
  macroLabel: { fontSize: 11, fontFamily: 'Manrope_600SemiBold' },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 12 },
  scoreCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },
  scoreNum: { fontSize: 15, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  historyMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  historyTime: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
});
