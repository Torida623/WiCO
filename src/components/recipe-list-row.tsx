import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { buildRecipeTagChips } from '@/lib/recipe-tags';
import { SavedRecipe } from '@/lib/recipes';

/** A single レシピ研究所 result row (thumbnail + title + tag chips) — shared between the plain
 * list tabs and the search panel so a recipe reads the same way everywhere it's browsed. */
export function RecipeListRow({ recipe, onPress }: { recipe: SavedRecipe; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
          {recipe.photoUri ? (
            <Image source={{ uri: recipe.photoUri }} style={styles.thumbnail} contentFit="cover" />
          ) : (
            <View style={styles.thumbnailPlaceholder} />
          )}
          <View style={styles.rowText}>
            <ThemedText type="smallBold" numberOfLines={2}>
              {recipe.title}
            </ThemedText>
            <View style={styles.tagWrap}>
              {buildRecipeTagChips(recipe).map((chip) => (
                <View
                  key={chip.key}
                  style={[styles.tagChip, { backgroundColor: chip.background, borderColor: chip.text }]}>
                  <ThemedText type="small" style={{ color: chip.text }}>
                    {chip.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </View>
        </ThemedView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.three,
    marginBottom: Spacing.two,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
  },
  thumbnailPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  rowText: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.one,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  tagChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
