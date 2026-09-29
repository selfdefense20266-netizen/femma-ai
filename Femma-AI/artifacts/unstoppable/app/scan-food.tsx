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
  Modal,
  useWindowDimensions,
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
import { usePurchases } from '@/context/PurchaseContext';
import {
  getLastMealScan,
  getLastMealScanPhotoUri,
  scanMealFromBase64,
  setLastMealScan,
  setLastMealScanPhotoUri,
} from '@/lib/mealScan';
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
  const { isPremium } = usePurchases();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const { height: windowHeight } = useWindowDimensions();
  const [scanning, setScanning] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedMealScan[]>([]);
  const [error, setError] = useState('');

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
          const saved = await saveMealScan(last, user?.email, getLastMealScanPhotoUri());
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
      setPreviewUri(asset.uri);
      setScanning(true);
      const sweep = Math.max(180, Math.min(windowHeight * 0.55, 340));
      scanLineAnim.value = 0;
      scanLineAnim.value = withRepeat(withTiming(sweep, { duration: 1400 }), -1, true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await scanMealFromBase64({
        imageBase64: asset.base64,
        mimeType: asset.mimeType || guessMime(asset.uri),
        goal: profile?.goal || goalHint,
        foodPreference: profile?.foodPreference,
        durationWeeks: profile?.planDurationWeeks,
        dailyTime: profile?.dailyTime,
      });

      setLastMealScanPhotoUri(asset.uri);
      const rows = await saveMealScan(result, user?.email, asset.uri);
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

  const checkPremiumAccess = (): boolean => {
    if (!isPremium) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Premium Feature 👑',
        'AI Camera Meal Scanner is a Premium feature. Upgrade to Premium to instantly analyze calories, macros, and nutrition score!',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to Premium', onPress: () => router.push('/paywall') },
        ]
      );
      return false;
    }
    return true;
  };

  const startCameraScan = async () => {
    if (!checkPremiumAccess()) return;
    try {
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
    } catch (err) {
      console.error('[ScanScreen] camera capture failed', err);
      Alert.alert('Camera unavailable', err instanceof Error ? err.message : 'Could not open the camera. Try Gallery instead.');
    }
  };

  const pickImage = async () => {
    if (!checkPremiumAccess()) return;
    try {
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
    } catch (err) {
      console.error('[ScanScreen] gallery picker failed', err);
      Alert.alert('Gallery unavailable', err instanceof Error ? err.message : 'Could not open your photo library.');
    }
  };

  const openHistory = (item: SavedMealScan) => {
    setLastMealScan(item.result);
    setLastMealScanPhotoUri(item.photoUri || null);
    router.push('/nutrition/result' as never);
  };

  if (!isPremium) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.hero, { paddingTop: topPad, paddingBottom: 0 }]}
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
        </LinearGradient>

        <View style={styles.lockedWrap}>
          <View style={[styles.lockedIcon, { backgroundColor: colors.primary + '14' }]}>
            <Feather name="lock" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.lockedTitle, { color: colors.foreground }]}>Meal Scanner is a Premium feature</Text>
          <Text style={[styles.lockedSub, { color: colors.mutedForeground }]}>
            Upgrade to Premium to instantly analyze calories, macros, and nutrition score from a photo of your meal.
          </Text>
          <TouchableOpacity
            style={{ width: '100%' }}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push('/paywall');
            }}
            activeOpacity={0.88}
          >
            <LinearGradient
              colors={[colors.primary, colors.deepPink]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.lockedCta}
            >
              <Feather name="star" size={18} color="#FFFFFF" />
              <Text style={styles.lockedCtaText}>Upgrade to Premium</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
        </LinearGradient>

        <View style={styles.body}>
          {/* Scanner card */}
          <Animated.View entering={FadeInDown.delay(60).duration(420)}>
            <View style={[styles.scannerCard, cardShadow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.viewfinderWrap}>
                <View style={styles.viewfinder}>
                  {previewUri ? (
                    <Image source={{ uri: previewUri }} style={StyleSheet.absoluteFillObject} resizeMode="contain" />
                  ) : (
                    <LinearGradient
                      colors={[colors.softLavender, colors.lavender + '66', colors.primary + '22']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFill}
                    />
                  )}

                  <LinearGradient
                    colors={previewUri ? ['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.28)'] : ['transparent', 'rgba(0,0,0,0.35)']}
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
                    <>
                      <View style={styles.viewfinderProcessDim} />
                      <Animated.View
                        style={[
                          styles.scanLine,
                          { backgroundColor: colors.primary, shadowColor: colors.primary },
                          scanLineStyle,
                        ]}
                      />
                      <View
                        style={[
                          styles.processingBadge,
                          { backgroundColor: 'rgba(23, 24, 28, 0.78)', borderColor: colors.primary + 'AA' },
                        ]}
                      >
                        <Feather name="refresh-cw" size={13} color={colors.primary} />
                        <Text style={[styles.processingBadgeText, { color: colors.primary }]}>PROCESSING...</Text>
                      </View>
                    </>
                  ) : null}

                  {!scanning ? (
                  <View style={styles.viewfinderCenter}>
                    {previewUri ? (
                      <Text style={styles.viewfinderHint}>Ready to scan this photo</Text>
                    ) : (
                      <>
                        <View style={[styles.viewfinderIcon, { backgroundColor: 'rgba(255,255,255,0.88)' }]}>
                          <Ionicons name="restaurant-outline" size={28} color={colors.primary} />
                        </View>
                        <Text style={styles.viewfinderHint}>Point at your meal</Text>
                      </>
                    )}
                  </View>
                  ) : null}
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
                        {item.photoUri ? (
                          <Image source={{ uri: item.photoUri }} style={styles.historyThumb} resizeMode="contain" />
                        ) : (
                          <LinearGradient
                            colors={[colors.softLavender, colors.lavender + '44']}
                            style={styles.historyThumb}
                          >
                            <Feather name="coffee" size={18} color={colors.primary} />
                          </LinearGradient>
                        )}
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

      <Modal visible={scanning && Boolean(previewUri)} animationType="fade" transparent statusBarTranslucent>
        <View style={styles.scanOverlay}>
          <View style={styles.scanOverlayCard}>
            <Image source={{ uri: previewUri || '' }} style={styles.scanOverlayPhoto} resizeMode="contain" />
            <View style={styles.scanOverlayDim} />
            <Animated.View
              style={[
                styles.scanOverlayLine,
                {
                  backgroundColor: colors.primary,
                  shadowColor: colors.primary,
                },
                scanLineStyle,
              ]}
            />
            <View
              style={[
                styles.processingBadge,
                {
                  backgroundColor: 'rgba(23, 24, 28, 0.78)',
                  borderColor: colors.primary + 'AA',
                },
              ]}
            >
              <Feather name="refresh-cw" size={14} color={colors.primary} />
              <Text style={[styles.processingBadgeText, { color: colors.primary }]}>PROCESSING...</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  lockedWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 14 },
  lockedIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  lockedTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold', textAlign: 'center' },
  lockedSub: { fontSize: 14, fontFamily: 'Manrope_400Regular', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  lockedCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 54,
    borderRadius: 27,
    paddingHorizontal: 20,
  },
  lockedCtaText: { color: '#FFFFFF', fontSize: 15, fontFamily: 'Manrope_700Bold' },
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
  body: { paddingHorizontal: 20, gap: 16, marginTop: 4 },
  scannerCard: { borderRadius: 24, borderWidth: 1, padding: 14, gap: 14 },
  viewfinderWrap: { borderRadius: 20, overflow: 'hidden' },
  viewfinder: { height: 260, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  viewfinderShade: { ...StyleSheet.absoluteFillObject },
  corner: { position: 'absolute', width: 28, height: 28, borderRadius: 4 },
  scanLine: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 12,
    height: 3,
    borderRadius: 2,
    opacity: 0.95,
    zIndex: 3,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 4,
  },
  viewfinderProcessDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    zIndex: 2,
  },
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
  processingBadge: {
    position: 'absolute',
    alignSelf: 'center',
    top: '46%',
    zIndex: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  processingBadgeText: {
    fontSize: 12,
    fontFamily: 'Manrope_800ExtraBold',
    letterSpacing: 1.2,
  },
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
  scanOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  scanOverlayCard: {
    width: '100%',
    maxWidth: 420,
    aspectRatio: 1,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanOverlayPhoto: { ...StyleSheet.absoluteFillObject },
  scanOverlayDim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1 },
  scanOverlayLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16,
    height: 3,
    borderRadius: 2,
    opacity: 0.95,
    zIndex: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 10,
    elevation: 5,
  },
});
