import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AggregatedIngredient, listAggregatedIngredients } from '@/lib/decided-menus';
import { getCheckedIngredients, setIngredientChecked } from '@/lib/shopping-memo';

export default function ShoppingMemoScreen() {
  const theme = useTheme();
  const [ingredients, setIngredients] = useState<AggregatedIngredient[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listAggregatedIngredients(), getCheckedIngredients()]).then(([loadedIngredients, loadedChecked]) => {
        if (!cancelled) {
          setIngredients(loadedIngredients);
          setChecked(loadedChecked);
          setIsLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  function toggleItem(name: string) {
    setChecked((current) => {
      const next = { ...current, [name]: !current[name] };
      setIngredientChecked(name, next[name]);
      return next;
    });
  }

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="お買い物メモ" onBack={() => router.back()} />

        {!isLoading && ingredients.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              48時間以内に決まった献立がまだないよ。「献立を考える」から決めてみてね。
            </ThemedText>
          </View>
        )}

        <ScrollView contentContainerStyle={styles.listContent}>
          {ingredients.map((item) => (
            <Pressable key={item.name} onPress={() => toggleItem(item.name)}>
              {({ pressed }) => (
                <ThemedView
                  type={checked[item.name] ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.row, pressed && styles.pressed]}>
                  <View
                    style={[
                      styles.checkbox,
                      { borderColor: checked[item.name] ? theme.accent : theme.textSecondary },
                      checked[item.name] && { backgroundColor: theme.accent },
                    ]}>
                    {checked[item.name] && (
                      <ThemedText type="smallBold" themeColor="background" style={styles.checkboxMark}>
                        ✓
                      </ThemedText>
                    )}
                  </View>
                  <ThemedText type="small" style={styles.itemName}>
                    {item.name}
                  </ThemedText>
                  {item.amounts.length > 0 && (
                    <ThemedText type="small" themeColor="textSecondary">
                      {item.amounts.join('、')}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            </Pressable>
          ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
    marginBottom: Spacing.two,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: Spacing.half,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxMark: {
    fontSize: 13,
    lineHeight: 15,
  },
  itemName: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
