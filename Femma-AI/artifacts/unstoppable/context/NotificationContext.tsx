import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useApp } from '@/context/AppContext';
import {
  osNotificationPermission,
  requestOsNotificationPermission,
  scheduleDailyTaskReminder,
  sendOsNotification,
} from '@/lib/notify';

export type AppNotice = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

type NotificationContextType = {
  notices: AppNotice[];
  unreadCount: number;
  permission: 'granted' | 'denied' | 'undetermined';
  enabled: boolean;
  askToAllow: () => Promise<boolean>;
  setEnabled: (on: boolean) => Promise<void>;
  markAllRead: () => void;
  markRead: (id: string) => void;
};

const KEYS = {
  notices: 'fema-notices',
  lastDay: 'fema-last-task-day',
  lastJourney: 'fema-last-notified-journey',
  asked: 'fema-notify-asked',
  enabled: 'fema-notify-enabled',
};

const NotificationContext = createContext<NotificationContextType | null>(null);

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function NotificationAskBanner({
  visible,
  onAllow,
  onLater,
}: {
  visible: boolean;
  onAllow: () => void;
  onLater: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!visible) return null;
  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      <View style={[styles.bannerWrap, { paddingBottom: Math.max(insets.bottom, 12) + 64 }]}>
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Allow notifications?</Text>
          <Text style={styles.bannerBody}>
            Get a ping when a new day starts and fresh tasks are ready. You can change this later in Profile.
          </Text>
          <View style={styles.bannerRow}>
            <TouchableOpacity style={styles.laterBtn} onPress={onLater} activeOpacity={0.8}>
              <Text style={styles.laterText}>Not now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.allowBtn} onPress={onAllow} activeOpacity={0.85}>
              <Text style={styles.allowText}>{Platform.OS === 'web' ? 'Allow' : 'Allow notifications'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile, onboardingCompleted, missions } = useApp();
  const [notices, setNotices] = useState<AppNotice[]>([]);
  const [permission, setPermission] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [enabled, setEnabledState] = useState(true);
  const enabledRef = useRef(true);
  const [ready, setReady] = useState(false);
  const [showAsk, setShowAsk] = useState(false);
  const noticesRef = useRef<AppNotice[]>([]);

  const persist = useCallback((next: AppNotice[]) => {
    const sliced = next.slice(0, 40);
    noticesRef.current = sliced;
    setNotices(sliced);
    void AsyncStorage.setItem(KEYS.notices, JSON.stringify(sliced));
  }, []);

  const pushNotice = useCallback(
    async (title: string, body: string, href = '/(tabs)') => {
      const notice: AppNotice = {
        id: `n-${Date.now()}`,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
        href,
      };
      persist([notice, ...noticesRef.current]);
      if (enabledRef.current) await sendOsNotification(title, body);
    },
    [persist]
  );

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const [raw, perm, enabledRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.notices),
          osNotificationPermission(),
          AsyncStorage.getItem(KEYS.enabled),
        ]);
        if (!mounted) return;
        setPermission(perm);
        const on = enabledRaw !== 'false';
        enabledRef.current = on;
        setEnabledState(on);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            noticesRef.current = parsed;
            setNotices(parsed);
          }
        }
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const askToAllow = useCallback(async () => {
    const granted = await requestOsNotificationPermission();
    setPermission(granted ? 'granted' : await osNotificationPermission());
    await AsyncStorage.setItem(KEYS.asked, 'true');
    enabledRef.current = granted;
    setEnabledState(granted);
    await AsyncStorage.setItem(KEYS.enabled, String(granted));
    setShowAsk(false);
    if (granted) await scheduleDailyTaskReminder();
    return granted;
  }, []);

  const setEnabled = useCallback(async (on: boolean) => {
    if (on) {
      const granted = await askToAllow();
      enabledRef.current = granted;
      setEnabledState(granted);
      await AsyncStorage.setItem(KEYS.enabled, String(granted));
      return;
    }
    enabledRef.current = false;
    setEnabledState(false);
    await AsyncStorage.setItem(KEYS.enabled, 'false');
    await AsyncStorage.setItem(KEYS.asked, 'true');
    setShowAsk(false);
  }, [askToAllow]);

  const dismissAsk = useCallback(() => {
    setShowAsk(false);
    void AsyncStorage.setItem(KEYS.asked, 'true');
  }, []);

  const checkNewTasks = useCallback(async () => {
    if (!ready || !onboardingCompleted) return;
    const day = todayKey();
    const [lastDay, lastJourneyRaw] = await Promise.all([
      AsyncStorage.getItem(KEYS.lastDay),
      AsyncStorage.getItem(KEYS.lastJourney),
    ]);
    const lastJourney = Number(lastJourneyRaw) || 0;
    const journey = profile.journeyDay || 1;
    const newCalendarDay = Boolean(lastDay && lastDay !== day);
    const newPlanDay = lastJourney > 0 && journey > lastJourney;
    if (enabledRef.current && (newCalendarDay || newPlanDay)) {
      const count = missions.filter((item) => !item.completed && !item.skipped).length || missions.length;
      await pushNotice(
        'New tasks today',
        `Day ${journey} is ready — ${count} mission${count === 1 ? '' : 's'} waiting for you.`
      );
    }
    await AsyncStorage.setItem(KEYS.lastDay, day);
    await AsyncStorage.setItem(KEYS.lastJourney, String(journey));
  }, [missions, onboardingCompleted, profile.journeyDay, pushNotice, ready]);

  useEffect(() => {
    if (!onboardingCompleted || !ready) return;
    void checkNewTasks();
  }, [checkNewTasks, onboardingCompleted, profile.journeyDay, ready]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void checkNewTasks();
    });
    return () => sub.remove();
  }, [checkNewTasks]);

  useEffect(() => {
    const timer = setInterval(() => void checkNewTasks(), 60_000);
    return () => clearInterval(timer);
  }, [checkNewTasks]);

  useEffect(() => {
    if (!onboardingCompleted || !ready) return;
    let cancelled = false;
    void (async () => {
      const asked = await AsyncStorage.getItem(KEYS.asked);
      if (cancelled) return;
      const perm = await osNotificationPermission();
      if (perm === 'granted') {
        await AsyncStorage.setItem(KEYS.asked, 'true');
        setPermission('granted');
        setShowAsk(false);
        if (enabledRef.current) await scheduleDailyTaskReminder();
        return;
      }
      if (!asked && enabledRef.current) setShowAsk(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [onboardingCompleted, ready]);

  const unreadCount = notices.filter((item) => !item.read).length;

  const value = useMemo(
    () => ({
      notices,
      unreadCount,
      permission,
      enabled,
      askToAllow,
      setEnabled,
      markAllRead: () => persist(notices.map((item) => ({ ...item, read: true }))),
      markRead: (id: string) => persist(notices.map((item) => (item.id === id ? { ...item, read: true } : item))),
    }),
    [askToAllow, enabled, notices, persist, permission, setEnabled, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationAskBanner visible={showAsk} onAllow={() => void askToAllow()} onLater={dismissAsk} />
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
  },
  banner: {
    backgroundColor: '#1C1C22',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  bannerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_800ExtraBold',
  },
  bannerBody: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 13,
    lineHeight: 19,
    fontFamily: 'Manrope_400Regular',
  },
  bannerRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  laterBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  laterText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 14,
  },
  allowBtn: {
    flex: 1.3,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F26BB5',
  },
  allowText: {
    color: '#FFFFFF',
    fontFamily: 'Manrope_800ExtraBold',
    fontSize: 14,
  },
});
