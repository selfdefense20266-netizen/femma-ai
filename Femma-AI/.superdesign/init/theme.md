# Theme and design tokens

## Compact token summary

- Product: UNSTOPPABLE / app display name Femma AI.
- Platform: portrait mobile, primary design frame 390 x 844.
- Theme: light-only in the current code.
- Font: Manrope 400 Regular, 500 Medium, 600 SemiBold, 700 Bold, 800 ExtraBold.
- Background: #FAFAFC.
- Surface/card: #FFFFFF.
- Foreground/charcoal: #17181C.
- Secondary text: #747985.
- Border: #EBEDF0.
- Muted/input: #F5F5F8.
- Primary pink: #F26BB5; deep pink: #D94A9A.
- Sky blue: #77CDED; soft cyan: #C9F2F6.
- Lavender: #B9A7F2; soft lavender: #E9E2FC.
- Mint: #A9E4D2; coral: #FF928F; warm yellow: #FFD88A.
- Core radius: 20px. Existing cards range 16-20px; pills use radius 100px.
- Spacing: 8-point rhythm with common gaps 8, 10, 12, 14, 16, 20, 24.
- Touch targets: 44px minimum; current row icons are 44px and category icons 46px.
- Type scale: screen title 30/800; section title 18/700; card title 15-16/700; body 13-14/500; metadata 11-12/600-700.
- Shadows: intentionally minimal; separation relies on borders, tonal fills, gradients and whitespace.
- Motion: short 400ms FadeInDown entrances with 80ms stagger; light haptics on navigation; success haptics on completion.
- Gradients: category-specific two-color diagonals; use sparingly and preserve strong white-text contrast.
- Breakpoints: no formal breakpoint tokens. Platform-specific safe-area handling and web tab bar height are used.

## Raw color source

File: artifacts/unstoppable/constants/colors.ts

~~~ts
const colors = {
  light: {
    text: '#17181C',
    tint: '#F26BB5',
    background: '#FAFAFC',
    foreground: '#17181C',
    card: '#FFFFFF',
    cardForeground: '#17181C',
    primary: '#F26BB5',
    primaryForeground: '#FFFFFF',
    secondary: '#E9E2FC',
    secondaryForeground: '#17181C',
    muted: '#F5F5F8',
    mutedForeground: '#747985',
    accent: '#B9A7F2',
    accentForeground: '#FFFFFF',
    destructive: '#FF928F',
    destructiveForeground: '#FFFFFF',
    border: '#EBEDF0',
    input: '#F5F5F8',
    pink: '#F26BB5',
    deepPink: '#D94A9A',
    skyBlue: '#77CDED',
    softCyan: '#C9F2F6',
    lavender: '#B9A7F2',
    softLavender: '#E9E2FC',
    mint: '#A9E4D2',
    coral: '#FF928F',
    warmYellow: '#FFD88A',
    charcoal: '#17181C',
    secondaryText: '#747985',
    surfaceWhite: '#FFFFFF',
  },
  radius: 20,
};

export default colors;
~~~

## Raw theme hook

File: artifacts/unstoppable/hooks/useColors.ts

~~~ts
import { useColorScheme } from 'react-native';
import colors from '@/constants/colors';

export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' && 'dark' in colors
      ? (colors as Record<string, typeof colors.light>).dark
      : colors.light;
  return { ...palette, radius: colors.radius };
}
~~~

## Raw font registration and Expo configuration

The complete font registration is in layouts.md. app.json sets portrait orientation, light UI style, #FAFAFC splash background, and no tablet support.
