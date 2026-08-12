import { Image } from 'expo-image';
import { Href, router } from 'expo-router';
import { DimensionValue, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { MaxContentWidth, Spacing } from '@/constants/theme';

// Background and the three signs are one hand-drawn image (door + hanging plaque + two nameplates),
// so no separate button chrome/text is rendered — just invisible tap zones positioned over the art.
// Fills the whole screen like every other screen's background (same absoluteFill + cover pattern as
// recipe-lab/list.tsx), with the zones as siblings of the image so their % coordinates line up with it.
const HUB_BACKGROUND = require('@/assets/images/menu/menu-hub-door.jpg');

/** An invisible tap zone positioned over a hand-drawn sign baked into the door background. */
function DoorZone({
  top,
  height,
  left,
  right,
  onPress,
}: {
  top: DimensionValue;
  height: DimensionValue;
  left: DimensionValue;
  right: DimensionValue;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.doorZone, { top, height, left, right }]}>
      {({ pressed }) => pressed && <View style={styles.doorZonePressedOverlay} />}
    </Pressable>
  );
}

export default function MenuHubScreen() {
  return (
    <View style={styles.container}>
      <Image source={HUB_BACKGROUND} style={styles.absoluteFill} contentFit="cover" />
      <DoorZone top="26%" height="19%" left="5%" right="8%" onPress={() => router.push('/menu-chat')} />
      <DoorZone
        top="48%"
        height="16%"
        left="10%"
        right="12%"
        onPress={() => router.push('/decided-menus' as Href)}
      />
      <DoorZone
        top="66%"
        height="18%"
        left="10%"
        right="15%"
        onPress={() => router.push('/food-preferences' as Href)}
      />
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']} pointerEvents="box-none">
        <ScreenHeader />
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
  doorZone: {
    position: 'absolute',
  },
  doorZonePressedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: Spacing.three,
  },
});
