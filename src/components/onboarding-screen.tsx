import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { markOnboarded, setBirthday, setUsername } from '@/lib/user-profile';

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

  async function handleStart() {
    setIsSaving(true);
    if (name.trim()) await setUsername(name);
    if (isValidMonth(month) && isValidDay(day)) {
      await setBirthday({ month: Number(month), day: Number(day) });
    }
    await markOnboarded();
    onComplete();
  }

  return (
    <ThemedView type="background" style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Spacing.six}>
          <View style={styles.content}>
            <ThemedText type="title" style={styles.heading}>
              はじめまして！
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.subheading}>
              お名前と誕生日を教えてね。誕生日にはペロココからプレゼントがあるよ。
              {'\n'}お名前はあとで設定から変更できるよ。誕生日は一度登録すると変更できないから、正しく入力してね（空欄のままでもOK）。
            </ThemedText>

            <View style={styles.field}>
              <ThemedText type="smallBold">お名前</ThemedText>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="例）さくら"
                placeholderTextColor={theme.textSecondary}
                maxLength={20}
                style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
              />
            </View>

            <View style={styles.field}>
              <ThemedText type="smallBold">誕生日</ThemedText>
              <View style={styles.birthdayRow}>
                <TextInput
                  value={month}
                  onChangeText={setMonth}
                  placeholder="月"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.input, styles.birthdayInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <ThemedText type="smallBold">月</ThemedText>
                <TextInput
                  value={day}
                  onChangeText={setDay}
                  placeholder="日"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="number-pad"
                  maxLength={2}
                  style={[styles.input, styles.birthdayInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
                />
                <ThemedText type="smallBold">日</ThemedText>
              </View>
            </View>

            <Pressable onPress={handleStart} disabled={isSaving}>
              {({ pressed }) => (
                <ThemedView type="accent" style={[styles.startButton, (pressed || isSaving) && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="background">
                    はじめる
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  },
  subheading: {
    textAlign: 'center',
    lineHeight: 20,
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
});
