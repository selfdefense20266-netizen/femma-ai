import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import ProgressRing from '@/components/ProgressRing';
import { useApp } from '@/context/AppContext';
import { getYogaSession } from '@/data/yogaSessions';

export default function YogaSessionScreen() {
  const colors = useColors();
  const { completeMission } = useApp();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const sessionId = Array.isArray(params.id) ? params.id[0] : params.id;
  const session = getYogaSession(sessionId);
  const poses = session?.poses ?? [];
  const totalSeconds = (session?.duration || 15) * 60;
  const [playing, setPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(totalSeconds);
  const [sessionDone, setSessionDone] = useState(false);

  const elapsed = totalSeconds - timeLeft;
  const currentPose = poses.length
    ? Math.min(poses.length - 1, Math.floor((elapsed / totalSeconds) * poses.length))
    : 0;

  const finishSession = () => {
    setSessionDone((already) => {
      if (already) return true;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      completeMission('yoga');
      return true;
    });
    setPlaying(false);
  };

  useEffect(() => {
    if (!playing || sessionDone) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => (t <= 1 ? 0 : t - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [playing, sessionDone]);

  useEffect(() => {
    setTimeLeft(totalSeconds);
    setPlaying(false);
    setSessionDone(false);
  }, [sessionId, totalSeconds]);

  useEffect(() => {
    if (timeLeft === 0 && !sessionDone) finishSession();
  }, [timeLeft, sessionDone]);

  const mins = Math.floor(timeLeft / 60);
  const secs = timeLeft % 60;
  const progress = 1 - timeLeft / totalSeconds;

  const title = session?.title || 'Yoga session';
  const subtitle = session?.subtitle || `${session?.duration || 15} min · ${session?.level || 'All levels'}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={[colors.lavender + 'AA', colors.background]} style={styles.hero}>
        <View style={[styles.heroHeader, { paddingTop: topPad }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Feather name="arrow-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="bookmark" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
        <View style={styles.heroContent}>
          <Text style={[styles.heroTitle, { color: colors.foreground }]}>{title}</Text>
          <Text style={[styles.heroSub, { color: colors.mutedForeground }]}>{subtitle}</Text>
        </View>
      </LinearGradient>

      {sessionDone ? (
        <View style={styles.doneWrap}>
          <View style={[styles.doneIcon, { backgroundColor: colors.lavender }]}>
            <Feather name="check" size={32} color="#FFFFFF" />
          </View>
          <Text style={[styles.doneTitle, { color: colors.foreground }]}>Session complete</Text>
          <Text style={[styles.doneText, { color: colors.mutedForeground }]}>
            Beautiful work. You showed up for your body today — that is the whole practice.
          </Text>
          <TouchableOpacity
            style={[styles.homeBtn, { backgroundColor: colors.lavender }]}
            onPress={() => router.replace('/(tabs)')}
            activeOpacity={0.85}
          >
            <Text style={styles.homeBtnText}>Back to Today</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.playerSection}>
            <ProgressRing
              progress={progress}
              size={160}
              strokeWidth={10}
              color={colors.lavender}
              label={`${mins}:${secs.toString().padStart(2, '0')}`}
              sublabel="remaining"
            />

            <View style={styles.playerControls}>
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: colors.muted }]}
                onPress={() => setTimeLeft((t) => Math.min(totalSeconds, t + 30))}
              >
                <Feather name="rewind" size={20} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: colors.lavender }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setPlaying((p) => !p);
                }}
              >
                <Feather name={playing ? 'pause' : 'play'} size={28} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ctrlBtn, { backgroundColor: colors.mint + '40' }]}
                onPress={finishSession}
                accessibilityLabel="Mark session done"
              >
                <Feather name="check" size={20} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.poseList} showsVerticalScrollIndicator={false}>
            <Text style={[styles.posesTitle, { color: colors.foreground }]}>Sequence</Text>
            {poses.map((pose, i) => {
              const marked = i < currentPose;
              const active = playing && i === currentPose;
              return (
                <View
                  key={pose.name}
                  style={[
                    styles.poseItem,
                    {
                      backgroundColor: marked ? colors.lavender + '14' : colors.card,
                      borderColor: active ? colors.lavender : colors.border,
                    },
                  ]}
                >
                  <View style={[styles.poseNum, { backgroundColor: marked ? colors.lavender : colors.lavender + '20' }]}>
                    {marked ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <Text style={[styles.poseNumText, { color: colors.lavender }]}>{i + 1}</Text>
                    )}
                  </View>
                  <Text style={[styles.poseName, { color: colors.foreground }]}>{pose.name}</Text>
                  <Text style={[styles.poseDuration, { color: colors.mutedForeground }]}>{pose.duration}</Text>
                </View>
              );
            })}
            <View style={{ height: botPad + 40 }} />
          </ScrollView>
        </>
      )}
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
  doneWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  doneIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  doneTitle: { fontSize: 24, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  doneText: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22, textAlign: 'center', marginBottom: 12 },
  homeBtn: { height: 52, borderRadius: 26, paddingHorizontal: 28, justifyContent: 'center' },
  homeBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
});
