import React from 'react';
import { Platform, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';

interface AuthFieldProps extends TextInputProps {
  label: string;
  error?: string;
  onToggleSecure?: () => void;
  secureVisible?: boolean;
}

export function AuthField({
  label,
  error,
  onToggleSecure,
  secureVisible,
  style,
  ...props
}: AuthFieldProps) {
  const colors = useColors();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          { borderColor: error ? colors.coral : 'rgba(255,255,255,0.16)' },
        ]}
      >
        <TextInput
          {...props}
          placeholderTextColor="rgba(255,255,255,0.35)"
          style={[
            styles.input,
            Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null,
            style,
          ]}
          selectionColor={colors.pink}
        />
        {onToggleSecure ? (
          <TouchableOpacity onPress={onToggleSecure} hitSlop={10} style={styles.eyeBtn}>
            <Feather name={secureVisible ? 'eye' : 'eye-off'} size={18} color="rgba(255,255,255,0.55)" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: colors.coral }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', gap: 8 },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.78)',
    fontFamily: 'Manrope_600SemiBold',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Manrope_400Regular',
    paddingVertical: 14,
    minWidth: 0,
  },
  eyeBtn: { paddingLeft: 8, paddingVertical: 8 },
  error: { fontSize: 12, fontFamily: 'Manrope_400Regular' },
});
