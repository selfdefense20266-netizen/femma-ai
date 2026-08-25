import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import ProgressRing from '@/components/ProgressRing';
import { useApp } from '@/context/AppContext';

export default function YogaSessionScreen() {
  const colors = useColors();
  const { completeMission } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15 * 60);

  useEffect(() => {
    if (!playing) return;
    const interval = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
    return () => clearInterval(interval);
  }, [playing]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / (15 * 60);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.lavender + 'AA', colors.background]} style={styles.hero}>
        <View style={[styles.heroHeader, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bookmark" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.heroContent}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>Stress Relief Sequence</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>15 min · All levels · Release tension</Text>
        </View>
      </LinearGradient>

      <View style={styles.playerSection}>
        <ProgressRing progress={progress} size={160} strokeWidth={10} color={colors.lavender} label={`${mins}:${secs.toString().padStart(2, '0')}`} sublabel="remaining" />

        <View style={styles.playerControls}>
          <TouchableOpacity style={[styles.ctrlBtn, { backgroundColor: colors.muted }]} onPress={() => setTimeLeft(t => Math.min(15 * 60, t + 30))}>
            <Feather name="rewind" size={20} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.playBtn, { backgroundColor: colors.lavender }]}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); setPlaying(p => !p); }}
          >
            <Feather name={playing ? 'pause' : 'play'} size={28} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: colors.muted }]}
            onPress={() => { completeMission('2'); router.replace('/(tabs)'); }}
          >
            <Feather name="check" size={20} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.poseList} showsVerticalScrollIndicator={false}>
        <Text style={[styles.posesTitle, { color: colors.foreground }]}>Sequence</Text>
        {['Child\'s Pose', 'Cat-Cow Stretch', 'Seated Forward Fold', 'Supine Twist', 'Legs Up the Wall', 'Savasana'].map((pose, i) => (
          <View key={pose} style={[styles.poseItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.poseNum, { backgroundColor: colors.lavender + '20' }]}>
              <Text style={[styles.poseNumText, { color: colors.lavender }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.poseName, { color: colors.foreground }]}>{pose}</Text>
            <Text style={[styles.poseDuration, { color: colors.mutedForeground }]}>1-2 min</Text>
          </View>
        ))}
        <View style={{ height: botPad + 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingHorizontal: 22, paddingBottom: 16 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  saveBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  heroContent: { gap: 4 },
  heroTitle: { fontSize: 24, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  heroSub: { fontSize: 14, fontFamily: 'Manrope_400Regular' },
  playerSection: { alignItems: 'center', paddingVertical: 20, gap: 20 },
  playerControls: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  ctrlBtn: { width: 52, height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center' },
  playBtn: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center' },
  poseList: { flex: 1, paddingHorizontal: 22 },
  posesTitle: { fontSize: 17, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 10 },
  poseItem: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  poseNum: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  poseNumText: { fontSize: 14, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  poseName: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  poseDuration: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
});
