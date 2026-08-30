import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface Props {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  color?: string;
}

export default function FilterChip({ label, selected = false, onPress, color }: Props) {
  const colors = useColors();
  const accentColor = color ?? colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.chip,
        {
          backgroundColor: selected ? accentColor : colors.muted,
          borderColor: selected ? accentColor : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={[styles.label, { color: selected ? '#FFFFFF' : colors.mutedForeground }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Manrope_600SemiBold',
  },
});
