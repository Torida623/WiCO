import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { DecidedMenu, listDecidedMenus } from '@/lib/decided-menus';

function extractMainDish(proposalText: string): string {
  return proposalText.match(/・(?:主菜|メイン)：(.+)/)?.[1]?.trim() ?? '（献立）';
}

function formatDecidedAt(decidedAt: string): string {
  const date = new Date(decidedAt);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function DecidedMenusScreen() {
  const [menus, setMenus] = useState<DecidedMenu[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listDecidedMenus().then((loaded) => {
        if (!cancelled) {
          setMenus(loaded);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="献立ノート" onBack={() => router.back()} />

        <View style={styles.shoppingMemoRow}>
          <Pressable onPress={() => router.push('/shopping-memo' as Href)}>
            {({ pressed }) => (
              <ThemedView type="backgroundElement" style={[styles.shoppingMemoButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">お買い物メモを見る</ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </View>

        {!isLoading && menus.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              決まった献立は48時間だけここに残るよ。「献立を考える」から決めてみてね。
            </ThemedText>
          </View>
        )}

        <FlatList
          data={menus}
          keyExtractor={(menu) => menu.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/decided-menus/${item.id}` as Href)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.row, pressed && styles.pressed]}>
                  <View style={styles.rowHeader}>
                    <ThemedText type="small" themeColor="textSecondary">
                      {ENTRY_POINT_OPTIONS.find((option) => option.value === item.entryPoint)?.label}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDecidedAt(item.decidedAt)}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold">{extractMainDish(item.proposalText)}</ThemedText>
                </ThemedView>
              )}
            </Pressable>
          )}
        />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  shoppingMemoRow: {
    paddingHorizontal: Spacing.three,
  },
  shoppingMemoButton: {
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
  listContent: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.one,
    marginBottom: Spacing.two,
  },
  rowHeader: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
