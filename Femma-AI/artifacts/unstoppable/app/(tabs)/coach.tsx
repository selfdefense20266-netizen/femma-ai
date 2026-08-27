import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Platform,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';
import { sendCoachMessage, type CoachChatMessage } from '@/lib/coachAi';
import { COACH_SCOPE_TOPICS } from '@/lib/coachScope';
import { buildCoachSuggestions } from '@/lib/coachSuggestions';
import type { CoachChatHistoryMessage } from '@/lib/memberProgress';

type Message = CoachChatHistoryMessage;

function coachWelcomeMessage(name?: string): Message {
  return {
    id: 'welcome',
    role: 'coach',
    text: name
      ? `Hi ${name}! 👋 I'm your AI wellness coach. I can help with workouts, nutrition, your cycle, yoga, motivation, and safety — ask me anything in those areas.`
      : `Hi! 👋 I'm your AI wellness coach. I can help with workouts, nutrition, your cycle, yoga, motivation, and safety — ask me anything in those areas.`,
  };
}

function toApiHistory(history: CoachChatHistoryMessage[]): CoachChatMessage[] {
  return history.map((m) => ({
    role: m.role === 'user' ? ('user' as const) : ('assistant' as const),
    content: m.text,
  }));
}

function syncIdRef(idRef: React.MutableRefObject<number>, history: CoachChatHistoryMessage[]) {
  for (const message of history) {
    const match = message.id.match(/^[uc](\d+)$/);
    if (match) idRef.current = Math.max(idRef.current, Number(match[1]));
  }
}

export default function CoachScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { profile, coachChatHistory, saveCoachChatHistory } = useApp();
  const suggestions = useMemo(() => buildCoachSuggestions(profile), [profile]);
  const topPad = insets.top + 8;
  const tabBarPad = Platform.OS === 'web' ? 84 : insets.bottom + 56;

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const idRef = useRef(0);

  useEffect(() => {
    syncIdRef(idRef, coachChatHistory);
  }, [coachChatHistory]);

  const messages = useMemo(() => {
    if (coachChatHistory.length === 0) return [coachWelcomeMessage(profile.name)];
    return [...coachChatHistory].reverse();
  }, [coachChatHistory, profile.name]);

  const sentTexts = useMemo(
    () => new Set(coachChatHistory.filter((m) => m.role === 'user').map((m) => m.text.trim().toLowerCase())),
    [coachChatHistory]
  );
  const visibleSuggestions = useMemo(
    () => suggestions.filter((s) => !sentTexts.has(s.trim().toLowerCase())),
    [suggestions, sentTexts]
  );
  const showSuggestions = !typing && !keyboardOpen && visibleSuggestions.length > 0;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const inputBottomPad = keyboardOpen ? 8 : tabBarPad;

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || typing) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userMsg: Message = {
        id: `u${++idRef.current}`,
        role: 'user',
        text: trimmed,
        createdAt: new Date().toISOString(),
      };
      const historyWithUser = [...coachChatHistory, userMsg];
      saveCoachChatHistory(historyWithUser);
      setInput('');
      setTyping(true);

      try {
        const reply = await sendCoachMessage(toApiHistory(historyWithUser), profile);
        const coachMsg: Message = {
          id: `c${++idRef.current}`,
          role: 'coach',
          text: reply,
          createdAt: new Date().toISOString(),
        };
        saveCoachChatHistory([...historyWithUser, coachMsg]);
      } catch (err) {
        const errorText = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        const coachMsg: Message = {
          id: `c${++idRef.current}`,
          role: 'coach',
          text: `Sorry — I couldn't reach the AI coach right now.\n\n${errorText}`,
          createdAt: new Date().toISOString(),
        };
        saveCoachChatHistory([...historyWithUser, coachMsg]);
      } finally {
        setTyping(false);
      }
    },
    [typing, profile, coachChatHistory, saveCoachChatHistory]
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

  const inputBar = (
    <View style={[styles.inputRow, { paddingBottom: inputBottomPad, backgroundColor: colors.background, borderTopColor: colors.border }]}>
      <TextInput
        style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
        placeholder="Ask your coach anything…"
        placeholderTextColor={colors.mutedForeground}
        value={input}
        onChangeText={setInput}
        onSubmitEditing={() => send(input)}
        returnKeyType="send"
        multiline
        editable={!typing}
      />
      <TouchableOpacity
        style={[styles.sendBtn, { backgroundColor: input.trim() && !typing ? colors.primary : colors.muted }]}
        onPress={() => send(input)}
        disabled={!input.trim() || typing}
      >
        <Feather name="arrow-up" size={20} color={input.trim() && !typing ? '#FFF' : colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  const suggestionPanel = showSuggestions ? (
    <View style={[styles.suggestionsPanel, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <Text style={[styles.suggestionsLabel, { color: colors.mutedForeground }]}>Suggested for you</Text>
      <FlatList
        horizontal
        data={visibleSuggestions}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.suggestionsScroll}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.suggestionChip, { backgroundColor: colors.background, borderColor: colors.border }]}
            onPress={() => send(item)}
            disabled={typing}
            activeOpacity={0.75}
          >
            <Feather name="message-circle" size={13} color={colors.primary} />
            <Text style={[styles.suggestionText, { color: colors.foreground }]} numberOfLines={2}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  ) : null;

  const chatBody = (
    <View style={styles.flex}>
      <FlatList
        style={styles.flex}
        data={messages}
        inverted
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, gap: 10 }}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        ListHeaderComponent={
          typing ? (
            <View style={styles.coachRow}>
              <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.coachAvatar}>
                <Feather name="heart" size={13} color="#FFF" />
              </LinearGradient>
              <View style={[styles.bubble, styles.coachBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.coachText, { color: colors.mutedForeground }]}>Thinking…</Text>
              </View>
            </View>
          ) : null
        }
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <LinearGradient colors={[colors.deepPink, colors.lavender]} style={styles.headerAvatar}>
          <Feather name="heart" size={18} color="#FFF" />
        </LinearGradient>
        <View>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>AI Coach</Text>
          <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>Wellness topics only</Text>
        </View>
      </View>

      <View style={[styles.scopeBar, { backgroundColor: colors.softLavender, borderBottomColor: colors.border }]}>
        <Text style={[styles.scopeText, { color: colors.mutedForeground }]}>
          {COACH_SCOPE_TOPICS.join(' · ')}
        </Text>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={0}>
        {chatBody}
        {suggestionPanel}
        {inputBar}
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
  scopeBar: { paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1 },
  scopeText: { fontSize: 11, fontFamily: 'Manrope_500Medium', lineHeight: 16 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, maxWidth: '82%' },
  userBubble: { alignSelf: 'flex-end', borderBottomRightRadius: 6 },
  userText: { color: '#FFF', fontSize: 14.5, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  coachRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  coachAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  coachBubble: { borderWidth: 1, borderBottomLeftRadius: 6 },
  coachText: { fontSize: 14.5, fontFamily: 'Manrope_500Medium', lineHeight: 21 },
  suggestionsPanel: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
  },
  suggestionsLabel: {
    fontSize: 11,
    fontFamily: 'Manrope_700Bold',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
  },
  suggestionsScroll: {
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    maxWidth: 280,
  },
  suggestionText: { flexShrink: 1, fontSize: 13, fontFamily: 'Manrope_500Medium', lineHeight: 18 },
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
