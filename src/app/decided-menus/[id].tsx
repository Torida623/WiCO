import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RecipeBook } from '@/components/chat/recipe-book';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ENTRY_POINT_OPTIONS } from '@/constants/meal-flow';
import { MaxContentWidth } from '@/constants/theme';
import { DecidedMenu, getDecidedMenu } from '@/lib/decided-menus';

function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

export default function DecidedMenuDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [menu, setMenu] = useState<DecidedMenu | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDecidedMenu(id).then((loaded) => {
      if (!cancelled) {
        setMenu(loaded ?? null);
        setIsLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader
          title={menu ? ENTRY_POINT_OPTIONS.find((option) => option.value === menu.entryPoint)?.label : '献立'}
          onBack={() => router.back()}
        />

        {isLoading && (
          <View style={styles.centered}>
            <ActivityIndicator />
          </View>
        )}

        {!isLoading && !menu && (
          <View style={styles.centered}>
            <ThemedText type="small" themeColor="textSecondary">
              この献立はもう見られないみたい。48時間を過ぎると消えるよ。
            </ThemedText>
          </View>
        )}

        {menu && (
          <View style={styles.bookArea}>
            <RecipeBook content={extractBookContent(menu.recipeText)} onRestart={() => router.push('/menu-chat')} />
          </View>
        )}
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
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookArea: {
    flex: 1,
  },
});
