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

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');

const MAIL_URL = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('WiCO お問い合わせ')}`;

function handleOpenMail() {
  Linking.openURL(MAIL_URL).catch(() => {
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
              不具合の報告、ご要望、その他ご質問などがあれば、下のボタンからメールでお気軽に送ってね。
            </ThemedText>
            <ThemedText type="smallBold">{CONTACT_EMAIL}</ThemedText>
          </ThemedView>

          <Pressable onPress={handleOpenMail}>
            {({ pressed }) => (
              <ThemedView type="accent" style={[styles.mailButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="background">
                  メールで問い合わせる
                </ThemedText>
              </ThemedView>
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
  mailButton: {
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
