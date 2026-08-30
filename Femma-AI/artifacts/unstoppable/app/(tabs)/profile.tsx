import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Pressable, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES, LEVEL_COLORS } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { usePurchases } from '@/context/PurchaseContext';
import { useNotifications } from '@/context/NotificationContext';
import BellButton from '@/components/BellButton';

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function ProfileScreen() {
  const colors = useColors();
  const { profile } = useApp();
  const { logout, user } = useAuth();
  const { isPremium } = usePurchases();
  const { enabled: notifyOn, setEnabled: setNotifyEnabled } = useNotifications();
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : profile.name;
  const insets = useSafeAreaInsets();
  const topPad = insets.top + 8;
  const botPad = Math.max(insets.bottom, 12);

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const levelName = LEVEL_NAMES[profile.level];
  const levelColor = LEVEL_COLORS[profile.level];

  useEffect(() => {
    void AsyncStorage.getItem('fema-avatar-uri').then((value) => {
      if (value) setAvatarUri(value);
    });
  }, []);

  const saveAvatar = (uri: string | null) => {
    setAvatarUri(uri);
    if (uri) void AsyncStorage.setItem('fema-avatar-uri', uri);
    else void AsyncStorage.removeItem('fema-avatar-uri');
  };

  const pickFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access', 'Allow photo library access to set your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) saveAvatar(result.assets[0].uri);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Camera', 'Allow camera access to take a profile picture.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]?.uri) saveAvatar(result.assets[0].uri);
  };

  const pickAvatar = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === 'web') {
      void pickFromLibrary();
      return;
    }
    Alert.alert('Profile photo', 'Choose a new photo', [
      { text: 'Take photo', onPress: () => void takePhoto() },
      { text: 'Photo library', onPress: () => void pickFromLibrary() },
      ...(avatarUri ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => saveAvatar(null) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const confirmLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
      setLogoutOpen(false);
      router.replace('/welcome');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: botPad + 100 }}>
        {/* Profile Header */}
        <LinearGradient
          colors={[colors.softLavender, colors.background]}
          style={[styles.profileHeader, { paddingTop: topPad }]}
        >
          <View style={styles.headerTop}>
            <View style={{ width: 40 }} />
            <View style={[styles.levelTag, { backgroundColor: levelColor + '20', borderColor: levelColor + '40' }]}>
              <Feather name="award" size={12} color={levelColor} />
              <Text style={[styles.levelTagText, { color: levelColor }]}>{levelName} · {profile.points.toLocaleString()} pts</Text>
            </View>
            <BellButton />
          </View>
          <View style={styles.avatarSection}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, { backgroundColor: levelColor }]}>
                <Text style={styles.avatarLetter}>{(displayName || 'U')[0]}</Text>
              </View>
            )}
            <TouchableOpacity
              style={[styles.editAvatarBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={pickAvatar}
              accessibilityLabel="Change profile photo"
            >
              <Feather name="camera" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{displayName}</Text>
        </LinearGradient>

        {/* Plan Card */}
        <Animated.View entering={FadeInDown.delay(100).duration(500)} style={styles.body}>
          <View style={[styles.planCard, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
            <Feather name="zap" size={18} color={colors.primary} />
            <View style={styles.planInfo}>
              <Text style={[styles.planName, { color: colors.foreground }]}>{profile.planName}</Text>
              <Text style={[styles.planDay, { color: colors.mutedForeground }]}>Day {profile.journeyDay} · {profile.streak} day streak</Text>
            </View>
          </View>

          <View style={[styles.settingsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
              <View style={[styles.settingsIcon, { backgroundColor: '#FFD88A18' }]}>
                <Feather name="bell" size={17} color="#E5A020" />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Notifications</Text>
                <Text style={[styles.settingsDetail, { color: colors.mutedForeground }]}>
                  {notifyOn ? 'Alerts are on' : 'Alerts are off'}
                </Text>
              </View>
              <Switch
                value={notifyOn}
                onValueChange={(value) => {
                  Haptics.selectionAsync();
                  void setNotifyEnabled(value);
                }}
                trackColor={{ false: '#E6E3DE', true: '#F26BB5' }}
                thumbColor={notifyOn ? '#2FA88F' : '#FFFFFF'}
                ios_backgroundColor="#E6E3DE"
              />
            </View>

            <TouchableOpacity
              style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/paywall' as never);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIcon, { backgroundColor: '#D94A9A18' }]}>
                <Feather name="star" size={17} color="#D94A9A" />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>Subscription</Text>
                <Text style={[styles.settingsDetail, { color: colors.mutedForeground }]}>
                  {isPremium ? 'Premium is active' : 'Unlock Premium'}
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.settingsItem, { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setLogoutOpen(true);
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIcon, { backgroundColor: colors.destructive + '18' }]}>
                <Feather name="log-out" size={17} color={colors.destructive} />
              </View>
              <Text style={[styles.settingsLabel, { color: colors.destructive, flex: 1 }]}>Log Out</Text>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <View style={styles.settingsItem}>
              <View style={[styles.settingsIcon, { backgroundColor: '#77CDED18' }]}>
                <Feather name="info" size={17} color="#3D9FD4" />
              </View>
              <View style={styles.settingsCopy}>
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>App version</Text>
                <Text style={[styles.settingsDetail, { color: colors.mutedForeground }]}>Femma AI {APP_VERSION}</Text>
              </View>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal visible={logoutOpen} transparent animationType="fade" onRequestClose={() => setLogoutOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => !loggingOut && setLogoutOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => {}}>
            <View style={[styles.modalIcon, { backgroundColor: colors.destructive + '14' }]}>
              <Feather name="log-out" size={22} color={colors.destructive} />
            </View>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log out?</Text>
            <Text style={[styles.modalBody, { color: colors.mutedForeground }]}>
              You will need to sign in again to see your plan, missions, and progress.
            </Text>
            <TouchableOpacity
              style={[styles.modalLogout, { backgroundColor: colors.destructive }]}
              onPress={() => void confirmLogout()}
              disabled={loggingOut}
              activeOpacity={0.85}
            >
              {loggingOut ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.modalLogoutText}>Log Out</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutOpen(false)} disabled={loggingOut}>
              <Text style={[styles.modalCancelText, { color: colors.foreground }]}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', overflow: 'hidden' },
  profileHeader: { paddingHorizontal: 22, paddingBottom: 16, alignItems: 'center', gap: 8 },
  headerTop: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  avatarSection: { position: 'relative' },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
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
  premiumBanner: { borderRadius: 16, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  premiumTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', fontFamily: 'Manrope_800ExtraBold' },
  premiumSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontFamily: 'Manrope_400Regular', marginTop: 2 },
  sectionTitle: { fontSize: 12, fontWeight: '700', fontFamily: 'Manrope_700Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  settingsCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden' },
  settingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, gap: 12 },
  settingsIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  settingsCopy: { flex: 1, minWidth: 0, gap: 2 },
  settingsLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
  settingsDetail: { fontSize: 12, fontFamily: 'Manrope_400Regular', lineHeight: 16 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 10 },
  logoutText: { fontSize: 15, fontWeight: '600', fontFamily: 'Manrope_600SemiBold' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(20,18,24,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { borderRadius: 22, borderWidth: 1, padding: 22, alignItems: 'center', gap: 10 },
  modalIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 20, fontFamily: 'Manrope_800ExtraBold' },
  modalBody: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 20, textAlign: 'center', marginBottom: 8 },
  modalLogout: { width: '100%', height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  modalLogoutText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  modalCancel: { height: 40, alignItems: 'center', justifyContent: 'center' },
  modalCancelText: { fontSize: 15, fontFamily: 'Manrope_600SemiBold' },
});
