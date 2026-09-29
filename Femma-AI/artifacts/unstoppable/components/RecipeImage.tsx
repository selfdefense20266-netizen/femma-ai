import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { localRecipeImage, type Recipe } from '@/data/recipes';
import { lookupRecipeImageUrl } from '@/lib/recipeImages';

type Props = {
  recipe: Recipe;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  rounded?: number;
  contentFit?: 'cover' | 'contain';
};

export default function RecipeImage({ recipe, style, iconSize = 28, rounded = 0, contentFit = 'cover' }: Props) {
  const local = localRecipeImage(recipe.image);
  const [uri, setUri] = useState<string | undefined>(local ? undefined : recipe.imageUrl);

  useEffect(() => {
    if (local) return;
    if (recipe.imageUrl) {
      setUri(recipe.imageUrl);
      return;
    }
    let cancelled = false;
    void lookupRecipeImageUrl(recipe.title).then((url) => {
      if (!cancelled && url) setUri(url);
    });
    return () => {
      cancelled = true;
    };
  }, [local, recipe.title, recipe.imageUrl]);

  const flatStyle = StyleSheet.flatten(style) || {};
  const radius = rounded || (typeof flatStyle.borderRadius === 'number' ? flatStyle.borderRadius : 0);
  const source = local || (uri ? { uri } : undefined);

  return (
    <View style={[styles.wrap, style, radius ? { borderRadius: radius } : null]}>
      {source ? (
        <Image source={source} style={styles.fill} contentFit={contentFit} recyclingKey={recipe.id} />
      ) : (
        <LinearGradient colors={recipe.gradient} style={styles.fill}>
          <View style={styles.fallback}>
            <Feather name="book-open" size={iconSize} color="rgba(255,255,255,0.72)" />
          </View>
        </LinearGradient>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
  fill: { ...StyleSheet.absoluteFillObject },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
