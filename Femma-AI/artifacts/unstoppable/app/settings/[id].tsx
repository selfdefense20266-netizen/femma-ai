import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { useNotifications } from '@/context/NotificationContext';
import { ONBOARDING_GOALS } from '@/lib/nutritionPlan';
import { planNameForGoal } from '@/lib/dailyMissions';
import { generateRoadmapTrainingPlan } from '@/lib/exerciseRoadmap';
import { DURATION_OPTIONS } from '@/lib/trainingPlan';

const TIMES = ['15 min', '20–30 min', '30–45 min', '45–60 min', '60+ min'];
const LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'active', label: 'Active' },
];
const ENVS = [
  { id: 'home', label: 'Home' },
  { id: 'gym', label: 'Gym' },
  { id: 'both', label: 'Both' },
];
const FOODS = ['Eat everything', 'Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'High protein', 'Low carb'];
const FAQ = [
  { q: 'How do points work?', a: 'You earn 10 points for each fully completed day. Points never reset when you start a new plan.' },
  { q: 'When do new tasks arrive?', a: 'A new day of missions unlocks at midnight. We also send a notification if you allow alerts.' },
  { q: 'Can I change my goal?', a: 'Goals and plan preferences are set during onboarding and are view-only in Profile.' },
];

function Chip({
  label,
  selected,
  onPress,
  color,
  readOnly,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color: string;
  readOnly?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={readOnly}
      activeOpacity={readOnly ? 1 : 0.7}
      style={[styles.chip, { backgroundColor: selected ? color + '18' : '#F3F1EE', borderColor: selected ? color : '#E6E3DE' }]}
    >
      <Text style={[styles.chipText, { color: selected ? color : '#6B6F76' }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const key = Array.isArray(id) ? id[0] : id || 'help';
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();
  const { permission, askToAllow, unreadCount } = useNotifications();
  const [goals, setGoals] = useState(() =>
    String(profile.goal || '')
      .split(/[,/&+]+/)
      .map((part) => part.trim())
      .filter(Boolean)
      .map(
        (part) =>
          ONBOARDING_GOALS.find((item) => item.id === part || item.label.toLowerCase() === part.toLowerCase())?.id ||
          part
      )
  );
  const [level, setLevel] = useState(profile.fitnessLevel || 'beginner');
  const [time, setTime] = useState(profile.dailyTime || '20–30 min');
  const [env, setEnv] = useState(profile.environment || 'home');
  const [food, setFood] = useState(profile.foodPreference || 'Eat everything');
  const [weeks, setWeeks] = useState(profile.planDurationWeeks || 8);
  const [pregnant, setPregnant] = useState(profile.isPregnant);
  const [week, setWeek] = useState(String(profile.pregnancyWeek || 12));
  const [sos, setSos] = useState(true);
  const [privateMode, setPrivateMode] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contacts, setContacts] = useState<Array<{ name: string; phone: string }>>([]);

  React.useEffect(() => {
    void AsyncStorage.getItem('fema-emergency-contacts').then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setContacts(parsed);
      } catch {
        // ignore
      }
    });
    void AsyncStorage.multiGet(['fema-privacy', 'fema-safety-sos']).then((rows) => {
      setPrivateMode(rows[0][1] === 'true');
      setSos(rows[1][1] !== 'false');
    });
  }, []);

  const title = useMemo(() => {
    const map: Record<string, string> = {
      goals: 'Personal Goals',
      preferences: 'Plan Preferences',
      pregnancy: 'Pregnancy Settings',
      food: 'Food & Allergies',
      emergency: 'Emergency Contacts',
      safety: 'Safety Settings',
      privacy: 'Privacy Settings',
      notifications: 'Notifications',
      help: 'Help Center',
    };
    return map[key] || 'Settings';
  }, [key]);

  const savePlan = (updates: Partial<typeof profile>) => {
    const next = { ...profile, ...updates };
    try {
      const trainingPlan = generateRoadmapTrainingPlan(next);
      updateProfile({
        ...updates,
        planName: planNameForGoal(next.goal || profile.goal),
        trainingPlan,
      });
    } catch {
      updateProfile(updates);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', 'Your plan is updated.');
    router.back();
  };

  const saveContacts = (next: Array<{ name: string; phone: string }>) => {
    setContacts(next);
    void AsyncStorage.setItem('fema-emergency-contacts', JSON.stringify(next));
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 22 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}>
        {key === 'goals' ? (
          <>
            <Text style={[styles.lead, { color: colors.mutedForeground }]}>
              Your goals were set during onboarding. You can view them here, but they cannot be edited.
            </Text>
            {ONBOARDING_GOALS.filter((goal) => goals.includes(goal.id)).length === 0 ? (
              <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.rowLabel, { color: colors.mutedForeground }]}>No goal on file yet.</Text>
              </View>
            ) : (
              ONBOARDING_GOALS.filter((goal) => goals.includes(goal.id)).map((goal) => (
                <View key={goal.id} style={[styles.row, { borderColor: colors.primary, backgroundColor: colors.card }]}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{goal.label}</Text>
                  <Feather name="check-circle" size={18} color={colors.primary} />
                </View>
              ))
            )}
          </>
        ) : null}

        {key === 'preferences' ? (
          <>
            <Text style={[styles.lead, { color: colors.mutedForeground }]}>
              Plan preferences are view-only. They were chosen when you started this plan.
            </Text>
            <Text style={[styles.section, { color: colors.foreground }]}>Fitness level</Text>
            <View style={styles.wrap}>
              {LEVELS.map((item) => (
                <Chip key={item.id} label={item.label} selected={level === item.id} color={colors.primary} readOnly onPress={() => {}} />
              ))}
            </View>
            <Text style={[styles.section, { color: colors.foreground }]}>Daily time</Text>
            <View style={styles.wrap}>
              {TIMES.map((item) => (
                <Chip key={item} label={item} selected={time === item} color={colors.primary} readOnly onPress={() => {}} />
              ))}
            </View>
            <Text style={[styles.section, { color: colors.foreground }]}>Where you train</Text>
            <View style={styles.wrap}>
              {ENVS.map((item) => (
                <Chip key={item.id} label={item.label} selected={env === item.id} color={colors.primary} readOnly onPress={() => {}} />
              ))}
            </View>
            <Text style={[styles.section, { color: colors.foreground }]}>Plan length</Text>
            <View style={styles.wrap}>
              {DURATION_OPTIONS.map((item) => (
                <Chip
                  key={item.weeks}
                  label={item.label}
                  selected={weeks === item.weeks}
                  color={colors.primary}
                  readOnly
                  onPress={() => {}}
                />
              ))}
            </View>
          </>
        ) : null}

        {key === 'food' ? (
          <>
            <Text style={[styles.lead, { color: colors.mutedForeground }]}>Recipes and food scan follow this choice.</Text>
            {FOODS.map((item) => (
              <TouchableOpacity
                key={item}
                style={[styles.row, { borderColor: food === item ? colors.primary : colors.border, backgroundColor: colors.card }]}
                onPress={() => setFood(item)}
              >
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item}</Text>
                {food === item ? <Feather name="check-circle" size={18} color={colors.primary} /> : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }]} onPress={() => savePlan({ foodPreference: food })}>
              <Text style={styles.saveText}>Save food settings</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {key === 'pregnancy' ? (
          <>
            <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>I am pregnant</Text>
              <Switch value={pregnant} onValueChange={setPregnant} trackColor={{ true: colors.primary }} />
            </View>
            {pregnant ? (
              <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Week</Text>
                <TextInput
                  value={week}
                  onChangeText={setWeek}
                  keyboardType="number-pad"
                  style={[styles.input, { color: colors.foreground }]}
                />
              </View>
            ) : null}
            <TouchableOpacity
              style={[styles.save, { backgroundColor: colors.primary }]}
              onPress={() =>
                savePlan({
                  isPregnant: pregnant,
                  pregnancyWeek: Math.max(1, Math.min(42, Number(week) || 12)),
                })
              }
            >
              <Text style={styles.saveText}>Save</Text>
            </TouchableOpacity>
          </>
        ) : null}

        {key === 'emergency' ? (
          <>
            <TextInput
              placeholder="Name"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <TextInput
              placeholder="Phone"
              placeholderTextColor={colors.mutedForeground}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={[styles.field, { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card }]}
            />
            <TouchableOpacity
              style={[styles.save, { backgroundColor: colors.primary }]}
              onPress={() => {
                if (!name.trim() || !phone.trim()) return;
                saveContacts([{ name: name.trim(), phone: phone.trim() }, ...contacts]);
                setName('');
                setPhone('');
              }}
            >
              <Text style={styles.saveText}>Add contact</Text>
            </TouchableOpacity>
            {contacts.map((item, index) => (
              <View key={`${item.phone}-${index}`} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.name}</Text>
                  <Text style={{ color: colors.mutedForeground, fontFamily: 'Manrope_400Regular' }}>{item.phone}</Text>
                </View>
                <TouchableOpacity onPress={() => saveContacts(contacts.filter((_, i) => i !== index))}>
                  <Feather name="trash-2" size={16} color={colors.destructive} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        ) : null}

        {key === 'safety' ? (
          <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>SOS shortcuts on</Text>
            <Switch
              value={sos}
              onValueChange={(value) => {
                setSos(value);
                void AsyncStorage.setItem('fema-safety-sos', String(value));
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
        ) : null}

        {key === 'privacy' ? (
          <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>Keep my progress private</Text>
            <Switch
              value={privateMode}
              onValueChange={(value) => {
                setPrivateMode(value);
                void AsyncStorage.setItem('fema-privacy', String(value));
              }}
              trackColor={{ true: colors.primary }}
            />
          </View>
        ) : null}

        {key === 'notifications' ? (
          <>
            <Text style={[styles.lead, { color: colors.mutedForeground }]}>
              {permission === 'granted'
                ? 'Alerts are on. We notify you when a new day of tasks starts.'
                : 'Allow notifications to get a ping when new daily tasks arrive.'}
            </Text>
            <Text style={[styles.lead, { color: colors.mutedForeground }]}>
              Unread on your bell: {unreadCount}
            </Text>
            {permission !== 'granted' ? (
              <TouchableOpacity style={[styles.save, { backgroundColor: colors.primary }]} onPress={() => void askToAllow()}>
                <Text style={styles.saveText}>Allow notifications</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="check-circle" size={18} color={colors.primary} />
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>Notifications allowed</Text>
              </View>
            )}
          </>
        ) : null}

        {key === 'help' ? (
          FAQ.map((item) => (
            <View key={item.q} style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card, alignItems: 'flex-start' }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.q}</Text>
                <Text style={{ color: colors.mutedForeground, fontFamily: 'Manrope_400Regular', lineHeight: 20 }}>{item.a}</Text>
              </View>
            </View>
          ))
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 10 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontFamily: 'Manrope_800ExtraBold' },
  lead: { fontSize: 13, fontFamily: 'Manrope_400Regular', lineHeight: 19, marginBottom: 4 },
  section: { fontSize: 14, fontFamily: 'Manrope_700Bold', marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLabel: { fontSize: 15, fontFamily: 'Manrope_600SemiBold', flex: 1 },
  save: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  saveText: { color: '#FFFFFF', fontSize: 16, fontFamily: 'Manrope_800ExtraBold' },
  input: { minWidth: 48, textAlign: 'right', fontFamily: 'Manrope_700Bold', fontSize: 16 },
  field: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, height: 48, fontFamily: 'Manrope_500Medium' },
});
