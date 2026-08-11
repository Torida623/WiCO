import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeListRow } from '@/components/recipe-list-row';
import { RecipeSearchPanel } from '@/components/recipe-search-panel';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listMyPublicRecipes, listRecommendedRecipes, listSavedRecipes, SavedRecipe } from '@/lib/recipes';
import { hasRecipeSearchAccess } from '@/lib/subscription';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

type Tab = 'recommended' | 'saved' | 'posted';

const TAB_LOADERS: Record<Tab, () => Promise<SavedRecipe[]>> = {
  recommended: listRecommendedRecipes,
  saved: listSavedRecipes,
  posted: listMyPublicRecipes,
};

const EMPTY_STATE_TEXT: Record<Tab, string> = {
  recommended: 'まだおすすめできるレシピがないよ。\nレシピが投稿されるのを待っててね！',
  saved: 'まだ保存したレシピがないよ。気に入った献立や、自分のレシピを残してみてね。',
  posted: 'まだレシピを投稿してないよ。',
};

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  function handlePressSearch() {
    if (!hasRecipeSearchAccess()) {
      Alert.alert('検索は有料会員限定の機能だよ', '有料プランに登録すると使えるようになるよ。');
      return;
    }
    setIsSearchOpen(true);
  }

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
          <Pressable onPress={handlePressSearch}>
            {({ pressed }) => (
              <ThemedView type="backgroundElement" style={[styles.searchButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  🔍 検索する
                </ThemedText>
                <View style={[styles.lockBadge, { backgroundColor: theme.backgroundSelected }]}>
                  <ThemedText type="small" themeColor="textSecondary">
                    🔒 有料
                  </ThemedText>
                </View>
              </ThemedView>
            )}
          </Pressable>
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
              <RecipeListRow recipe={item} onPress={() => router.push(`/recipe-lab/${item.id}`)} />
            )}
          />
        )}
      </SafeAreaView>

      <RecipeSearchPanel visible={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
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
  pressed: {
    opacity: 0.7,
  },
});
