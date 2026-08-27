import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function useScreenPad() {
  'use no memo';
  const insets = useSafeAreaInsets();
  return {
    topPad: insets.top + 8,
    botPad: Math.max(insets.bottom, 12),
  };
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const isCompact = width < 380;
  const isShort = height < 720;
  const isTablet = width >= 768;
  const contentMaxWidth = Math.min(width, isTablet ? 480 : width);
  const padX = isCompact ? 20 : 28;
  const headlineSize = isCompact ? 28 : 34;
  const headlineLineHeight = isCompact ? 36 : 44;
  const logoSize = isCompact ? 56 : 68;

  return {
    width,
    height,
    isCompact,
    isShort,
    isTablet,
    contentMaxWidth,
    padX,
    headlineSize,
    headlineLineHeight,
    logoSize,
  };
}
