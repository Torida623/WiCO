import { Image } from 'expo-image';
import { Href, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { SideMenu } from '@/components/side-menu';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { isDaytime } from '@/constants/time-of-day';

const BACKGROUND_DAY = require('@/assets/images/perokoko-room/room-bg-day.jpg');
const BACKGROUND_NIGHT = require('@/assets/images/perokoko-room/room-bg-night.jpg');
const MASCOT_IMAGE_DAY = require('@/assets/images/mascot/perokoko-neutral.png');
const MASCOT_IMAGE_NIGHT = require('@/assets/images/mascot/perokoko-neutral-night.png');
const SPEECH_BUBBLE_IMAGE = require('@/assets/images/meal-log/speech-bubble-cloud.png');
const SPEECH_BUBBLE_ASPECT_RATIO = 1398 / 1125;

const ROOM_LINES = [
  'ここがペロココのお部屋だよ〜！',
  'ゆっくりしていってね！',
  '衣装、はやく着せてほしいなあ。',
  '困ったことがあったらヘルプを見てね！',
];

function pickRoomLine(): string {
  return ROOM_LINES[Math.floor(Math.random() * ROOM_LINES.length)];
}

// Each badge bakes its own label into the art, so no text overlay is needed. Cards share a fixed
// HEIGHT (not width) so every badge renders at its natural, un-shrunk size.
type RoomItem = { label: string; image: number; aspectRatio: number; route?: Href; disabled?: boolean };

const ROOM_ITEMS: RoomItem[] = [
  {
    label: '着替える',
    image: require('@/assets/images/perokoko-room/room-picker-costume.png'),
    aspectRatio: 1358 / 1158,
    disabled: true,
  },
  {
    label: 'ヘルプ',
    image: require('@/assets/images/perokoko-room/room-picker-help.png'),
    aspectRatio: 1355 / 1161,
    route: '/perokoko-room/tutorial' as Href,
  },
  {
    label: 'お問い合わせ',
    image: require('@/assets/images/perokoko-room/room-picker-contact.png'),
    aspectRatio: 1321 / 1177,
    route: '/perokoko-room/contact' as Href,
  },
  {
    label: '利用規約',
    image: require('@/assets/images/perokoko-room/room-picker-terms.png'),
    aspectRatio: 1244 / 1234,
    route: '/perokoko-room/terms' as Href,
  },
  {
    label: 'ショップ',
    image: require('@/assets/images/perokoko-room/room-picker-shop.png'),
    aspectRatio: 1228 / 1251,
    route: '/shop' as Href,
  },
];

const PICKER_ITEM_HEIGHT = 308;
const PICKER_GAP = Spacing.three;
const PICKER_VERTICAL_SHIFT = Dimensions.get('window').height * 0.12;
const MASCOT_VERTICAL_SHIFT = Dimensions.get('window').height * 0.05;

// Endless-loop picker: the item list is tripled, the ScrollView starts centered on the middle
// copy, and once the user scrolls deep enough into a buffer copy on either side it silently
// snaps back by exactly one copy's width — same position, so the jump is invisible.
const ITEM_WIDTHS = ROOM_ITEMS.map((item) => PICKER_ITEM_HEIGHT * item.aspectRatio);
const ONE_SET_WIDTH = ITEM_WIDTHS.reduce((sum, width) => sum + width + PICKER_GAP, 0);
const SET_COUNT = 3;
const DISPLAY_ITEMS = Array.from({ length: SET_COUNT }, (_, setIndex) =>
  ROOM_ITEMS.map((row) => ({ ...row, key: `${row.label}-${setIndex}` })),
).flat();

export default function PerokokoRoomScreen() {
  const [isDay, setIsDay] = useState(true);
  const [mascotLine, setMascotLine] = useState('');
  const scrollRef = useRef<ScrollView>(null);
  const hasCenteredRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      setIsDay(isDaytime());
      setMascotLine(pickRoomLine());
    }, []),
  );

  function handleInitialLayout() {
    if (hasCenteredRef.current) return;
    hasCenteredRef.current = true;
    scrollRef.current?.scrollTo({ x: ONE_SET_WIDTH, animated: false });
  }

  // Wrapping mid-flick (from onScroll) cancels the ScrollView's native momentum, which felt like
  // the picker "catching" on whichever card happened to be passing at that instant. Checking only
  // once the scroll has actually settled avoids interrupting momentum, so the wrap stays invisible.
  function handleScrollSettle(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    if (x < ONE_SET_WIDTH * 0.5) {
      scrollRef.current?.scrollTo({ x: x + ONE_SET_WIDTH, animated: false });
    } else if (x > ONE_SET_WIDTH * 2.5) {
      scrollRef.current?.scrollTo({ x: x - ONE_SET_WIDTH, animated: false });
    }
  }

  return (
    <View style={styles.container}>
      <Image source={isDay ? BACKGROUND_DAY : BACKGROUND_NIGHT} style={styles.absoluteFill} contentFit="cover" />
      {isDay && <ThemedView type="background" style={[styles.absoluteFill, { opacity: 0.3 }]} />}
      <SideMenu />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <ScreenHeader />

        <View style={styles.pickerArea}>
          <ScrollView
            ref={scrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            removeClippedSubviews
            decelerationRate="normal"
            onMomentumScrollEnd={handleScrollSettle}
            onScrollEndDrag={handleScrollSettle}
            onContentSizeChange={handleInitialLayout}
            contentContainerStyle={styles.pickerContent}>
            {DISPLAY_ITEMS.map((row) => (
              <RoomPickerCard key={row.key} row={row} />
            ))}
          </ScrollView>
        </View>

        <View style={styles.mascotRow} pointerEvents="none">
          <View style={styles.speechBubbleWrap}>
            <Image source={SPEECH_BUBBLE_IMAGE} style={styles.speechBubbleImage} contentFit="contain" />
            <View style={styles.speechBubbleTextArea}>
              <ThemedText style={styles.speechBubbleText}>{mascotLine}</ThemedText>
            </View>
          </View>
          <Image
            source={isDay ? MASCOT_IMAGE_DAY : MASCOT_IMAGE_NIGHT}
            style={styles.mascotImage}
            contentFit="contain"
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoomPickerCard({ row }: { row: RoomItem }) {
  return (
    <Pressable onPress={() => row.route && router.push(row.route)} disabled={row.disabled}>
      {({ pressed }) => (
        <Image
          source={row.image}
          style={[
            styles.card,
            { width: PICKER_ITEM_HEIGHT * row.aspectRatio },
            pressed && styles.pressed,
          ]}
          contentFit="contain"
        />
      )}
    </Pressable>
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
  mascotRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 75,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    transform: [{ translateY: -MASCOT_VERTICAL_SHIFT }],
  },
  speechBubbleWrap: {
    width: 285,
    aspectRatio: SPEECH_BUBBLE_ASPECT_RATIO,
    marginLeft: -Spacing.three,
    marginRight: -Spacing.three,
    marginBottom: Spacing.four,
    zIndex: 1,
  },
  speechBubbleImage: {
    width: '100%',
    height: '100%',
  },
  speechBubbleTextArea: {
    position: 'absolute',
    left: '19%',
    top: '24%',
    width: '62%',
    height: '48%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  speechBubbleText: {
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  mascotImage: {
    width: 193,
    aspectRatio: 1,
    marginLeft: -40,
    transform: [{ translateY: 40 }],
  },
  pickerArea: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: Spacing.five,
    transform: [{ translateY: PICKER_VERTICAL_SHIFT }],
  },
  pickerContent: {
    paddingHorizontal: Spacing.three,
    gap: PICKER_GAP,
  },
  card: {
    height: PICKER_ITEM_HEIGHT,
  },
  pressed: {
    opacity: 0.7,
  },
});
