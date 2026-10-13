import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

type SocialProvider = 'google' | 'apple';

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  /** Which social button is currently signing in — only that one shows a spinner. */
  loadingProvider?: SocialProvider | null;
  disabled?: boolean;
};

export function SocialAuthButtons({ onGoogle, onApple, loadingProvider = null, disabled }: Props) {
  const colors = useColors();
  const busy = Boolean(loadingProvider || disabled);
  const showApple = Platform.OS === 'ios' || Platform.OS === 'android' || Platform.OS === 'web';

  return (
    <View style={styles.wrap}>
      <View style={styles.dividerRow}>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
        <Text style={[styles.orText, { color: colors.mutedForeground }]}>or continue with</Text>
        <View style={[styles.line, { backgroundColor: colors.border }]} />
      </View>

      <TouchableOpacity
        style={[
          styles.btn,
          { borderColor: colors.border, backgroundColor: colors.card, opacity: busy ? 0.75 : 1 },
        ]}
        onPress={onGoogle}
        disabled={busy}
        activeOpacity={0.85}
      >
        {loadingProvider === 'google' ? (
          <ActivityIndicator color={colors.foreground} />
        ) : (
          <>
            <View style={styles.googleG}>
              <Text style={styles.googleGText}>G</Text>
            </View>
            <Text style={[styles.btnText, { color: colors.foreground }]}>Continue with Google</Text>
          </>
        )}
      </TouchableOpacity>

      {showApple ? (
        <TouchableOpacity
          style={[
            styles.btn,
            { borderColor: colors.border, backgroundColor: '#111111', opacity: busy ? 0.75 : 1 },
          ]}
          onPress={onApple}
          disabled={busy}
          activeOpacity={0.85}
        >
          {loadingProvider === 'apple' ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="logo-apple" size={20} color="#FFFFFF" />
              <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12, marginTop: 8 },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  orText: { fontSize: 12, fontFamily: 'Manrope_500Medium' },
  btn: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  btnText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
  googleG: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DADCE0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleGText: { fontSize: 13, fontWeight: '800', color: '#4285F4', fontFamily: 'Manrope_800ExtraBold' },
});
