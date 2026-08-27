import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { Recipe } from '@/data/recipes';
import { lookupRecipeImageUrl } from '@/lib/recipeImages';

type Props = {
  recipe: Recipe;
  style?: StyleProp<ViewStyle>;
  iconSize?: number;
  rounded?: number;
};

export default function RecipeImage({ recipe, style, iconSize = 28, rounded = 0 }: Props) {
  const [uri, setUri] = useState<string | undefined>(recipe.imageUrl);

  useEffect(() => {
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
  }, [recipe.title, recipe.imageUrl]);

  const flatStyle = StyleSheet.flatten(style) || {};
  const radius = rounded || (typeof flatStyle.borderRadius === 'number' ? flatStyle.borderRadius : 0);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[style, styles.image, radius ? { borderRadius: radius } : null]}
        resizeMode="cover"
      />
    );
  }

  return (
    <LinearGradient colors={recipe.gradient} style={style}>
      <View style={styles.fallback}>
        <Feather name="book-open" size={iconSize} color="rgba(255,255,255,0.72)" />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
