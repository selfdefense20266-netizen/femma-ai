import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, LEVEL_COLORS } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';

const SETTINGS_SECTIONS = [
  {
    title: 'Your Plan',
    items: [
      { label: 'Personal Goals', icon: 'target', color: '#F26BB5' },
      { label: 'Plan Preferences', icon: 'sliders', color: '#B9A7F2' },
      { label: 'Connected Devices', icon: 'watch', color: '#77CDED' },
    ],
  },
  {
    title: 'Health & Wellness',
    items: [
      { label: 'Cycle Settings', icon: 'calendar', color: '#FF928F' },
      { label: 'Pregnancy Settings', icon: 'heart', color: '#F26BB5' },
      { label: 'Food & Allergies', icon: 'coffee', color: '#A9E4D2' },
    ],
  },
  {
    title: 'Safety',
    items: [
      { label: 'Emergency Contacts', icon: 'phone', color: '#77CDED' },
      { label: 'Safety Settings', icon: 'shield', color: '#B9A7F2' },
      { label: 'Privacy Settings', icon: 'lock', color: '#747985' },
    ],
  },
  {
    title: 'App',
    items: [
      { label: 'Notifications', icon: 'bell', color: '#FFD88A' },
      { label: 'Subscription', icon: 'star', color: '#D94A9A' },
      { label: 'Help Center', icon: 'help-circle', color: '#77CDED' },
    ],
  },
];

export default function ProfileScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const { logout, user } = useAuth();
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : profile.name;
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        {/* Profile Header */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.profileHeader, { paddingTop: topPad + 16 }]}
        >
          <View style={styles.avatarSection}>
            <View style={[styles.avatar, { backgroundColor: levelColor }]}>
              <Text style={styles.avatarLetter}>{(displayName || 'U')[0]}</Text>
            </View>
            <TouchableOpacity style={[styles.editAvatarBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="camera" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
          <View style={[styles.levelTag, { backgroundColor: levelColor + '20', borderColor: levelColor + '40' }]}>
            <Feather name="award" size={12} color={levelColor} />
            <Text style={[styles.levelTagText, { color: levelColor }]}>{levelName} · {profile.points.toLocaleString()} pts</Text>
          </View>
        </LinearGradient>

        {/* Plan Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.body}>
          <View style={[styles.planCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: colors.foreground }]}>{profile.planName}</Text>
              <Text style={[styles.planDay, { color: colors.mutedForeground }]}>Day {profile.journeyDay} · {profile.streak} day streak</Text>
            </View>
            <TouchableOpacity style={[styles.planEditBtn, { backgroundColor: colors.primary }]}>
              <Feather name="edit-2" size={14} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Premium Banner */}
          <TouchableOpacity activeOpacity={0.9}>
            <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.premiumBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <View>
                <Text style={styles.premiumTitle}>Unlock Premium</Text>
                <Text style={styles.premiumSub}>AI recipes, advanced plans & more</Text>
              </View>
              <Feather name="arrow-right" size={20} color="#FFFFFF" />
            </LinearGradient>
          </TouchableOpacity>

          {/* Settings */}
          {SETTINGS_SECTIONS.map((section, si) => (
            <Animated.View key={section.title} entering={FadeInDown.delay(200 + si * 80).duration(400)}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{section.title}</Text>
              <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {section.items.map((item, ii) => (
                  <TouchableOpacity
                    key={item.label}
                    style={[styles.settingsItem, ii < section.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
                    onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingsIcon, { backgroundColor: item.color + '18' }]}>
                      <Feather name={item.icon as any} size={17} color={item.color} />
                    </View>
                    <Text style={[styles.settingsLabel, { color: colors.foreground }]}>{item.label}</Text>
                    <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          ))}

          {/* Logout */}
          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={18} color={colors.destructive} />
            <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { paddingHorizontal: 22, paddingBottom: 24, alignItems: 'center', gap: 8 },
  avatarSection: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', fontFamily: 'Manrope_800ExtraBold' },
  editAvatarBtn: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  profileName: { fontSize: 22, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  levelTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  levelTagText: { fontSize: 12, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  body: { paddingHorizontal: 22, paddingTop: 8, gap: 16 },
  planCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 16, borderWidth: 1, gap: 12 },
  planInfo: { flex: 1 },
  planName: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  planDay: { fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  planEditBtn: { width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center' },
  premiumBanner: { borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  premiumSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingsLabel: { flex: 1, fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  logoutText: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
});
