import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

type Props = {
  progress: number;
  color: string;
  trackColor: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** Reliable fill width — RN % widths often fail inside flex rows. */
export default function ProgressBar({ progress, color, trackColor, height = 5, style }: Props) {
  const [trackWidth, setTrackWidth] = useState(0);
  const clamped = Number.isFinite(progress) ? Math.min(100, Math.max(0, progress)) : 0;
  const fillWidth = trackWidth > 0 ? (clamped / 100) * trackWidth : 0;

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    if (next > 0 && Math.abs(next - trackWidth) > 0.5) setTrackWidth(next);
  };

  return (
    <View
      onLayout={onLayout}
      style={[styles.track, { height, backgroundColor: trackColor, borderRadius: height }, style]}
    >
      <View
        style={[
          styles.fill,
          {
            width: fillWidth,
            height,
            backgroundColor: color,
            borderRadius: height,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  fill: { height: '100%' },
});
