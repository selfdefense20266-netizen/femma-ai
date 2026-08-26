import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withRepeat, withTiming, cancelAnimation } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { getLastMealScan, scanMealFromBase64, setLastMealScan, type MealScanResult } from '@/lib/mealScan';

type HistoryItem = {
  id: string;
  name: string;
  score: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
};

const DEFAULT_HISTORY: HistoryItem[] = [
  { id: 's1', name: 'Greek Yogurt', score: 92, calories: 130, protein: 17, carbs: 9, fat: 0, time: '8:32 AM' },
  { id: 's2', name: 'Avocado Toast', score: 78, calories: 320, protein: 8, carbs: 38, fat: 16, time: 'Yesterday' },
  { id: 's3', name: 'Protein Bar', score: 65, calories: 210, protein: 20, carbs: 22, fat: 7, time: 'Yesterday' },
];

function ScoreColor(score: number, colors: any) {
  if (score >= 80) return colors.mint;
  if (score >= 60) return colors.warmYellow;
  return colors.coral;
}

function guessMime(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export default function ScanScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [scanning, setScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(DEFAULT_HISTORY);
  const [error, setError] = useState('');

  const scanLineAnim = useSharedValue(0);
  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanLineAnim.value }] }));

  const goalHint = useMemo(() => {
    const goal = profile?.goal || '';
    if (/loss|lean|cut/i.test(goal)) return 'weight-loss friendly nutrition';
    if (/muscle|strength|gain/i.test(goal)) return 'muscle recovery and protein';
    if (/pregnant|prenatal/i.test(goal)) return 'pregnancy-safe nutrition';
    return 'balanced nutrition for women';
  }, [profile?.goal]);

  const stopScanAnim = () => {
    cancelAnimation(scanLineAnim);
    scanLineAnim.value = 0;
  };

  const runScan = async (asset: ImagePicker.ImagePickerAsset) => {
    if (!asset.base64) {
      Alert.alert('Scan failed', 'Could not read that image. Try another photo.');
      return;
    }

    try {
      setError('');
      setScanning(true);
      setPreviewUri(asset.uri);
      scanLineAnim.value = 0;
      scanLineAnim.value = withRepeat(withTiming(200, { duration: 1500 }), -1, true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await scanMealFromBase64({
        imageBase64: asset.base64,
        mimeType: asset.mimeType || guessMime(asset.uri),
        goal: goalHint,
      });

      const item: HistoryItem = {
        id: `scan-${Date.now()}`,
        name: result.name || 'Scanned meal',
        score: Number(result.score) || 0,
        calories: Number(result.calories) || 0,
        protein: Number(result.protein_g) || 0,
        carbs: Number(result.carbs_g) || 0,
        fat: Number(result.fat_g) || 0,
        time: 'Just now',
      };
      setHistory((prev) => [item, ...prev].slice(0, 8));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/nutrition/result' as any);
    } catch (err: any) {
      const message = err?.message || 'Unable to analyze that food photo.';
      setError(message);
      Alert.alert('Scan failed', message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      stopScanAnim();
      setScanning(false);
    }
  };

  const startCameraScan = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission', 'Allow camera access to scan food, or use Gallery instead.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await runScan(result.assets[0]);
    }
  };

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo permission', 'Allow photo library access to scan food.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await runScan(result.assets[0]);
    }
  };

  const openHistory = (item: HistoryItem) => {
    const last = getLastMealScan();
    if (last && last.name === item.name) {
      router.push('/nutrition/result' as any);
      return;
    }
    // Reconstruct a minimal result for older history rows
    const fallback: MealScanResult = {
      name: item.name,
      score: item.score,
      calories: item.calories,
      protein_g: item.protein,
      carbs_g: item.carbs,
      fat_g: item.fat,
      summary: 'Saved from a previous scan.',
      tips: [],
      tags: [],
      ingredients: [],
      alternatives: [],
    };
    setLastMealScan(fallback);
    router.push('/nutrition/result' as any);
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
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          {scanning ? 'Analyzing with Fema AI…' : 'Take or choose a photo for instant nutrition insights'}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        <View style={styles.scannerSection}>
          <View style={[styles.viewfinder, { backgroundColor: colors.charcoal }]}>
            {previewUri ? (
              <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            ) : (
              <LinearGradient colors={['#1a1a2e', '#16213e']} style={StyleSheet.absoluteFill} />
            )}

            {[{ t: 20, l: 20 }, { t: 20, r: 20 }, { b: 20, l: 20 }, { b: 20, r: 20 }].map((pos, i) => (
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
                  <Text style={styles.viewfinderText}>Camera or Gallery</Text>
                </View>
              ) : (
                <View style={styles.viewfinderScanning}>
                  <Text style={styles.scanningText}>Analyzing with GPT-4o…</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.scanControls}>
            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: scanning ? 0.5 : 1 }]}
              onPress={pickImage}
              disabled={scanning}
            >
              <Feather name="image" size={22} color={colors.mutedForeground} />
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mainScanBtn, { backgroundColor: colors.mint, opacity: scanning ? 0.6 : 1 }]}
              onPress={startCameraScan}
              activeOpacity={0.85}
              disabled={scanning}
            >
              <Feather name="camera" size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.controlBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: scanning ? 0.5 : 1 }]}
              onPress={pickImage}
              disabled={scanning}
            >
              <Feather name="upload" size={22} color={colors.mutedForeground} />
              <Text style={[styles.controlLabel, { color: colors.mutedForeground }]}>Upload</Text>
            </TouchableOpacity>
          </View>

          {!!error && (
            <Text style={{ color: colors.coral, fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center' }}>
              {error}
            </Text>
          )}
        </View>

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
                ].map((m) => (
                  <View key={m.label} style={styles.macroItem}>
                    <Text style={[styles.macroValue, { color: m.color }]}>{m.value}</Text>
                    <Text style={[styles.macroUnit, { color: colors.mutedForeground }]}>{m.unit}</Text>
                    <Text style={[styles.macroLabel, { color: colors.mutedForeground }]}>{m.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>

          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Scans</Text>
          {history.map((item, i) => {
            const sc = ScoreColor(item.score, colors);
            return (
              <Animated.View key={item.id} entering={FadeInDown.delay(200 + i * 80).duration(400)}>
                <TouchableOpacity
                  style={[styles.historyItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                  onPress={() => openHistory(item)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.scoreCircle, { backgroundColor: sc + '20', borderColor: sc + '50' }]}>
                    <Text style={[styles.scoreNum, { color: sc }]}>{item.score}</Text>
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={[styles.historyName, { color: colors.foreground }]}>{item.name}</Text>
                    <Text style={[styles.historyMeta, { color: colors.mutedForeground }]}>
                      {item.calories} kcal · {item.protein}g protein
                    </Text>
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
