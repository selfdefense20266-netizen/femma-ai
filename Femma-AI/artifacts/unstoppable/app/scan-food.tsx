import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { getLastMealScan, scanMealFromBase64, setLastMealScan } from '@/lib/mealScan';
import {
  formatScanTime,
  loadMealScans,
  saveMealScan,
  todayNutritionTotals,
  type SavedMealScan,
} from '@/lib/mealScanHistory';
import ProgressBar from '@/components/ProgressBar';
import SectionHeader from '@/components/SectionHeader';

type Palette = ReturnType<typeof useColors>;
type ScanMode = 'photo' | 'barcode';

const DAILY_GOALS = {
  calories: 1800,
  protein: 120,
  carbs: 200,
  fat: 60,
};

const SCAN_TIPS = ['Good lighting', 'Center your plate', 'Include all items', 'Avoid glare'];

function scoreColor(score: number, colors: Palette) {
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

function MacroTile({
  label,
  value,
  goal,
  unit,
  color,
  colors,
}: {
  label: string;
  value: number;
  goal: number;
  unit: string;
  color: string;
  colors: Palette;
}) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <View style={styles.macroTile}>
      <View style={styles.macroTileTop}>
        <Text style={[styles.macroTileLabel, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.macroTileValue, { color: colors.foreground }]}>
          {Math.round(value)}
          <Text style={[styles.macroTileUnit, { color: colors.mutedForeground }]}>{unit}</Text>
        </Text>
      </View>
      <ProgressBar progress={pct} color={color} trackColor={colors.muted} height={4} />
      <Text style={[styles.macroTileGoal, { color: colors.mutedForeground }]}>
        {Math.round(pct)}% of {goal}
        {unit === 'kcal' ? '' : unit}
      </Text>
    </View>
  );
}

