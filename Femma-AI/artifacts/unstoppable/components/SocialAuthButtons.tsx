import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

type SocialProvider = 'google' | 'apple';

type Props = {
  onGoogle: () => void;
  onApple: () => void;
  /** Which social button is currently signing in — only that one shows a spinner. */
  loadingProvider?: SocialProvider | null;
  disabled?: boolean;
};

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Google">
      <Path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <Path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <Path
        fill="#4CAF50"
        d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <Path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.6 7.1l.1.1 6.3 5.3C36.8 41.2 44 36 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </Svg>
  );
}

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
            <GoogleLogo size={20} />
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
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 16,
  },
  btnText: { fontSize: 15, fontFamily: 'Manrope_700Bold' },
});
