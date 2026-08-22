import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CONTACT_EMAIL } from '@/constants/contact';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';
import { getUsername } from '@/lib/user-profile';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

type ContactCategory = {
  id: string;
  label: string;
  description: string;
  subject: string;
  body: string;
};

const CONTACT_CATEGORIES: ContactCategory[] = [
  {
    id: 'bug',
    label: '不具合の報告',
    description: 'アプリの動作がおかしいとき',
    subject: 'WiCO 不具合のご報告',
    body: '【発生した画面】\n\n【操作内容】\n\n【期待していた動作】\n\n【実際の動作】\n\n（よければお使いの端末の種類やOSバージョンも教えてください）',
  },
  {
    id: 'request',
    label: 'ご要望・感想',
    description: 'こんな機能が欲しい、使ってみた感想など',
    subject: 'WiCO ご要望・感想',
    body: '【ご要望・感想の内容】\n\n',
  },
  {
    id: 'other',
    label: 'その他のご質問',
    description: '上のどれにも当てはまらない場合はこちら',
    subject: 'WiCO お問い合わせ',
    body: '【お問い合わせ内容】\n\n',
  },
];

async function handleOpenMail(category: ContactCategory) {
  const username = await getUsername();
  const body = username ? `${category.body}\n\n--\nお名前：${username}` : category.body;
  const url = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(category.subject)}&body=${encodeURIComponent(body)}`;
  Linking.openURL(url).catch(() => {
    Alert.alert('開けなかったよ', `お手数だけど、メールアプリから直接 ${CONTACT_EMAIL} 宛に送ってみてね。`);
  });
}

export default function ContactScreen() {
  const [isDay, setIsDay] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
    }, []),
  );

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="お問い合わせ" onBack={() => router.back()} />

        <View style={styles.content}>
          <ThemedView type="backgroundElement" style={styles.card}>
            <ThemedText type="small" themeColor="textSecondary">
              内容に近いものを選んでね。メールアプリが開いて、件名と本文のひな形が入った状態で送れるよ。
            </ThemedText>
            <ThemedText type="smallBold">{CONTACT_EMAIL}</ThemedText>
          </ThemedView>

          {CONTACT_CATEGORIES.map((category) => (
            <Pressable key={category.id} onPress={() => handleOpenMail(category)}>
              {({ pressed }) => (
                <ThemedView type="backgroundElement" style={[styles.categoryRow, pressed && styles.pressed]}>
                  <View style={styles.categoryTextWrap}>
                    <ThemedText type="smallBold">{category.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {category.description}
                    </ThemedText>
                  </View>
                  <ThemedView type="accent" style={styles.categoryButton}>
                    <ThemedText type="small" themeColor="background">
                      メールを送る
                    </ThemedText>
                  </ThemedView>
                </ThemedView>
              )}
            </Pressable>
          ))}
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
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.four,
  },
  categoryTextWrap: {
    flex: 1,
    gap: Spacing.half,
  },
  categoryButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
