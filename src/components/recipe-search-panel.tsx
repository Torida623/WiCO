import { Href, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Dimensions, FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { RecipeListRow } from '@/components/recipe-list-row';
import { ThemedText } from '@/components/themed-text';
import {
  COURSE_TAG_TINT,
  Course,
  FORMAT_TAG_OPTIONS,
  FORMAT_TAG_TINT,
  GENRE_TAG_OPTIONS,
  GENRE_TAG_TINT,
  TASTE_TAG_OPTIONS,
  TASTE_TAG_TINT,
  TEMPERATURE_TAG_OPTIONS,
  TEMPERATURE_TAG_TINT,
} from '@/constants/meal-flow';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { listSearchableRecipes, SavedRecipe } from '@/lib/recipes';
import { TagChips } from '@/components/chat/tag-chips';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CLOSE_DRAG_DISTANCE = 100;

// This search screen filters on the course itself, so it uses the plain course names —
// unlike the shared COURSE_OPTIONS (constants/meal-flow.ts), whose 主食 label is the more
// descriptive "ごはん・パン・麺" for the post form's context and shouldn't change here.
const SEARCH_COURSE_OPTIONS: { value: Course; label: string }[] = [
  { value: '主食', label: '主食' },
  { value: '主菜', label: '主菜' },
  { value: '副菜', label: '副菜' },
  { value: '汁物', label: '汁物' },
];
const CLOSE_VELOCITY = 600;

export type RecipeSearchPanelProps = {
  visible: boolean;
  onClose: () => void;
};

/**
 * Full-screen overlay that slides in from the right (same animated-panel + pan-to-dismiss
 * pattern as SideMenu, just the opposite edge). Fetches the public feed once per open and
 * filters it client-side by title + the same course/genre/format/taste/temperature tags used
 * on the post form, so results narrow live as filters are picked.
 */
export function RecipeSearchPanel({ visible, onClose }: RecipeSearchPanelProps) {
  const theme = useTheme();
  const translateX = useSharedValue(SCREEN_WIDTH);
  const [recipes, setRecipes] = useState<SavedRecipe[]>([]);
  const [query, setQuery] = useState('');
  const [course, setCourse] = useState<Course | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [taste, setTaste] = useState<string | null>(null);
  const [temperature, setTemperature] = useState<string | null>(null);

  useEffect(() => {
    translateX.value = withTiming(visible ? 0 : SCREEN_WIDTH, { duration: 320, easing: Easing.out(Easing.quad) });
  }, [visible, translateX]);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    listSearchableRecipes().then((loaded) => {
      if (!cancelled) setRecipes(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = Math.max(0, event.translationX);
    })
    .onEnd((event) => {
      const shouldClose = event.translationX > CLOSE_DRAG_DISTANCE || event.velocityX > CLOSE_VELOCITY;
      if (shouldClose) {
        translateX.value = withTiming(SCREEN_WIDTH, { duration: 260, easing: Easing.in(Easing.quad) });
        scheduleOnRN(onClose);
      } else {
        translateX.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.quad) });
      }
    });

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  const trimmedQuery = query.trim().toLowerCase();
  const filtered = recipes.filter((recipe) => {
    if (trimmedQuery && !recipe.title.toLowerCase().includes(trimmedQuery)) return false;
    if (course && recipe.course !== course) return false;
    if (genre && recipe.genreTag !== genre) return false;
    if (format && recipe.formatTag !== format) return false;
    if (taste && recipe.tasteTag !== taste) return false;
    if (temperature && recipe.temperatureTag !== temperature) return false;
    return true;
  });

  function handleSelectRecipe(id: string) {
    router.push(`/recipe-lab/${id}` as Href);
  }

  return (
    <View
      style={[StyleSheet.absoluteFillObject, styles.overlay]}
      pointerEvents={visible ? 'box-none' : 'none'}>
      {visible && (
        <Pressable style={[StyleSheet.absoluteFillObject, styles.backdrop]} onPress={onClose} />
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.panel, { backgroundColor: theme.background }, panelStyle]}>
          <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <View style={styles.header}>
              <Pressable onPress={onClose} hitSlop={8}>
                {({ pressed }) => (
                  <ThemedText type="smallBold" themeColor="textSecondary" style={pressed && styles.pressed}>
                    閉じる
                  </ThemedText>
                )}
              </Pressable>
            </View>

            <View style={[styles.section, styles.searchSection]}>
              <ThemedText type="smallBold" themeColor="accent" style={[styles.heading, styles.methodHeading]}>
                料理名で検索する
              </ThemedText>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="料理名で検索"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
              />
            </View>

            <ThemedText
              type="smallBold"
              themeColor="accent"
              style={[styles.heading, styles.tagSearchHeading, styles.methodHeading]}>
              料理タグで検索する
            </ThemedText>

            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.heading}>
                料理の種類
              </ThemedText>
              <TagChips
                options={SEARCH_COURSE_OPTIONS}
                selected={course}
                onSelect={(value) => setCourse(value as Course | null)}
                tint={COURSE_TAG_TINT}
              />
            </View>

            <View style={styles.section}>
              <ThemedText type="smallBold" style={styles.heading}>
                料理の特徴
              </ThemedText>
              <TagChips options={GENRE_TAG_OPTIONS} selected={genre} onSelect={setGenre} tint={GENRE_TAG_TINT} />
              <TagChips options={FORMAT_TAG_OPTIONS} selected={format} onSelect={setFormat} tint={FORMAT_TAG_TINT} />
              <TagChips
                options={TASTE_TAG_OPTIONS.slice(0, 2)}
                selected={taste}
                onSelect={setTaste}
                tint={TASTE_TAG_TINT}
              />
              <TagChips
                options={TASTE_TAG_OPTIONS.slice(2)}
                selected={taste}
                onSelect={setTaste}
                tint={TASTE_TAG_TINT}
              />
              <TagChips
                options={TEMPERATURE_TAG_OPTIONS}
                selected={temperature}
                onSelect={setTemperature}
                tint={TEMPERATURE_TAG_TINT}
              />
            </View>

            <FlatList
              data={filtered}
              keyExtractor={(recipe) => recipe.id}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <RecipeListRow recipe={item} onPress={() => handleSelectRecipe(item.id)} />
              )}
            />

            <View style={styles.resultCount}>
              <ThemedText type="small" themeColor="textSecondary">
                検索結果：{filtered.length}件
              </ThemedText>
            </View>
          </SafeAreaView>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  // Must beat SideMenu's button (zIndex 10) and its own dropdown panel (zIndex 20), which are
  // both absolutely-positioned siblings of this panel in recipe-lab/list.tsx.
  overlay: {
    zIndex: 30,
  },
  backdrop: {
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    marginBottom: Spacing.four,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + Spacing.half,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    fontSize: 14,
  },
  section: {
    paddingHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    gap: Spacing.two,
  },
  searchSection: {
    marginBottom: Spacing.six,
  },
  heading: {
    marginBottom: Spacing.one,
  },
  tagSearchHeading: {
    paddingHorizontal: Spacing.four,
  },
  methodHeading: {
    fontSize: 18,
    lineHeight: 24,
  },
  resultCount: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
