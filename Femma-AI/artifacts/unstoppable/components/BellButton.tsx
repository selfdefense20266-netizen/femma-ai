import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useNotifications } from '@/context/NotificationContext';

export default function BellButton({ size = 40 }: { size?: number }) {
  const colors = useColors();
  const { unreadCount } = useNotifications();
  return (
    <TouchableOpacity
      style={[styles.btn, { width: size, height: size, backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/notifications');
      }}
      accessibilityLabel="Notifications"
      activeOpacity={0.82}
    >
      <Feather name="bell" size={Math.round(size * 0.45)} color={colors.foreground} />
      {unreadCount > 0 ? <View style={[styles.dot, { backgroundColor: colors.primary, borderColor: colors.card }]} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    position: 'relative',
    flexShrink: 0,
  },
  dot: {
    position: 'absolute',
    top: 8,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
});
