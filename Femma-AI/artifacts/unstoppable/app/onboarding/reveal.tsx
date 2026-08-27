import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { planNameForGoal, weekPreview } from '@/lib/dailyMissions';

export default function RevealScreen() {
  const colors = useColors();
  const { completeOnboarding, profile } = useApp();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);
  const planName = planNameForGoal(profile.goal);
  const schedule = weekPreview(profile.goal);

  const handleStart = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    completeOnboarding({
      planName,
      journeyDay: 1,
      name: user ? `${user.firstName} ${user.lastName}`.trim() : '',
    });
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <LinearGradient colors={[colors.softLavender, colors.background]} style={styles.hero}>
          <View style={{ paddingTop: topPad + 24, paddingHorizontal: 24 }}>
            <Animated.View entering={FadeInDown.delay(100).duration(600)}>
              <View style={[styles.planBadge, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '40' }]}>
                <Feather name="star" size={14} color={colors.primary} />
                <Text style={[styles.planBadgeText, { color: colors.primary }]}>Your AI Plan Is Ready</Text>
              </View>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>{planName.replace(' Plan', '')}{'\n'}Plan</Text>
              <Text style={[styles.heroSubtitle, { color: colors.mutedForeground }]}>
                Personalized 8-week journey built around {profile.goal ? profile.goal.toLowerCase() : 'your goals'}.
              </Text>
            </Animated.View>

            {/* Plan Stats */}
            <Animated.View entering={FadeInDown.delay(300).duration(600)} style={styles.statsRow}>
              {[
                { value: '5', label: 'Missions/day', color: colors.pink },
                { value: '8', label: 'Weeks', color: colors.lavender },
                { value: '3', label: 'Categories', color: colors.skyBlue },
              ].map(s => (
                <View key={s.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                </View>
              ))}
            </Animated.View>
          </View>
        </LinearGradient>

        {/* Weekly Schedule */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Your Week 1 Schedule</Text>
          {schedule.map((day, i) => (
            <Animated.View key={day.day} entering={FadeInDown.delay(500 + i * 60).duration(400)}>
              <View style={[styles.scheduleRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.dayBadge, { backgroundColor: i === 0 ? colors.primary : colors.muted }]}>
                  <Text style={[styles.dayText, { color: i === 0 ? '#FFFFFF' : colors.mutedForeground }]}>{day.day}</Text>
                </View>
                <View style={styles.dayItems}>
                  {day.items.map(item => (
                    <Text key={item} style={[styles.dayItem, { color: colors.foreground }]}>• {item}</Text>
                  ))}
                </View>
              </View>
            </Animated.View>
          ))}
        </View>

        {/* Motivational */}
        <View style={[styles.quoteCard, { backgroundColor: colors.softLavender, marginHorizontal: 24 }]}>
          <Text style={[styles.quoteText, { color: colors.foreground }]}>
            "Small steps build unstoppable confidence."
          </Text>
          <Text style={[styles.quoteAttrib, { color: colors.mutedForeground }]}>Your UNSTOPPABLE plan is waiting.</Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: botPad + 24 }]}>
        <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>Start My Journey</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { paddingBottom: 24 },
  planBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 100, borderWidth: 1, marginBottom: 16 },
  planBadgeText: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  heroTitle: { fontSize: 36, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold', lineHeight: 44, marginBottom: 10 },
  heroSubtitle: { fontSize: 15, fontFamily: 'Manrope_400Regular', lineHeight: 22 },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  statCard: { flex: 1, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 28, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  statLabel: { fontSize: 11, fontFamily: 'Manrope_400Regular', textAlign: 'center' },
  section: { paddingHorizontal: 24, paddingTop: 24, gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold', marginBottom: 6 },
  scheduleRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, gap: 14 },
  dayBadge: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dayText: { fontSize: 13, fontWeight: '700', fontFamily: 'Manrope_700Bold' },
  dayItems: { flex: 1, gap: 2 },
  dayItem: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
  quoteCard: { padding: 20, borderRadius: 20, marginTop: 24, marginBottom: 8 },
  quoteText: { fontSize: 18, fontWeight: '700', fontFamily: 'Manrope_700Bold', lineHeight: 26, marginBottom: 8 },
  quoteAttrib: { fontSize: 13, fontFamily: 'Manrope_400Regular' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 16 },
  startBtn: { height: 56, borderRadius: 28, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8 },
  startBtnText: { fontSize: 17, fontWeight: '700', color: '#FFFFFF', fontFamily: 'Manrope_700Bold' },
});
