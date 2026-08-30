import React from 'react';
import { Platform, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { isLiquidGlassAvailable } from 'expo-glass-effect';
import { Icon, Label, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { SymbolView } from 'expo-symbols';
import CoachIcon from '@/components/CoachIcon';

const TAB_ICONS: Record<string, { ios: string; feather: keyof typeof Feather.glyphMap }> = {
  index: { ios: 'sun.max', feather: 'sun' },
  explore: { ios: 'safari', feather: 'compass' },
  coach: { ios: 'message', feather: 'message-circle' },
  progress: { ios: 'chart.bar', feather: 'bar-chart-2' },
  profile: { ios: 'person', feather: 'user' },
};

function TabIcon({ name, color }: { name: string; color: string }) {
  if (name === 'coach') return <CoachIcon size={22} color={color} />;
  if (Platform.OS === 'ios' && TAB_ICONS[name]) {
    return <SymbolView name={TAB_ICONS[name].ios as never} tintColor={color} size={22} />;
  }
  return <Feather name={TAB_ICONS[name]?.feather || 'circle'} size={20} color={color} />;
}

function CustomTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: { index: number; routes: Array<{ key: string; name: string }> };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void; emit: (event: { type: string; target: string; canPreventDefault: boolean }) => { defaultPrevented: boolean } };
}) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const isDark = colorScheme === 'dark';
  const isIOS = Platform.OS === 'ios';
  const isWeb = Platform.OS === 'web';
  const padBottom = isWeb ? 12 : Math.max(insets.bottom, 10);

  return (
    <View style={[styles.bar, { paddingBottom: padBottom, borderTopColor: colors.border, borderTopWidth: isWeb ? 1 : 0 }]}>
      {isIOS ? (
        <BlurView intensity={100} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
      )}
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const color = focused ? colors.primary : colors.mutedForeground;
        const label = descriptors[route.key]?.options.title || route.name;
        return (
          <Pressable
            key={route.key}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <TabIcon name={route.name} color={color} />
            <Text allowFontScaling={false} style={[styles.label, { color }]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function NativeTabLayout() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
        <Label>Today</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="explore">
        <Icon sf={{ default: 'safari', selected: 'safari.fill' }} />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="coach">
        <Icon sf={{ default: 'message', selected: 'message.fill' }} />
        <Label>Coach</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="progress">
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
        <Label>Progress</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <Icon sf={{ default: 'person', selected: 'person.fill' }} />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}

function ClassicTabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...(props as never)} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Today' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach' }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}

export default function TabLayout() {
  let glass = false;
  try {
    glass = Platform.OS === 'ios' && isLiquidGlassAvailable();
  } catch {
    glass = false;
  }
  if (glass) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    overflow: 'visible',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 2,
    paddingBottom: 6,
    gap: 5,
  },
  label: {
    fontSize: 11,
    lineHeight: 20,
    fontFamily: 'Manrope_600SemiBold',
    textAlign: 'center',
    paddingBottom: 2,
  },
});
