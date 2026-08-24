import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markOnboarded, setBirthday, setUsername } from '@/lib/user-profile';

const BOOK_CLOSED = require('@/assets/images/onboarding-book.jpg');
const BOOK_OPEN = require('@/assets/images/onboarding-book-open.jpg');

// 本の表紙をまず素のまま見せて、少し間を置いてから「はじめまして」を暗転付きで出す演出。
const REVEAL_DELAY_MS = 1500;
const REVEAL_DURATION_MS = 600;

// 「はじめる」を押した後: 暗転を素の表紙に戻す → 閉本→開いた本をディゾルブで見せる
// → 少し間を置いて画面を真っ白にしてアプリ本編へ。
const UNDIM_DURATION_MS = 500;
const DISSOLVE_DURATION_MS = 800;
const OPEN_HOLD_MS = 1000;
const WHITE_FADE_DURATION_MS = 700;

export type OnboardingScreenProps = {
  onComplete: () => void;
};

function isValidMonth(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 12;
}

function isValidDay(value: string): boolean {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 31;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const scrimOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentTranslateY = useSharedValue(16);
  const openOpacity = useSharedValue(0);
  const whiteOpacity = useSharedValue(0);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
    timers.current.push(timer);
    scrimOpacity.value = withDelay(
      REVEAL_DELAY_MS,
      withTiming(1, { duration: REVEAL_DURATION_MS, easing: Easing.out(Easing.quad) }),
    );
    contentOpacity.value = withDelay(
      REVEAL_DELAY_MS,
      withTiming(1, { duration: REVEAL_DURATION_MS, easing: Easing.out(Easing.quad) }),
    );
    contentTranslateY.value = withDelay(
      REVEAL_DELAY_MS,
      withTiming(0, { duration: REVEAL_DURATION_MS, easing: Easing.out(Easing.quad) }),
    );
    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentTranslateY.value }],
  }));
  const openStyle = useAnimatedStyle(() => ({ opacity: openOpacity.value }));
  const whiteStyle = useAnimatedStyle(() => ({ opacity: whiteOpacity.value }));

  function playBookOpeningSequence() {
    scrimOpacity.value = withTiming(0, { duration: UNDIM_DURATION_MS, easing: Easing.out(Easing.quad) });
    contentOpacity.value = withTiming(0, { duration: UNDIM_DURATION_MS, easing: Easing.out(Easing.quad) });
    contentTranslateY.value = withTiming(16, { duration: UNDIM_DURATION_MS, easing: Easing.out(Easing.quad) });

    const openAt = UNDIM_DURATION_MS;
    const openCompleteAt = openAt + DISSOLVE_DURATION_MS;
    const whiteAt = openCompleteAt + OPEN_HOLD_MS;
    const completeAt = whiteAt + WHITE_FADE_DURATION_MS;

    timers.current.push(
      setTimeout(() => {
        openOpacity.value = withTiming(1, { duration: DISSOLVE_DURATION_MS, easing: Easing.inOut(Easing.quad) });
      }, openAt),
      setTimeout(() => {
        whiteOpacity.value = withTiming(1, { duration: WHITE_FADE_DURATION_MS, easing: Easing.out(Easing.quad) });
      }, whiteAt),
      setTimeout(onComplete, completeAt),
    );
  }

  const isFormValid = name.trim().length > 0 && isValidMonth(month) && isValidDay(day);

  async function handleStart() {
    if (!isFormValid) return;
    setIsSaving(true);
    await setUsername(name);
    await setBirthday({ month: Number(month), day: Number(day) });
    await markOnboarded();
    playBookOpeningSequence();
  }

  return (
    <View style={styles.container}>
      <Image source={BOOK_CLOSED} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject, openStyle]}>
        <Image source={BOOK_OPEN} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.scrim, scrimStyle]} />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Spacing.six}>
          <Animated.View
            style={[styles.content, contentStyle]}
            pointerEvents={revealed && !isSaving ? 'auto' : 'none'}>
            <ThemedText type="title" style={[styles.heading, styles.onDarkText]}>
              はじめまして！
            </ThemedText>
            <ThemedText type="small" style={[styles.subheading, styles.onDarkTextSecondary]}>
              ニックネームと誕生日を教えてね。
              {'\n'}誕生日にはいいことがあるかも！？
              {'\n'}誕生日は一度登録すると変更できないから正しく入力してね！
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold" style={styles.onDarkText}>
                ニックネーム
              </ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                maxLength={20}
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold" style={styles.onDarkText}>
                誕生日
              </ThemedText>
              <View style={styles.birthdayRow}>
                <TextInput
                  value={month}
                  onChangeText={setMonth}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.input, styles.birthdayInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <ThemedText type="smallBold" style={styles.onDarkText}>
                  月
                </ThemedText>
                <TextInput
                  value={day}
                  onChangeText={setDay}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.input, styles.birthdayInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <ThemedText type="smallBold" style={styles.onDarkText}>
                  日
                </ThemedText>
              </View>
            </View>

            <Pressable onPress={handleStart} disabled={!isFormValid || isSaving}>
              {({ pressed }) => (
                <ThemedView
                  type="accent"
                  style={[
                    styles.startButton,
                    (pressed || isSaving) && styles.pressed,
                    !isFormValid && styles.disabled,
                  ]}>
                  <ThemedText type="smallBold" themeColor="background">
                    はじめる
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <Animated.View pointerEvents="none" style={[styles.whiteFade, whiteStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  whiteFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
  },
  flex: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.four,
  },
  heading: {
    textAlign: 'center',
    fontSize: 24,
    lineHeight: 26,
  },
  subheading: {
    textAlign: 'center',
    lineHeight: 20,
  },
  onDarkText: {
    color: '#FFFFFF',
  },
  onDarkTextSecondary: {
    color: 'rgba(255,255,255,0.85)',
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  birthdayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  birthdayInput: {
    width: 64,
    textAlign: 'center',
  },
  startButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    marginTop: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.4,
  },
});
