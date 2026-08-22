import { useEffect } from 'react';
import { Dimensions, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { findCostume, getMascotNeutralImage } from '@/lib/costumes';
import { clearGift, usePendingGift } from '@/lib/gift-reveal-store';

const GIFT_BOX_IMAGE = require('@/assets/images/perokoko-room/gift-box.png');
const GIFT_BOX_ASPECT_RATIO = 1312 / 1199;
const BOX_WIDTH = 231;
const COSTUME_SIZE = 273;

// 画面のどの角にも届く直径（対角線+余白）— このサイズを100%まで拡大すれば、
// 箱の中心から広がった白が画面全体を覆い切る。
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const WHITE_FADE_DIAMETER = Math.sqrt(SCREEN_WIDTH ** 2 + SCREEN_HEIGHT ** 2) * 1.15;

/**
 * 「プレゼント!!」の演出オーバーレイ。ルートレイアウトに1つだけ置いて、[[gift-reveal-store]]の
 * announceGift() をどこから呼んでも（誕生日プレゼント・はじめての料理シリーズのプレゼントなど）
 * 同じ演出で受け取れるようにしている。
 *
 * 演出の流れ: 箱がフェードイン → ぽよん×2（ジャンプ+スクワッシュ） → 箱の中心からゆっくり白が
 * 広がって画面全体を覆う → 白い画面の上に衣装がバーンと登場。「プレゼント!!」表示中は白いまま
 * 維持し、うけとるボタンで演出ごと閉じる。
 */
export function GiftRevealOverlay() {
  const costumeId = usePendingGift();
  const costume = costumeId ? findCostume(costumeId) : undefined;

  const scrimOpacity = useSharedValue(0);
  const boxOpacity = useSharedValue(0);
  const boxScale = useSharedValue(0.7);
  const boxTranslateY = useSharedValue(0);
  const whiteFadeOpacity = useSharedValue(0);
  const whiteFadeScale = useSharedValue(0);
  const costumeScale = useSharedValue(0);
  const costumeOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (!costumeId) return;

    function startWhiteFade() {
      'worklet';
      const fadeDuration = 1400;
      const revealAt = fadeDuration - 500; // スキンを白フェードの完了より0.5秒早く出す

      whiteFadeScale.value = withTiming(1, { duration: fadeDuration, easing: Easing.out(Easing.cubic) });
      whiteFadeOpacity.value = withTiming(1, { duration: fadeDuration, easing: Easing.out(Easing.cubic) });

      // 白は消さずそのまま維持 — 「プレゼント!!」が出ている間は画面を白いままにしておく。
      // うけとるボタンで閉じる時にオーバーレイごと消える。
      boxOpacity.value = withDelay(revealAt, withTiming(0, { duration: 100 }));
      costumeScale.value = withDelay(revealAt, withSpring(1, { damping: 18, stiffness: 140 }));
      costumeOpacity.value = withDelay(revealAt, withTiming(1, { duration: 200 }));
      textOpacity.value = withDelay(revealAt + 300, withTiming(1, { duration: 300 }));
    }

    function runBounce() {
      'worklet';
      boxTranslateY.value = withTiming(-22, { duration: 180, easing: Easing.out(Easing.quad) }, (finished) => {
        if (!finished) return;
        boxTranslateY.value = withTiming(0, { duration: 220, easing: Easing.bounce }, (finished2) => {
          if (!finished2) return;
          boxTranslateY.value = withTiming(-22, { duration: 180, easing: Easing.out(Easing.quad) }, (finished3) => {
            if (!finished3) return;
            boxTranslateY.value = withTiming(0, { duration: 220, easing: Easing.bounce }, (finished4) => {
              if (finished4) startWhiteFade();
            });
          });
        });
      });
      boxScale.value = withTiming(1.08, { duration: 180 }, () => {
        boxScale.value = withTiming(0.9, { duration: 100 }, () => {
          boxScale.value = withTiming(1, { duration: 120 }, () => {
            boxScale.value = withTiming(1.08, { duration: 180 }, () => {
              boxScale.value = withTiming(0.9, { duration: 100 }, () => {
                boxScale.value = withTiming(1, { duration: 120 });
              });
            });
          });
        });
      });
    }

    scrimOpacity.value = 0;
    boxOpacity.value = 0;
    boxScale.value = 0.7;
    boxTranslateY.value = 0;
    whiteFadeOpacity.value = 0;
    whiteFadeScale.value = 0;
    costumeScale.value = 0;
    costumeOpacity.value = 0;
    textOpacity.value = 0;

    scrimOpacity.value = withTiming(1, { duration: 250 });
    boxOpacity.value = withTiming(1, { duration: 250 });
    boxScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runBounce();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costumeId]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrimOpacity.value }));
  const boxStyle = useAnimatedStyle(() => ({
    opacity: boxOpacity.value,
    transform: [{ translateY: boxTranslateY.value }, { scale: boxScale.value }],
  }));
  const whiteFadeStyle = useAnimatedStyle(() => ({
    opacity: whiteFadeOpacity.value,
    transform: [{ scale: whiteFadeScale.value }],
  }));
  const costumeStyle = useAnimatedStyle(() => ({
    opacity: costumeOpacity.value,
    transform: [{ scale: costumeScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  if (!costumeId || !costume) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="auto" />

      <View style={[styles.stack, styles.boxLayer]} pointerEvents="none">
        <Animated.Image source={GIFT_BOX_IMAGE} style={[styles.box, boxStyle]} resizeMode="contain" />
      </View>

      <Animated.View style={[styles.whiteFade, whiteFadeStyle]} pointerEvents="none" />

      <View style={[styles.stack, styles.costumeLayer]} pointerEvents="none">
        <Animated.Image
          source={getMascotNeutralImage(costumeId, true, { allowBackground: true })}
          style={[styles.costume, costumeStyle]}
          resizeMode="contain"
        />
      </View>

      <Animated.View style={[styles.textArea, textStyle]} pointerEvents="box-none">
        <ThemedText type="subtitle" style={styles.title}>
          プレゼントが届いたよ！
        </ThemedText>
        <ThemedText type="smallBold" style={styles.label}>
          {costume.label}
        </ThemedText>
        <Pressable onPress={() => clearGift()}>
          {({ pressed }) => (
            <ThemedView type="accent" style={[styles.receiveButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="background">
                うけとる
              </ThemedText>
            </ThemedView>
          )}
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  whiteFade: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -WHITE_FADE_DIAMETER / 2,
    marginLeft: -WHITE_FADE_DIAMETER / 2,
    width: WHITE_FADE_DIAMETER,
    height: WHITE_FADE_DIAMETER,
    borderRadius: WHITE_FADE_DIAMETER / 2,
    backgroundColor: '#FFFFFF',
    zIndex: 2,
  },
  stack: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: COSTUME_SIZE,
    height: COSTUME_SIZE,
    marginTop: -COSTUME_SIZE / 2,
    marginLeft: -COSTUME_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxLayer: {
    zIndex: 1,
  },
  costumeLayer: {
    zIndex: 3,
  },
  box: {
    position: 'absolute',
    width: BOX_WIDTH,
    height: BOX_WIDTH / GIFT_BOX_ASPECT_RATIO,
  },
  costume: {
    position: 'absolute',
    width: COSTUME_SIZE,
    height: COSTUME_SIZE,
  },
  textArea: {
    position: 'absolute',
    bottom: '14%',
    alignItems: 'center',
    gap: Spacing.two,
    zIndex: 4,
  },
  title: {
    textAlign: 'center',
    fontSize: 20,
    lineHeight: 26,
  },
  label: {
    textAlign: 'center',
  },
  receiveButton: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
