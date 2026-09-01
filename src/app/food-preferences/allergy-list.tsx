import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AllergenChecklist } from '@/components/chat/allergen-checklist';
import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useHierarchicalBack } from '@/hooks/use-hierarchical-back';
import { listAllergyFavorites, setAllergyFavorite } from '@/lib/food-preferences';

export default function AllergyListScreen() {
  const goBack = useHierarchicalBack();
  const [favorites, setFavorites] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listAllergyFavorites().then((loaded) => {
        if (!cancelled) setFavorites(loaded);
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  async function toggle(id: string) {
    const isFavorite = favorites.includes(id);
    setFavorites(await setAllergyFavorite(id, !isFavorite));
  }

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="アレルギー品目一覧" onBack={goBack} />

        <ScrollView contentContainerStyle={styles.content}>
          <AllergenChecklist checkedIds={favorites} onToggle={toggle} />
        </ScrollView>
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
  content: {
    padding: Spacing.three,
    gap: Spacing.four,
  },
});
