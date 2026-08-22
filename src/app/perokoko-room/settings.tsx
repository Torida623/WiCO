import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { useTheme } from '@/hooks/use-theme';
import { setBgmVolume, useBgmVolume } from '@/lib/bgm-volume-store';
import { announceGift } from '@/lib/gift-reveal-store';
import { getUsername, resetOnboarding, setUsername } from '@/lib/user-profile';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

const VOLUME_OPTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

function volumeLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const [isDay, setIsDay] = useState(true);
  const [name, setName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const volume = useBgmVolume();

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
      getUsername().then((stored) => setName(stored ?? ''));
    }, []),
  );

  async function handleSaveName() {
    setIsSavingName(true);
    await setUsername(name);
    setIsSavingName(false);
    Alert.alert('保存したよ', 'ユーザー名を更新したよ。');
  }

  function handleSelectVolume(value: number) {
    setBgmVolume(value).catch((error) => console.error(error));
  }

  function handleResetOnboarding() {
    Alert.alert('初期設定をやり直す？', 'お名前と誕生日の登録が消えて、次回ドアをタップした時にもう一度聞かれるようになるよ。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: 'リセットする',
        style: 'destructive',
        onPress: async () => {
          await resetOnboarding();
          setName('');
          Alert.alert('リセットしたよ', 'アプリを再起動（リロード）すると、ドアからやり直せるよ。');
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="設定" onBack={() => router.replace('/perokoko-room' as Href)} />

        <View style={styles.content}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">ユーザー名</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              レシピ研究所に投稿したときの「投稿者」表示や、お問い合わせメールの署名に使うよ。
            </ThemedText>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="例）さくら"
              placeholderTextColor={theme.textSecondary}
              maxLength={20}
              style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            />
            <Pressable onPress={handleSaveName} disabled={isSavingName}>
              {({ pressed }) => (
                <ThemedView type="accent" style={[styles.saveButton, (pressed || isSavingName) && styles.pressed]}>
                  <ThemedText type="smallBold" themeColor="background">
                    {isSavingName ? '保存中…' : '保存する'}
                  </ThemedText>
                </ThemedView>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="smallBold">BGM音量</ThemedText>
            <View style={styles.volumeRow}>
              {VOLUME_OPTIONS.map((value) => {
                const selected = volume === value;
                return (
                  <Pressable key={value} onPress={() => handleSelectVolume(value)} style={styles.volumeChipWrap}>
                    {({ pressed }) => (
                      <ThemedView
                        type={selected ? 'accent' : 'background'}
                        style={[styles.volumeChip, pressed && styles.pressed]}>
                        <ThemedText type="small" themeColor={selected ? 'background' : 'textSecondary'}>
                          {volumeLabel(value)}
                        </ThemedText>
                      </ThemedView>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          <Pressable onPress={handleResetOnboarding} hitSlop={8} style={styles.resetRow}>
            {({ pressed }) => (
              <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                初期設定をやり直す
              </ThemedText>
            )}
          </Pressable>

          {/* TODO(運営者): プレゼント演出の見た目を詰めるための一時的な確認ボタン。演出が固まったら削除する。 */}
          <Pressable
            onPress={() => announceGift('birthday-cake-premium')}
            hitSlop={8}
            style={styles.resetRow}>
            {({ pressed }) => (
              <ThemedText type="small" themeColor="textSecondary" style={pressed && styles.pressed}>
                （開発用）プレゼント演出をテストする
              </ThemedText>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
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
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  input: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  saveButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  volumeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  volumeChipWrap: {
    flex: 1,
  },
  volumeChip: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  resetRow: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
