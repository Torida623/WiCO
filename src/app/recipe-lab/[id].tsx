import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildRecipeTagChips } from '@/lib/recipe-tags';
import {
  deletePublicRecipe,
  deleteRecipe,
  getPublicRecipe,
  getRecipe,
  isPublicRecipeSaved,
  removeSavedPublicRecipe,
  SavedRecipe,
  savePublicRecipeToLibrary,
  splitBookContent,
} from '@/lib/recipes';
import { getCurrentUserId } from '@/lib/supabase';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingSave, setIsTogglingSave] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const local = await getRecipe(id);
      if (cancelled) return;
      if (local) {
        setRecipe(local);
        setCanDelete(true);
        setIsLoading(false);
        return;
      }

      const publicRecipe = await getPublicRecipe(id);
      if (cancelled) return;
      setRecipe(publicRecipe ?? null);
      if (publicRecipe) {
        const currentUserId = await getCurrentUserId();
        if (!cancelled) setCanDelete(currentUserId !== null && currentUserId === publicRecipe.ownerId);
        const saved = await isPublicRecipeSaved(publicRecipe.id);
        if (!cancelled) setIsSaved(saved);
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const canSave = recipe?.source === 'public' && !canDelete;

  async function handleToggleSave() {
    if (!recipe || isTogglingSave) return;
    setIsTogglingSave(true);
    try {
      if (isSaved) {
        await removeSavedPublicRecipe(recipe.id);
        setIsSaved(false);
      } else {
        await savePublicRecipeToLibrary(recipe.id);
        setIsSaved(true);
      }
    } finally {
      setIsTogglingSave(false);
    }
  }

  const { ingredientsText, stepsText } = recipe
    ? splitBookContent(recipe.bookContent)
    : { ingredientsText: '', stepsText: '' };
  const tagChips = recipe ? buildRecipeTagChips(recipe) : [];

  function handleDelete() {
    if (!recipe) return;
    Alert.alert('このレシピを削除する?', undefined, [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: async () => {
          if (recipe.source === 'public') {
            await deletePublicRecipe(recipe.id, recipe.photoUri);
          } else {
            await deleteRecipe(recipe.id);
          }
          router.back();
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Image source={LAB_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <View style={[styles.absoluteFill, { backgroundColor: theme.background, opacity: 0.3 }]} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader onBack={() => router.back()} />

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!isLoading && !recipe && (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary">
              レシピが見つからなかったよ。
            </ThemedText>
          </View>
        )}

        {recipe && (
          <ScrollView contentContainerStyle={styles.content}>
            {recipe.photoUri && <Image source={{ uri: recipe.photoUri }} style={styles.photo} contentFit="cover" />}

            <ThemedView type="background" style={styles.formCard}>
              <ThemedText type="subtitle" style={styles.titleText}>{recipe.title}</ThemedText>
              {recipe.source === 'public' && recipe.authorName && (
                <ThemedText type="small" themeColor="textSecondary">
                  投稿者：{recipe.authorName}
                </ThemedText>
              )}
              {tagChips.length > 0 && (
                <View style={styles.tagWrap}>
                  {tagChips.map((chip) => (
                    <View
                      key={chip.key}
                      style={[styles.tagChip, { backgroundColor: chip.background, borderColor: chip.text }]}>
                      <ThemedText type="small" style={{ color: chip.text }}>
                        {chip.label}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              )}
              {recipe.summary && (
                <ThemedText style={styles.bodyText} themeColor="textSecondary">
                  {recipe.summary}
                </ThemedText>
              )}
            </ThemedView>

            {ingredientsText && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  材料
                </ThemedText>
                <ThemedText style={styles.bodyText}>{ingredientsText}</ThemedText>
              </ThemedView>
            )}
            {stepsText && (
              <ThemedView type="background" style={styles.formCard}>
                <ThemedText type="smallBold" style={styles.heading}>
                  作り方
                </ThemedText>
                <ThemedText style={styles.bodyText}>{stepsText}</ThemedText>
              </ThemedView>
            )}

            {canDelete && (
              <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteRow}>
                {({ pressed }) => (
                  <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                    削除する
                  </ThemedText>
                )}
              </Pressable>
            )}

            {canSave && (
              <Pressable onPress={handleToggleSave} disabled={isTogglingSave}>
                {({ pressed }) => (
                  <ThemedView
                    type={isSaved ? 'backgroundElement' : 'accent'}
                    style={[styles.saveButton, (pressed || isTogglingSave) && styles.pressed]}>
                    <ThemedText type="smallBold" themeColor={isSaved ? 'text' : 'background'}>
                      {isSaved ? '保存済み（タップで解除）' : '保存する'}
                    </ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            )}
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  absoluteFill: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Spacing.four,
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
  formCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  heading: {
    fontSize: 15,
  },
  titleText: {
    fontSize: 20,
    lineHeight: 26,
  },
  bodyText: {
    fontSize: 14,
    lineHeight: 22,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
