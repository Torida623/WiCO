import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeBook } from '@/components/chat/recipe-book';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deletePublicRecipe, deleteRecipe, getPublicRecipe, getRecipe, SavedRecipe } from '@/lib/recipes';
import { getCurrentUserId } from '@/lib/supabase';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

export default function RecipeDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<SavedRecipe | null>(null);
  const [canDelete, setCanDelete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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
      }
      setIsLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        <ScreenHeader title={recipe?.title ?? 'レシピ'} onBack={() => router.back()} />

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
          <>
            {recipe.photoUri && <Image source={{ uri: recipe.photoUri }} style={styles.photo} contentFit="cover" />}
            {recipe.course && (
              <View style={styles.courseBadgeRow}>
                <ThemedView type="backgroundElement" style={styles.courseBadge}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {recipe.course}
                  </ThemedText>
                </ThemedView>
              </View>
            )}
            <View style={styles.bookArea}>
              <RecipeBook content={recipe.bookContent} onRestart={() => router.back()} restartLabel="一覧に戻る" />
            </View>
            {canDelete && (
              <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteRow}>
                {({ pressed }) => (
                  <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                    削除する
                  </ThemedText>
                )}
              </Pressable>
            )}
          </>
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
  photo: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  courseBadgeRow: {
    alignItems: 'center',
    paddingTop: Spacing.two,
  },
  courseBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  bookArea: {
    flex: 1,
  },
  deleteRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
