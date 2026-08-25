import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface CoachIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Chat-bubble "C" logo: open ring with a speech tail and two eyes
export default function CoachIcon({ size = 24, color = '#000', strokeWidth = 2.6 }: CoachIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Open "C" ring — gap on the right side */}
      <Path
        d="M 19.2 6.4 A 9 9 0 1 0 19.2 17.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        fill="none"
      />
      {/* Speech tail at bottom-left */}
      <Path
        d="M 5.6 18.9 L 3.4 21.2 L 7.6 20.6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={color}
      />
      {/* Eyes */}
      <Circle cx="9.4" cy="12" r="1.7" fill={color} />
      <Circle cx="15" cy="12" r="1.7" fill={color} />
    </Svg>
  );
}
