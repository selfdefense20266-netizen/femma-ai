import React, { useState, useEffect } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Image, type ImageContentFit, type ImageSource } from 'expo-image';
import { lookupMappedGif } from '@/lib/exerciseGifMap';
import { lookupExerciseGif } from '@/lib/exerciseDb';

interface Props {
  title: string;
  animation?: string;
  category?: string;
  slot?: string;
  icon: string;
  accentColor: string;
  size?: number;
  iconSize?: number;
  style?: StyleProp<ViewStyle>;
  contentFit?: ImageContentFit;
  imageUrl?: string | number;
  /** When true, never replace admin/local media with ExerciseDB guesses */
  lockMedia?: boolean;
}

function normalizeSource(value: unknown): ImageSource | number | null {
  if (value == null || value === false || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const uri = value.trim();
    return uri ? { uri } : null;
  }
  if (typeof value === 'object' && value !== null && 'uri' in value) {
    const uri = (value as { uri: unknown }).uri;
    if (typeof uri === 'string' && uri.trim()) return { uri: uri.trim() };
    if (typeof uri === 'number' && Number.isFinite(uri)) return uri;
  }
  return null;
}

export default function MissionIcon({
  title,
  animation,
  category,
  slot,
  icon,
  accentColor,
  size = 44,
  iconSize = 20,
  style,
  contentFit = 'contain',
  imageUrl,
  lockMedia = false,
}: Props) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasExplicitMedia = imageUrl != null && imageUrl !== '';
  const isExerciseCategory = category === 'fitness' || category === 'yoga' || slot === 'exercise';
  const isNonExercise =
    category === 'recipe' ||
    category === 'nutrition' ||
    category === 'safety' ||
    slot === 'meal' ||
    slot === 'recipe' ||
    slot === 'course';
  const shouldCheckGif =
    !lockMedia &&
    !hasExplicitMedia &&
    (isExerciseCategory || (Boolean(animation) && !isNonExercise));

  const [resolved, setResolved] = useState<ImageSource | number | null>(() => {
    const preferred = normalizeSource(imageUrl);
    if (preferred) return preferred;
    if (!shouldCheckGif) return null;
    const syncMatch = lookupMappedGif(title, animation);
    return syncMatch?.status === 'found' && syncMatch?.gifUrl
      ? normalizeSource({ uri: syncMatch.gifUrl })
      : null;
  });

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl, title, animation]);

  useEffect(() => {
    const preferred = !imageFailed ? normalizeSource(imageUrl) : null;
    if (preferred) {
      setResolved(preferred);
      return;
    }
    // Admin/local media failed or missing — do not invent a different ExerciseDB move.
    if (lockMedia || hasExplicitMedia) {
      setResolved(null);
      return;
    }
    if (!shouldCheckGif) {
      setResolved(null);
      return;
    }

    let cancelled = false;
    const syncMatch = lookupMappedGif(title, animation);
    if (syncMatch?.status === 'found' && syncMatch?.gifUrl) {
      setResolved(normalizeSource({ uri: syncMatch.gifUrl }));
      return;
    }

    lookupExerciseGif(title, animation).then((match) => {
      if (cancelled) return;
      if (match?.urls?.[0]) {
        setResolved(normalizeSource({ uri: match.urls[0] }));
      } else if (match?.local != null) {
        setResolved(normalizeSource(match.local));
      } else {
        setResolved(null);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [title, animation, shouldCheckGif, imageUrl, imageFailed, lockMedia, hasExplicitMedia]);

  const borderRadius = Math.round(size * 0.27);
  const validIcon = (Feather.glyphMap as Record<string, number>)[icon] ? icon : 'circle';
  const displaySource = normalizeSource(resolved);

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: displaySource != null ? '#FFFFFF' : accentColor + '18',
        },
        style,
      ]}
    >
      {displaySource != null ? (
        <Image
          source={displaySource}
          style={styles.image}
          contentFit={contentFit}
          cachePolicy="memory-disk"
          onError={() => {
            setImageFailed(true);
            setResolved(null);
          }}
        />
      ) : (
        <Feather name={validIcon as never} size={iconSize} color={accentColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    alignSelf: 'stretch',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