export default function ScanScreen() {
  const colors = useColors();
  const { profile, completeMission } = useApp();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const [scanning, setScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedMealScan[]>([]);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<ScanMode>('photo');

  const scanLineAnim = useSharedValue(0);
  const scanLineStyle = useAnimatedStyle(() => ({ transform: [{ translateY: scanLineAnim.value }] }));
  const todayTotals = useMemo(() => todayNutritionTotals(history), [history]);

  const cardShadow = Platform.select({
    ios: {
      shadowColor: '#17181C',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.06,
      shadowRadius: 20,
    },
    android: { elevation: 3 },
    default: {},
  });

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const rows = await loadMealScans(user?.email);
        if (!active) return;
        if (rows.length) {
          setHistory(rows);
          return;
        }
        const last = getLastMealScan();
        if (last?.name) {
          const saved = await saveMealScan(last, user?.email);
          if (active) setHistory(saved);
          return;
        }
        setHistory([]);
      })();
      return () => {
        active = false;
      };
    }, [user?.email])
  );

  const goalHint = useMemo(() => {
    const labels = (profile?.goal || '')
      .split(/[,/&+]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' + ') || 'your plan';
    const food = profile?.foodPreference && profile.foodPreference !== 'Eat everything' ? profile.foodPreference : '';
    return food ? `${labels} · ${food}` : labels;
  }, [profile?.goal, profile?.foodPreference]);

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
      scanLineAnim.value = withRepeat(withTiming(220, { duration: 1500 }), -1, true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await scanMealFromBase64({
        imageBase64: asset.base64,
        mimeType: asset.mimeType || guessMime(asset.uri),
        goal: profile?.goal || goalHint,
        foodPreference: profile?.foodPreference,
        durationWeeks: profile?.planDurationWeeks,
        dailyTime: profile?.dailyTime,
      });

      const rows = await saveMealScan(result, user?.email);
      setHistory(rows);
      completeMission('nutrition');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push('/nutrition/result' as never);
    } catch (err: unknown) {
      const raw = err instanceof Error ? err.message : '';
      const message = /failed to send a request|failed to fetch|network/i.test(raw)
        ? 'Could not reach the meal scanner. Try a smaller photo, or check your connection.'
        : raw || 'Unable to analyze that food photo.';
      setError(message);
      Alert.alert('Scan failed', message);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      stopScanAnim();
      setScanning(false);
    }
  };

  const startCameraScan = async () => {
    if (mode === 'barcode') {
      Alert.alert('Coming soon', 'Barcode scanning will be available in a future update.');
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera permission', 'Allow camera access to scan food, or use Gallery instead.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.5,
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
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets?.[0]) {
      await runScan(result.assets[0]);
    }
  };

  const openHistory = (item: SavedMealScan) => {
    setLastMealScan(item.result);
    router.push('/nutrition/result' as never);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        {/* Hero header */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.hero, { paddingTop: topPad }]}
        >
          <View style={styles.heroTop}>
            <TouchableOpacity
              style={[styles.iconBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.back()}
              accessibilityLabel="Go back"
            >
              <Feather name="arrow-left" size={20} color={colors.foreground} />
            </TouchableOpacity>
            <View style={[styles.aiPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
              <Feather name="zap" size={12} color={colors.primary} />
              <Text style={[styles.aiPillText, { color: colors.primary }]}>Fema AI</Text>
            </View>
          </View>

          <Animated.View entering={FadeInDown.duration(420)} style={styles.heroCopy}>
            <View style={[styles.heroBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28', borderWidth: 1 }]}>
              <Feather name="coffee" size={12} color={colors.primary} />
              <Text style={[styles.heroBadgeText, { color: colors.primary }]}>NUTRITION</Text>
            </View>
            <Text style={[styles.title, { color: colors.foreground }]}>Meal Scanner</Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {scanning
                ? 'Analyzing your meal…'
                : 'Snap a photo for instant macros, score, and coach tips'}
            </Text>
          </Animated.View>

          {/* Mode switch */}
          <View style={[styles.modeRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {([
              { id: 'photo' as const, label: 'Photo scan', icon: 'camera' as const },
              { id: 'barcode' as const, label: 'Barcode', icon: 'maximize' as const, soon: true },
            ]).map((item) => {
              const active = mode === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.modeBtn,
                    active && { backgroundColor: colors.primary + '14' },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setMode(item.id);
                  }}
                  activeOpacity={0.85}
                >
                  <Feather name={item.icon} size={15} color={active ? colors.primary : colors.mutedForeground} />
                  <Text style={[styles.modeLabel, { color: active ? colors.primary : colors.mutedForeground }]}>
                    {item.label}
                  </Text>
                  {item.soon ? (
                    <View style={[styles.soonPill, { backgroundColor: colors.lavender + '35' }]}>
                      <Text style={[styles.soonText, { color: colors.foreground }]}>Soon</Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {/* Scanner card */}
          <Animated.View entering={FadeInDown.delay(60).duration(420)}>
            <View style={[styles.scannerCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.viewfinderWrap}>
                <View style={styles.viewfinder}>
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                  ) : (
                    <LinearGradient
                      colors={[colors.softLavender, colors.lavender + '66', colors.primary + '22']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.35)']}
                    style={styles.viewfinderShade}
                  />

                  {[
                    { t: 16, l: 16 },
                    { t: 16, r: 16 },
                    { b: 16, l: 16 },
                    { b: 16, r: 16 },
                  ].map((pos, i) => (
                    <View
                      key={i}
                      style={[
                        styles.corner,
                        { borderColor: colors.primary },
                        pos.t !== undefined ? { top: pos.t } : { bottom: pos.b },
                        pos.l !== undefined ? { left: pos.l } : { right: pos.r },
                        pos.t !== undefined && pos.l !== undefined
                          ? { borderTopWidth: 3, borderLeftWidth: 3 }
                          : undefined,
                        pos.t !== undefined && pos.r !== undefined
                          ? { borderTopWidth: 3, borderRightWidth: 3 }
                          : undefined,
                        pos.b !== undefined && pos.l !== undefined
                          ? { borderBottomWidth: 3, borderLeftWidth: 3 }
                          : undefined,
                        pos.b !== undefined && pos.r !== undefined
                          ? { borderBottomWidth: 3, borderRightWidth: 3 }
                          : undefined,
                      ]}
                    />
                  ))}

                  {scanning ? (
                    <Animated.View style={[styles.scanLine, { backgroundColor: colors.primary }, scanLineStyle]} />
                  ) : null}

                  <View style={styles.viewfinderCenter}>
                    {scanning ? (
                      <View style={[styles.scanningBadge, { backgroundColor: 'rgba(255,255,255,0.92)' }]}>
                        <ActivityIndicator color={colors.primary} size="small" />
                        <Text style={[styles.scanningText, { color: colors.foreground }]}>Analyzing meal…</Text>
                      </View>
                    ) : (
                      <>
                        <View style={[styles.viewfinderIcon, { backgroundColor: 'rgba(255,255,255,0.88)' }]}>
                          <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
                        </View>
                        <Text style={styles.viewfinderHint}>Point at your meal</Text>
                      </>
                    )}
                  </View>
                </View>
              </View>

              <View style={styles.tipRow}>
                {SCAN_TIPS.map((tip) => (
                  <View key={tip} style={[styles.tipChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                    <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.galleryBtn, { backgroundColor: colors.card, borderColor: colors.border, opacity: scanning ? 0.5 : 1 }]}
                  onPress={pickImage}
                  disabled={scanning}
                  activeOpacity={0.85}
                >
                  <Feather name="image" size={18} color={colors.foreground} />
                  <Text style={[styles.galleryBtnText, { color: colors.foreground }]}>Gallery</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flex: 1, opacity: scanning ? 0.65 : 1 }}
                  onPress={startCameraScan}
                  disabled={scanning}
                  activeOpacity={0.88}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.deepPink]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cameraBtn}
                  >
                    <Feather name="camera" size={20} color="#FFFFFF" />
                    <Text style={styles.cameraBtnText}>Scan with Camera</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {!!error && (
                <Text style={[styles.errorText, { color: colors.coral }]}>{error}</Text>
              )}
            </View>
          </Animated.View>

          {/* Today's nutrition */}
          <Animated.View entering={FadeInDown.delay(120).duration(420)}>
            <View style={[styles.summaryCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.summaryHeader}>
                <View>
                  <Text style={[styles.summaryEyebrow, { color: colors.mutedForeground }]}>TODAY</Text>
                  <Text style={[styles.summaryTitle, { color: colors.foreground }]}>Nutrition summary</Text>
                </View>
                <View style={[styles.goalPill, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '28' }]}>
                  <Text style={[styles.goalPillText, { color: colors.primary }]} numberOfLines={1}>
                    {goalHint}
                  </Text>
                </View>
              </View>

              <View style={styles.macroGrid}>
                <MacroTile
                  label="Calories"
                  value={todayTotals.calories}
                  goal={DAILY_GOALS.calories}
                  unit=" kcal"
                  color={colors.primary}
                  colors={colors}
                />
                <MacroTile
                  label="Protein"
                  value={todayTotals.protein}
                  goal={DAILY_GOALS.protein}
                  unit="g"
                  color={colors.skyBlue}
                  colors={colors}
                />
                <MacroTile
                  label="Carbs"
                  value={todayTotals.carbs}
                  goal={DAILY_GOALS.carbs}
                  unit="g"
                  color={colors.warmYellow}
                  colors={colors}
                />
                <MacroTile
                  label="Fat"
                  value={todayTotals.fat}
                  goal={DAILY_GOALS.fat}
                  unit="g"
                  color={colors.lavender}
                  colors={colors}
                />
              </View>
            </View>
          </Animated.View>

          {/* Quick tools */}
          <Animated.View entering={FadeInDown.delay(160).duration(420)} style={styles.toolsRow}>
            {[
              { label: 'Recipes', sub: 'Browse meals', icon: 'book-open', route: '/recipe', gradient: [colors.pink, colors.deepPink] as [string, string] },
              { label: 'Nutrition', sub: 'Learn macros', icon: 'layers', route: '/library/diet-nutrition', gradient: [colors.lavender, colors.pink] as [string, string] },
            ].map((tool) => (
              <TouchableOpacity
                key={tool.route}
                style={[styles.toolCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(tool.route as never);
                }}
                activeOpacity={0.88}
              >
                <LinearGradient colors={tool.gradient} style={styles.toolIcon}>
                  <Feather name={tool.icon as keyof typeof Feather.glyphMap} size={18} color="#FFFFFF" />
                </LinearGradient>
                <Text style={[styles.toolLabel, { color: colors.foreground }]}>{tool.label}</Text>
                <Text style={[styles.toolSub, { color: colors.mutedForeground }]}>{tool.sub}</Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* Recent scans */}
          <Animated.View entering={FadeInDown.delay(200).duration(420)}>
            <SectionHeader title="Recent scans" />
            {history.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '14' }]}>
                  <Feather name="camera" size={22} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No scans yet</Text>
                <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                  Your meal history will appear here after your first scan.
                </Text>
              </View>
            ) : (
              <View style={styles.historyList}>
                {history.slice(0, 8).map((item, i) => {
                  const score = Math.round(Number(item.result.score) || 0);
                  const sc = scoreColor(score, colors);
                  return (
                    <Animated.View key={item.id} entering={FadeInDown.delay(220 + i * 50).duration(360)}>
                      <TouchableOpacity
                        style={[styles.historyItem, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}
                        onPress={() => openHistory(item)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[colors.softLavender, colors.lavender + '44']}
                          style={styles.historyThumb}
                        >
                          <Feather name="coffee" size={18} color={colors.primary} />
                        </LinearGradient>
                        <View style={styles.historyInfo}>
                          <Text style={[styles.historyName, { color: colors.foreground }]} numberOfLines={1}>
                            {item.result.name}
                          </Text>
                          <Text style={[styles.historyMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                            {Math.round(Number(item.result.calories) || 0)} kcal · {Math.round(Number(item.result.protein_g) || 0)}g protein
                          </Text>
                        </View>
                        <View style={styles.historyRight}>
                          <View style={[styles.scoreBadge, { backgroundColor: sc + '22', borderColor: sc + '55' }]}>
                            <Text style={[styles.scoreBadgeText, { color: sc }]}>{score}</Text>
                          </View>
                          <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                            {formatScanTime(item.scannedAt)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 18, gap: 14 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  aiPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  aiPillText: { fontSize: 11.5, fontFamily: 'Manrope_600SemiBold' },
  heroCopy: { gap: 6 },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  heroBadgeText: { fontSize: 10, fontFamily: 'Manrope_700Bold', letterSpacing: 0.6 },
  title: { fontSize: 30, fontFamily: 'Manrope_800ExtraBold', letterSpacing: -0.6, lineHeight: 36 },
  subtitle: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, maxWidth: 320 },
  modeRow: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  modeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  modeLabel: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  soonPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100 },
  soonText: { fontSize: 9, fontFamily: 'Manrope_700Bold' },
  body: { paddingHorizontal: 20, gap: 16, marginTop: 4 },
  scannerCard: { borderRadius: 24, borderWidth: 1, padding: 14, gap: 14 },
  viewfinderWrap: { borderRadius: 20, overflow: 'hidden' },
  viewfinder: { height: 260, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  viewfinderShade: { ...StyleSheet.absoluteFillObject },
  corner: { position: 'absolute', width: 28, height: 28, borderRadius: 4 },
  scanLine: { position: 'absolute', left: 24, right: 24, height: 2, opacity: 0.85 },
  viewfinderCenter: { alignItems: 'center', gap: 10, zIndex: 2 },
  viewfinderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderHint: { color: 'rgba(255,255,255,0.92)', fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  scanningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 100,
  },
  scanningText: { fontSize: 14, fontFamily: 'Manrope_600SemiBold' },
  tipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tipChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  tipText: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  galleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  galleryBtnText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  cameraBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 16,
  },
  cameraBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
  errorText: { fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  summaryCard: { borderRadius: 24, borderWidth: 1, padding: 16, gap: 14 },
  summaryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  summaryEyebrow: { fontSize: 10, fontFamily: 'Manrope_700Bold', letterSpacing: 0.8 },
  summaryTitle: { fontSize: 18, fontFamily: 'Manrope_700Bold', marginTop: 2 },
  goalPill: { maxWidth: '46%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, borderWidth: 1 },
  goalPillText: { fontSize: 10.5, fontFamily: 'Manrope_500Medium' },
  macroGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  macroTile: { width: '48%', gap: 6 },
  macroTileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  macroTileLabel: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  macroTileValue: { fontSize: 15, fontFamily: 'Manrope_800ExtraBold' },
  macroTileUnit: { fontSize: 11, fontFamily: 'Manrope_500Medium' },
  macroTileGoal: { fontSize: 10, fontFamily: 'Manrope_400Regular' },
  toolsRow: { flexDirection: 'row', gap: 10 },
  toolCard: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 12, gap: 6 },
  toolIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 14, fontFamily: 'Manrope_700Bold' },
  toolSub: { fontSize: 11, fontFamily: 'Manrope_400Regular' },
  emptyCard: { borderRadius: 18, borderWidth: 1, padding: 20, alignItems: 'center', gap: 8 },
  emptyIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontFamily: 'Manrope_700Bold' },
  emptySub: { fontSize: 13, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 19 },
  historyList: { gap: 8 },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, gap: 12 },
  historyThumb: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  historyInfo: { flex: 1, minWidth: 0 },
  historyName: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  historyMeta: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  historyRight: { alignItems: 'flex-end', gap: 4 },
  scoreBadge: { minWidth: 36, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 100, borderWidth: 1, alignItems: 'center' },
  scoreBadgeText: { fontSize: 13, fontFamily: 'Manrope_800ExtraBold' },
  historyTime: { fontSize: 10.5, fontFamily: 'Manrope_400Regular' },
});
