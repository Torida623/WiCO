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
import { listMyPublicRecipes, listRecipes, listRecommendedRecipes, SavedRecipe } from '@/lib/recipes';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

type Tab = 'recommended' | 'saved' | 'posted';

const TAB_LOADERS: Record<Tab, () => Promise<SavedRecipe[]>> = {
  recommended: listRecommendedRecipes,
  saved: listRecipes,
  posted: listMyPublicRecipes,
};

const EMPTY_STATE_TEXT: Record<Tab, string> = {
  recommended: 'まだおすすめできるレシピがないよ。みんなの投稿が増えたらここに出るよ。',
  saved: 'まだ保存したレシピがないよ。気に入った献立や、自分のレシピを残してみてね。',
  posted: 'まだレシピを投稿してないよ。',
};

function formatSavedAt(savedAt: string): string {
  const date = new Date(savedAt);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

/** Only the 保存したレシピ tab mixes sources (own writing vs. saved from a decided menu) worth labeling — おすすめ/投稿したレシピ are each already a single, tab-implied source. */
function sourceLabel(source: SavedRecipe['source']): string | null {
  if (source === 'user') return '自分のレシピ';
  if (source === 'ai') return '献立ノートから保存';
  return null;
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.tabPressable}>
      {({ pressed }) => (
        <ThemedView
          type={active ? 'accent' : 'backgroundElement'}
          style={[styles.tabButton, pressed && styles.pressed]}>
          <ThemedText
            type="smallBold"
            themeColor={active ? 'background' : undefined}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}>
            {label}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function RecipeLabListScreen() {
  const theme = useTheme();
  const [tab, setTab] = useState<Tab>('recommended');
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setIsLoading(true);
      TAB_LOADERS[tab]().then((loaded) => {
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
        <ScreenHeader onBack={() => router.back()} />

        <View style={styles.searchRow}>
          <ThemedView type="backgroundElement" style={styles.searchButton}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              🔍 検索する
            </ThemedText>
            <View style={[styles.lockBadge, { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="small" themeColor="textSecondary">
                🔒 有料
              </ThemedText>
            </View>
          </ThemedView>
        </View>

        <View style={styles.tabRow}>
          <TabButton label="おすすめレシピ" active={tab === 'recommended'} onPress={() => setTab('recommended')} />
          <TabButton label="保存したレシピ" active={tab === 'saved'} onPress={() => setTab('saved')} />
          <TabButton label="投稿したレシピ" active={tab === 'posted'} onPress={() => setTab('posted')} />
        </View>

        {!isLoading && recipes.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              {EMPTY_STATE_TEXT[tab]}
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
                        {[sourceLabel(item.source), item.course, formatSavedAt(item.savedAt)]
                          .filter(Boolean)
                          .join(' ・ ')}
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
  searchRow: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  lockBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  tabRow: {
    flexDirection: 'row',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  tabPressable: {
    flex: 1,
  },
  tabButton: {
    alignItems: 'center',
    paddingHorizontal: Spacing.half,
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
