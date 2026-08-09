import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listPublicRecipes, listRecipes, SavedRecipe } from '@/lib/recipes';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

type Tab = 'mine' | 'public';

function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function sourceLabel(source: SavedRecipe['source']): string {
  if (source === 'user') return '自分のレシピ';
  if (source === 'public') return 'みんなのレシピ';
  return '献立ノートから保存';
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabPressable}>
      {({ pressed }) => (
        <ThemedView
          type={active ? 'accent' : 'backgroundElement'}
          style={[styles.tabButton, pressed && styles.pressed]}>
          <ThemedText type="smallBold" themeColor={active ? 'background' : undefined}>
            {label}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function RecipeLabListScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('mine');
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      const load = tab === 'mine' ? listRecipes() : listPublicRecipes();
      load.then((loaded) => {
        if (!cancelled) {
          setRecipes(loaded);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, [tab]),
  );

  return (
    <View style={styles.container}>
      <Image source={LAB_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <View style={[styles.absoluteFill, { backgroundColor: theme.background, opacity: 0.3 }]} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="レシピを見る" onBack={() => router.back()} />

        <View style={styles.tabRow}>
          <TabButton label="自分のレシピ" active={tab === 'mine'} onPress={() => setTab('mine')} />
          <TabButton label="みんなのレシピ" active={tab === 'public'} onPress={() => setTab('public')} />
        </View>

        {!isLoading && recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              {tab === 'mine'
                ? 'まだ保存したレシピがないよ。気に入った献立や、自分のレシピを残してみてね。'
                : 'まだみんなのレシピが投稿されてないよ。'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={recipes}
            keyExtractor={(recipe) => recipe.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Pressable onPress={() => router.push(`/recipe-lab/${item.id}` as Href)}>
                {({ pressed }) => (
                  <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
                    {item.photoUri ? (
                      <Image source={{ uri: item.photoUri }} style={styles.thumbnail} contentFit="cover" />
                    ) : (
                      <View style={styles.thumbnailPlaceholder} />
                    )}
                    <View style={styles.rowText}>
                      <ThemedText type="smallBold" numberOfLines={2}>
                        {item.title}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {sourceLabel(item.source)}
                        {item.course ? ` ・ ${item.course}` : ''} ・ {formatSavedAt(item.savedAt)}
                      </ThemedText>
                    </View>
                  </ThemedView>
                )}
              </Pressable>
            )}
          />
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
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  tabPressable: {
    flex: 1,
  },
  tabButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
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
  pressed: {
    opacity: 0.7,
  },
});
