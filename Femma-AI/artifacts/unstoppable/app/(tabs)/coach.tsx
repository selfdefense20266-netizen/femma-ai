import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, LEVEL_NAMES } from '@/context/AppContext';

type Message = {
  id: string;
  role: 'user' | 'coach';
  text: string;
};

const SUGGESTIONS = [
  'What workout should I do today?',
  'What should I eat in my current cycle phase?',
  'How do I stay motivated?',
  'Basic self-defense tips?',
  'Best yoga for stress relief?',
  'How much protein do I need?',
];

function getCoachReply(question: string, ctx: { name: string; cyclePhase?: string; levelName: string; streak: number }): string {
  const q = question.toLowerCase();

  if (/(workout|train|exercise|gym|strength|lift)/.test(q)) {
    return `Great question, ${ctx.name}! Based on your ${ctx.levelName} level, here's my recommendation:\n\n• Start with a 5-min dynamic warm-up\n• 3 rounds: squats ×12, push-ups ×8, glute bridges ×15, plank 30s\n• Finish with light stretching\n\nIf you're short on time, even 15 focused minutes counts toward your streak. Check the Fitness tab for guided programs matched to your level! 💪`;
  }
  if (/(cycle|period|phase|hormone|pms|menstrua)/.test(q)) {
    const phase = ctx.cyclePhase || 'follicular';
    const tips: Record<string, string> = {
      menstrual: 'During your menstrual phase, energy is naturally lower. Prioritize gentle movement — walking, restorative yoga, light stretching. Iron-rich foods (spinach, lentils, dark chocolate) help replenish what you lose.',
      follicular: 'Your follicular phase is a power window! Rising estrogen boosts energy and recovery — great time for strength training and trying new workouts. Fuel with lean protein and complex carbs.',
      ovulation: 'Around ovulation you\'re at peak energy — perfect for high-intensity workouts and PRs. Stay hydrated and include anti-inflammatory foods like berries and leafy greens.',
      luteal: 'In the luteal phase, cortisol sensitivity rises. Swap HIIT for moderate strength, pilates, or yoga. Magnesium-rich foods (nuts, dark chocolate, bananas) can ease PMS symptoms.',
    };
    return `${tips[phase] || tips['follicular']}\n\nYou can track your phase in the Cycle section for daily insights tuned to your body. 🌸`;
  }
  if (/(eat|food|nutrition|meal|diet|protein|calorie|macro)/.test(q)) {
    return `Here's my nutrition guidance:\n\n• Protein: aim for ~1.6–2g per kg of body weight daily — it supports muscle recovery and keeps you full\n• Fill half your plate with colorful veggies\n• Don't fear carbs — they fuel your workouts\n• Hydrate: ~2–2.5L water daily\n\nTry the Food Scan feature to check any product's score, or browse Recipes for cycle-friendly meal ideas! 🥗`;
  }
  if (/(motivat|lazy|tired|give up|hard|discourag|consisten)/.test(q)) {
    return `I hear you, ${ctx.name} — motivation comes and goes, but systems keep you going:\n\n• You're on a ${ctx.streak}-day streak. Don't break the chain!\n• Shrink the goal: commit to just 5 minutes. Starting is the hardest part\n• Same time, same place — habits beat willpower\n• Progress > perfection. A short workout beats a skipped one\n\nYou've already proven you're capable. Remember why you started. You are UNSTOPPABLE. 🔥`;
  }
  if (/(defense|defence|safety|attack|danger|protect)/.test(q)) {
    return `Personal safety essentials:\n\n• Awareness first — head up, phone away in transit spaces\n• Trust your gut. If something feels off, leave\n• Voice is a weapon: a loud, firm "BACK OFF" deters most threats\n• Target vulnerable points if grabbed: eyes, throat, knees, instep\n• Practice the wrist-release drill in the Safety section\n\nCheck the Safety tab for step-by-step technique breakdowns. Your strength is your protection. 🛡️`;
  }
  if (/(yoga|stress|anxiet|relax|sleep|calm|breath)/.test(q)) {
    return `For stress relief, I recommend:\n\n• Child's pose → cat-cow → forward fold (2 min each)\n• Legs-up-the-wall before bed for better sleep\n• Box breathing: inhale 4s, hold 4s, exhale 4s, hold 4s — repeat ×5\n\nThe Yoga section has a "Evening Wind-Down" session that pairs perfectly with this. Even 10 minutes lowers cortisol measurably. 🧘‍♀️`;
  }
  if (/(weight|lose|fat|slim|tone)/.test(q)) {
    return `Sustainable body-composition change comes from:\n\n• A modest calorie deficit (~300–500 kcal) — crash diets backfire\n• Strength training 3×/week to keep muscle while losing fat\n• 8k+ daily steps\n• Protein at every meal to manage hunger\n\nProgress isn't linear — track weekly trends, not daily numbers. Your Progress tab shows the full picture. 📈`;
  }
  if (/(hi|hello|hey)\b/.test(q)) {
    return `Hey ${ctx.name}! 👋 I'm your coach — ask me anything about workouts, nutrition, your cycle, yoga, motivation, or personal safety. What's on your mind today?`;
  }
  return `Great question! Here's my take:\n\nConsistency beats intensity — small daily actions compound into big results. Whatever your goal, keep showing up for your missions (you're ${ctx.streak} days strong!).\n\nTry asking me about:\n• Workouts & training\n• Nutrition & macros\n• Your cycle phase\n• Yoga & stress relief\n• Self-defense basics 💜`;
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile } = useApp();
  const topPad = insets.top + 8;
  const botPad = Platform.OS === 'web' ? 84 : insets.bottom + 60;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'coach',
      text: `Hi ${profile.name}! 👋 I'm your personal coach. Ask me anything about workouts, nutrition, your cycle, yoga, motivation, or staying safe.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const idRef = useRef(0);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userMsg: Message = { id: `u${++idRef.current}`, role: 'user', text: trimmed };
      setMessages(prev => [userMsg, ...prev]);
      setInput('');
      setTyping(true);
      const reply = getCoachReply(trimmed, {
        name: profile.name,
        cyclePhase: profile.cyclePhase,
        levelName: LEVEL_NAMES[profile.level] || 'Beginner',
        streak: profile.streak,
      });
      setTimeout(() => {
        setMessages(prev => [{ id: `c${++idRef.current}`, role: 'coach', text: reply }, ...prev]);
        setTyping(false);
      }, 700 + Math.random() * 600);
    },
    [typing, profile]
  );

  const renderItem = useCallback(
    ({ item }: { item: Message }) =>
      item.role === 'user' ? (
        <View style={[styles.bubble, styles.userBubble, { backgroundColor: colors.primary }]}>
          <Text style={styles.userText}>{item.text}</Text>
        </View>
      ) : (
        <View style={styles.coachRow}>
          <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.coachAvatar}>
            <Feather name="heart" size={13} color="#FFF" />
          </LinearGradient>
          <View style={[styles.bubble, styles.coachBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.coachText, { color: colors.foreground }]}>{item.text}</Text>
          </View>
        </View>
      ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.headerAvatar}>
          <Feather name="heart" size={18} color="#FFF" />
        </LinearGradient>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Coach</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Always here for you</Text>
        </View>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <FlatList
          data={messages}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            typing ? (
              <View style={styles.coachRow}>
                <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.coachAvatar}>
                  <Feather name="heart" size={13} color="#FFF" />
                </LinearGradient>
                <View style={[styles.bubble, styles.coachBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.coachText, { color: colors.mutedForeground }]}>typing…</Text>
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggestions */}
        {messages.length <= 2 && (
          <ScrollView
            horizontal
            style={{ flexGrow: 0 }}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestions}
            keyboardShouldPersistTaps="handled"
          >
            {SUGGESTIONS.map(s => (
              <TouchableOpacity
                key={s}
                style={[styles.suggestionChip, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}
                onPress={() => send(s)}
              >
                <Text style={[styles.suggestionText, { color: colors.primary }]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={[styles.inputRow, { paddingBottom: botPad, backgroundColor: colors.background, borderTopColor: colors.border }]}>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Ask your coach anything…"
            placeholderTextColor={colors.mutedForeground}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send(input)}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: input.trim() && !typing ? colors.primary : colors.muted }]}
            onPress={() => send(input)}
            disabled={!input.trim() || typing}
          >
            <Feather name="arrow-up" size={20} color={input.trim() && !typing ? '#FFF' : colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  headerAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 17, fontFamily: 'Manrope_700Bold' },
  headerSub: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  userText: { color: '#FFF', fontSize: 14.5, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  coachRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  coachAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  coachBubble: { borderWidth: 1, borderBottomLeftRadius: 6 },
  coachText: { fontSize: 14.5, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  suggestions: { gap: 8, paddingHorizontal: 16, paddingBottom: 10, alignItems: 'center' },
  suggestionChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8, alignSelf: 'center' },
  suggestionText: { fontSize: 13, fontFamily: 'Manrope_600SemiBold' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 14.5,
    fontFamily: 'Manrope_500Medium',
    maxHeight: 110,
  },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
});
