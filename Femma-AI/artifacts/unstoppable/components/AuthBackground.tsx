import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useResponsive } from '@/hooks/useResponsive';

export function AuthBackground() {
  const colors = useColors();
  const { width } = useResponsive();
  const blobScale = Math.min(Math.max(width / 390, 0.85), 1.25);

  return (
    <>
      <LinearGradient colors={['#1a0d14', '#17181C', '#0d121a']} style={StyleSheet.absoluteFill} />
      <View
        style={[
          styles.blob1,
          {
            backgroundColor: colors.pink + '22',
            width: 320 * blobScale,
            height: 320 * blobScale,
            borderRadius: 160 * blobScale,
          },
        ]}
      />
      <View
        style={[
          styles.blob2,
          {
            backgroundColor: colors.lavender + '18',
            width: 220 * blobScale,
            height: 220 * blobScale,
            borderRadius: 110 * blobScale,
          },
        ]}
      />
      <View
        style={[
          styles.blob3,
          {
            backgroundColor: colors.skyBlue + '12',
            width: 160 * blobScale,
            height: 160 * blobScale,
            borderRadius: 80 * blobScale,
          },
        ]}
      />
    </>
  );
}

const styles = StyleSheet.create({
  blob1: { position: 'absolute', top: -90, right: -90 },
  blob2: { position: 'absolute', bottom: 180, left: -70 },
  blob3: { position: 'absolute', top: '38%', right: -40 },
});
