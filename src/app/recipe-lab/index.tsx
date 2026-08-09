import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');

function ChoiceButton({
  type,
  title,
  subtitle,
  titleColor,
  onPress,
}: {
  type: 'accent' | 'backgroundElement';
  title: string;
  subtitle: string;
  titleColor?: 'background';
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <ThemedView type={type} style={[styles.choiceButton, pressed && styles.pressed]}>
          <ThemedText type="subtitle" themeColor={titleColor}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor={titleColor ?? 'textSecondary'}>
            {subtitle}
          </ThemedText>
        </ThemedView>
      )}
    </Pressable>
  );
}

export default function RecipeLabScreen() {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      <Image source={LAB_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <View style={[styles.absoluteFill, { backgroundColor: theme.background, opacity: 0.3 }]} />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader title="レシピ研究所" />

        <View style={styles.content}>
          <ChoiceButton
            type="accent"
            title="レシピを投稿する"
            subtitle="投稿するとみんなのレシピに公開されるよ"
            titleColor="background"
            onPress={() => router.push('/recipe-lab/new' as Href)}
          />
          <ChoiceButton
            type="backgroundElement"
            title="レシピを見る"
            subtitle="保存したレシピを振り返るよ"
            onPress={() => router.push('/recipe-lab/list' as Href)}
          />
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
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  choiceButton: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: Spacing.five,
    borderRadius: Spacing.four,
    gap: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
