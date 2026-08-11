import { Image, ImageSource } from 'expo-image';
import { Href, router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const LAB_BACKGROUND = require('@/assets/images/recipe-lab/lab-bg.jpg');
const POST_BUTTON = require('@/assets/images/recipe-lab/post-button.png');
const POST_BUTTON_ASPECT_RATIO = 1257 / 460;
const VIEW_BUTTON = require('@/assets/images/recipe-lab/view-button.png');
const VIEW_BUTTON_ASPECT_RATIO = 1255 / 444;

function ChoiceButton({
  source,
  aspectRatio,
  onPress,
}: {
  source: ImageSource;
  aspectRatio: number;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.choiceButtonWrap}>
      {({ pressed }) => (
        <Image
          source={source}
          style={[styles.choiceButton, { aspectRatio }, pressed && styles.pressed]}
          contentFit="contain"
        />
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
        <ScreenHeader />

        <View style={styles.content}>
          <ChoiceButton
            source={POST_BUTTON}
            aspectRatio={POST_BUTTON_ASPECT_RATIO}
            onPress={() => router.push('/recipe-lab/new' as Href)}
          />
          <ChoiceButton
            source={VIEW_BUTTON}
            aspectRatio={VIEW_BUTTON_ASPECT_RATIO}
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
  choiceButtonWrap: {
    width: '100%',
  },
  choiceButton: {
    width: '100%',
  },
  pressed: {
    opacity: 0.7,
  },
});
