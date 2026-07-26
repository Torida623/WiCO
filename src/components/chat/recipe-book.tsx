import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Fonts, Spacing } from '@/constants/theme';

const CLOSED_BOOK = require('@/assets/images/mascot/wico-book-closed.png');
const OPEN_BOOK_FLAT = require('@/assets/images/mascot/wico-book-open-flat.png');
const OPEN_BOOK_TURNING = require('@/assets/images/mascot/wico-book-turning.png');

const OPEN_BOOK_ASPECT_RATIO = 1402 / 1122;
const STEPS_MARKER = '【作り方】';
const PAGE_CHAR_BUDGET = 170;

function paginateText(text: string, budget: number): string[] {
  const lines = text.split('\n');
  const pages: string[] = [];
  let current = '';

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > budget && current) {
      pages.push(current);
      current = line;
    } else {
      current = candidate;
    }
  }
  if (current) pages.push(current);
  return pages;
}

function splitIntoPages(content: string): string[] {
  const stepsIndex = content.indexOf(STEPS_MARKER);
  if (stepsIndex < 0) return paginateText(content.trim(), PAGE_CHAR_BUDGET);

  const ingredientsText = content.slice(0, stepsIndex).trim();
  const stepsText = content.slice(stepsIndex).trim();
  const pages = [ingredientsText, ...paginateText(stepsText, PAGE_CHAR_BUDGET)].filter(Boolean);
  return pages.length ? pages : [content.trim()];
}

export type RecipeBookProps = {
  content: string;
  onRestart: () => void;
};

export function RecipeBook({ content, onRestart }: RecipeBookProps) {
  const pages = splitIntoPages(content);

  const [opened, setOpened] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const pageScrollRef = useRef<ScrollView>(null);

  const closedOpacity = useSharedValue(0);
  const closedScale = useSharedValue(1);
  const openOpacity = useSharedValue(0);
  const openScale = useSharedValue(0.92);
  const pageContentOpacity = useSharedValue(0);
  const turnOpacity = useSharedValue(0);
  const hintOpacity = useSharedValue(0);

  useEffect(() => {
    closedOpacity.value = withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
    hintOpacity.value = withDelay(500, withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }));
  }, [closedOpacity, hintOpacity]);

  function handleOpen() {
    if (opened) return;
    setOpened(true);

    closedOpacity.value = withTiming(0, { duration: 700, easing: Easing.out(Easing.quad) });
    closedScale.value = withTiming(1.1, { duration: 700, easing: Easing.out(Easing.quad) });

    openOpacity.value = withTiming(1, { duration: 1000, easing: Easing.out(Easing.quad) });
    openScale.value = withSequence(
      withTiming(1.04, { duration: 550, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 420 }),
    );

    pageContentOpacity.value = withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) });
  }

  function goToNextPage() {
    if (transitioning || pageIndex >= pages.length - 1) return;
    setTransitioning(true);

    pageContentOpacity.value = withTiming(0, { duration: 350, easing: Easing.in(Easing.quad) });
    turnOpacity.value = withTiming(1, { duration: 550, easing: Easing.out(Easing.quad) });

    setTimeout(() => {
      setPageIndex((i) => i + 1);
      pageScrollRef.current?.scrollTo({ y: 0, animated: false });
      turnOpacity.value = withTiming(0, { duration: 650, easing: Easing.in(Easing.quad) });
      pageContentOpacity.value = withTiming(1, { duration: 750, easing: Easing.out(Easing.quad) });
      setTransitioning(false);
    }, 600);
  }

  const closedStyle = useAnimatedStyle(() => ({
    opacity: closedOpacity.value,
    transform: [{ scale: closedScale.value }],
  }));
  const openStyle = useAnimatedStyle(() => ({
    opacity: openOpacity.value,
    transform: [{ scale: openScale.value }],
  }));
  const pageContentStyle = useAnimatedStyle(() => ({
    opacity: pageContentOpacity.value,
  }));
  const turnStyle = useAnimatedStyle(() => ({
    opacity: turnOpacity.value,
  }));
  const hintStyle = useAnimatedStyle(() => ({
    opacity: hintOpacity.value,
  }));

  const hasMorePages = pageIndex < pages.length - 1;

  return (
    <View style={styles.container}>
      <View style={styles.stack}>
        <Animated.View style={[styles.layer, openStyle]}>
          <Image source={OPEN_BOOK_FLAT} style={styles.bookImage} contentFit="contain" />
          <Animated.View style={[styles.textOverlay, pageContentStyle]}>
            <ScrollView ref={pageScrollRef} contentContainerStyle={styles.textScrollContent}>
              <ThemedText style={styles.recipeText}>{pages[pageIndex]}</ThemedText>
            </ScrollView>
          </Animated.View>
          <Animated.View style={[styles.layer, turnStyle]} pointerEvents="none">
            <Image source={OPEN_BOOK_TURNING} style={styles.bookImage} contentFit="contain" />
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.layer, closedStyle]} pointerEvents={opened ? 'none' : 'auto'}>
          <Pressable onPress={handleOpen} style={styles.layer}>
            <Image source={CLOSED_BOOK} style={styles.bookImage} contentFit="contain" />
          </Pressable>
        </Animated.View>
      </View>

      {!opened && (
        <Animated.View style={hintStyle}>
          <ThemedText type="small" themeColor="text" style={styles.hint}>
            タップして開く
          </ThemedText>
        </Animated.View>
      )}

      {opened && hasMorePages && (
        <Pressable onPress={goToNextPage} disabled={transitioning}>
          {({ pressed }) => (
            <ThemedView type="accent" style={[styles.nextButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="background">
                つづきを見る ▶
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>
      )}

      {opened && !hasMorePages && (
        <>
          <Pressable onPress={() => {}}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.restartButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  一緒につくる
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>

          <Pressable onPress={onRestart}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.restartButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  もう一度考える
                </ThemedText>
              </ThemedView>
            )}
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.two,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  stack: {
    width: '100%',
    aspectRatio: OPEN_BOOK_ASPECT_RATIO,
  },
  layer: {
    ...StyleSheet.absoluteFillObject,
  },
  bookImage: {
    width: '100%',
    height: '100%',
  },
  textOverlay: {
    position: 'absolute',
    top: '15%',
    left: '14%',
    right: '14%',
    bottom: '17%',
  },
  textScrollContent: {
    flexGrow: 1,
  },
  recipeText: {
    fontFamily: Fonts.serif,
    fontSize: 13,
    lineHeight: 19,
    color: '#5B4636',
  },
  hint: {
    fontWeight: '700',
  },
  nextButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  restartButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  pressed: {
    opacity: 0.7,
  },
});
