import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/context/NotificationContext';

export default function NotificationsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notices, unreadCount, markAllRead, markRead } = useNotifications();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.side}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]}>Notifications</Text>
        <TouchableOpacity onPress={markAllRead} style={styles.side} disabled={!unreadCount}>
          <Text style={[styles.readAll, { color: unreadCount ? colors.primary : colors.mutedForeground }]}>Read all</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32, gap: 10 }}>
        {notices.length === 0 ? (
          <Text style={[styles.empty, { color: colors.mutedForeground }]}>
            No alerts yet. When a new day starts, new tasks will show up here and on your bell.
          </Text>
        ) : (
          notices.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: item.read ? colors.border : colors.primary + '55' }]}
              onPress={() => {
                markRead(item.id);
                router.push((item.href || '/(tabs)') as never);
              }}
            >
              <View style={[styles.icon, { backgroundColor: colors.primary + '18' }]}>
                <Feather name="sun" size={16} color={colors.primary} />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{item.title}</Text>
                <Text style={[styles.cardBody, { color: colors.mutedForeground }]}>{item.body}</Text>
                <Text style={[styles.time, { color: colors.mutedForeground }]}>
                  {new Date(item.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </Text>
              </View>
              {!item.read ? <View style={[styles.unread, { backgroundColor: colors.primary }]} /> : null}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 10, gap: 8 },
  side: { minWidth: 64, height: 36, justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  readAll: { fontSize: 13, fontFamily: 'Manrope_700Bold', textAlign: 'right' },
  empty: { fontSize: 14, fontFamily: 'Manrope_400Regular', lineHeight: 21, paddingTop: 24 },
  card: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1, alignItems: 'flex-start' },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  cardTitle: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  cardBody: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 18 },
  time: { fontSize: 11, fontFamily: 'Manrope_500Medium', marginTop: 4 },
  unread: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
});
