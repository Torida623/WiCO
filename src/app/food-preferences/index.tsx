import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ALLERGENS } from '@/constants/allergens';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addDislikedIngredient,
  DISLIKED_INGREDIENT_LIMIT,
  listAllergyFavorites,
  listDislikedIngredients,
  removeDislikedIngredient,
  setAllergyFavorite,
} from '@/lib/food-preferences';

export default function FoodPreferencesScreen() {
  const theme = useTheme();
  const [disliked, setDisliked] = useState<string[]>([]);
  const [allergyFavorites, setAllergyFavorites] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      Promise.all([listDislikedIngredients(), listAllergyFavorites()]).then(([loadedDisliked, loadedAllergy]) => {
        if (!cancelled) {
          setDisliked(loadedDisliked);
          setAllergyFavorites(loadedAllergy);
        }
      });
      return () => {
        cancelled = true;
      };
    }, []),
  );

  const atDislikedLimit = disliked.length >= DISLIKED_INGREDIENT_LIMIT;

  async function handleAddDisliked() {
    const trimmed = freeText.trim();
    if (!trimmed || atDislikedLimit) return;
    const next = await addDislikedIngredient(trimmed);
    setDisliked(next);
    setFreeText('');
  }

  async function handleRemoveDisliked(name: string) {
    setDisliked(await removeDislikedIngredient(name));
  }

  async function handleRemoveAllergyFavorite(id: string) {
    setAllergyFavorites(await setAllergyFavorite(id, false));
  }

  const favoriteAllergens = ALLERGENS.filter((allergen) => allergyFavorites.includes(allergen.id));

  return (
    <ThemedView style={styles.container}>
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="苦手・アレルギー登録" onBack={() => router.back()} />

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.section}>
            <ThemedText type="smallBold">苦手な食材</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              登録しておくと献立を考えるときに毎回入力しなくて済むよ（上限{DISLIKED_INGREDIENT_LIMIT}件）
            </ThemedText>

            <View style={styles.chipRow}>
              {disliked.map((name) => (
                <Pressable key={name} onPress={() => handleRemoveDisliked(name)}>
                  {({ pressed }) => (
                    <ThemedView type="accent" style={[styles.chip, pressed && styles.pressed]}>
                      <ThemedText type="small" themeColor="background">
                        {name} ×
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              ))}
            </View>

            <View style={styles.inputRow}>
              <ThemedView type="backgroundElement" style={styles.textInputWrapper}>
                <TextInput
                  value={freeText}
                  onChangeText={setFreeText}
                  onSubmitEditing={handleAddDisliked}
                  editable={!atDislikedLimit}
                  placeholder={atDislikedLimit ? '上限に達したよ' : '苦手な食材を入力してね'}
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.textInput, { color: theme.text }]}
                />
              </ThemedView>
              <Pressable onPress={handleAddDisliked} disabled={atDislikedLimit || !freeText.trim()}>
                {({ pressed }) => (
                  <ThemedView
                    type="backgroundElement"
                    style={[styles.addButton, (pressed || atDislikedLimit || !freeText.trim()) && styles.pressed]}>
                    <ThemedText type="smallBold">追加</ThemedText>
                  </ThemedView>
                )}
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">アレルギー</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              登録した品目は献立を考えるときに避けてもらえるよ
            </ThemedText>

            <View style={styles.chipRow}>
              {favoriteAllergens.map((allergen) => (
                <Pressable key={allergen.id} onPress={() => handleRemoveAllergyFavorite(allergen.id)}>
                  {({ pressed }) => (
                    <ThemedView type="accent" style={[styles.chip, pressed && styles.pressed]}>
                      <ThemedText type="small" themeColor="background">
                        {allergen.label} ×
                      </ThemedText>
                    </ThemedView>
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => router.push('/food-preferences/allergy-list' as Href)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.listButton, pressed && styles.pressed]}>
                  <ThemedText type="smallBold">一覧から選ぶ</ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>
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
    gap: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + Spacing.half,
    borderRadius: Spacing.four,
  },
  inputRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  textInputWrapper: {
    flex: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  textInput: {
    fontSize: 16,
  },
  addButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  listButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
