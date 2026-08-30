import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let notificationsPromise: Promise<NotificationsModule | null> | null = null;

async function loadNotifications(): Promise<NotificationsModule | null> {
  if (!notificationsPromise) {
    notificationsPromise = import('expo-notifications')
      .then(async (Notifications) => {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('daily-tasks', {
            name: 'Daily tasks',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 180, 80, 180],
            lightColor: '#F26BB5',
          });
        }
        return Notifications;
      })
      .catch(() => null);
  }
  return notificationsPromise;
}

export async function osNotificationPermission(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    return 'undetermined';
  }
  const Notifications = await loadNotifications();
  if (!Notifications) return 'undetermined';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  if (current.status === 'denied') return 'denied';
  return 'undetermined';
}

export async function requestOsNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web' && typeof Notification !== 'undefined') {
    if (Notification.permission === 'granted') return true;
    const result = await Notification.requestPermission();
    return result === 'granted';
  }
  const Notifications = await loadNotifications();
  if (!Notifications) return false;
  const current = await Notifications.getPermissionsAsync();
  const next = current.granted ? current : await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function sendOsNotification(title: string, body: string) {
  if (Platform.OS === 'web' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
    try {
      new Notification(title, { body, icon: '/favicon.ico' });
    } catch {
      // Some browsers block constructor without a service worker.
    }
    return;
  }
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: true },
      trigger: null,
    });
  } catch {
    // In-app inbox still shows the notice.
  }
}

export async function scheduleDailyTaskReminder() {
  const Notifications = await loadNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'New tasks today',
        body: 'Your daily missions are ready. Open Today to start.',
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
        channelId: 'daily-tasks',
      },
    });
  } catch {
    // Web uses the in-app day check instead of a native schedule.
  }
}
