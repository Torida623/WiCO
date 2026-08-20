import { Image } from 'expo-image';
import { useCallback, useRef } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DissolveBackground } from '@/components/dissolve-background';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';

const MENU_BACKGROUNDS = [
  require('@/assets/images/menu/menu-bg-hallway.jpg'),
  require('@/assets/images/menu/menu-bg-bread.jpg'),
  require('@/assets/images/menu/menu-bg-stove.jpg'),
  require('@/assets/images/menu/menu-bg-rug.jpg'),
];

export type TitleMenuScreenProps = {
  onSelectMenuProposal: () => void;
  onSelectMealMemories: () => void;
  onSelectShoppingMemo: () => void;
  onSelectBudget: () => void;
  onSelectRecipeLab: () => void;
  onSelectPerokokoRoom: () => void;
};

// Each badge is a circle drawn edge-to-edge inside a square JPG (white corners outside the
// circle) with its label baked into the art, so a half-width borderRadius crops away the
// corners into a clean circular button — no separate text overlay needed.
type MenuItem = { key: string; image: number; onPress: () => void };

const BADGE_COUNT = 6;
const BADGE_SIZE_RATIO = 0.5; // of stage width — leaves real open water to drift through

// A light, airy balloon drift: the body's velocity eases toward a slowly-wandering ambient
// current (so paths curve organically instead of bouncing in straight billiard lines), with
// a lively — not water-logged — natural bounce off walls/each other.
const CURRENT_SPEED = 36; // px/s, ambient drift speed the body eases toward
const CURRENT_STEER_RATE = 1.2; // rad/s, how fast the ambient current direction wanders
const VELOCITY_RESPONSE = 3; // per second; higher = catches up to the current faster
const BOUNCE_RESTITUTION = 0.85; // lively bounce off walls/other badges
const WALL_OVERFLOW_RATIO = 0.8; // fraction of a badge's radius allowed to drift past the screen edge

type FloatingStageProps = { items: MenuItem[] };

function FloatingStage({ items }: FloatingStageProps) {
  const stageW = useSharedValue(0);
  const stageH = useSharedValue(0);
  const radius = useSharedValue(0);
  const initialized = useRef(false);

  const xs = useSharedValue<number[]>(new Array(BADGE_COUNT).fill(0));
  const ys = useSharedValue<number[]>(new Array(BADGE_COUNT).fill(0));
  const vxs = useSharedValue<number[]>(new Array(BADGE_COUNT).fill(0));
  const vys = useSharedValue<number[]>(new Array(BADGE_COUNT).fill(0));
  const currentAngles = useSharedValue<number[]>(new Array(BADGE_COUNT).fill(0));

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const size = width * BADGE_SIZE_RATIO;
      stageW.value = width;
      stageH.value = height;
      radius.value = size / 2;

      if (initialized.current || width <= 0 || height <= 0) return;
      initialized.current = true;

      const nx: number[] = [];
      const ny: number[] = [];
      const nvx: number[] = [];
      const nvy: number[] = [];
      const nAngle: number[] = [];
      for (let i = 0; i < BADGE_COUNT; i++) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        nx.push((col + 0.5) * (width / 2) - size / 2);
        ny.push((row + 0.5) * (height / 3) - size / 2);
        const angle = Math.random() * Math.PI * 2;
        nAngle.push(angle);
        nvx.push(Math.cos(angle) * CURRENT_SPEED);
        nvy.push(Math.sin(angle) * CURRENT_SPEED);
      }
      xs.value = nx;
      ys.value = ny;
      vxs.value = nvx;
      vys.value = nvy;
      currentAngles.value = nAngle;
    },
    [currentAngles, radius, stageH, stageW, vxs, vys, xs, ys],
  );

  useFrameCallback((frame) => {
    'worklet';
    if (radius.value <= 0) return;
    const dt = Math.min((frame.timeSincePreviousFrame ?? 16) / 1000, 0.05);
    const w = stageW.value;
    const h = stageH.value;
    const r = radius.value;
    // The wall sits a bit outside the visible stage, so a badge can drift far enough to
    // peek past the screen edge instead of always staying fully in view.
    const overflow = r * WALL_OVERFLOW_RATIO;
    const n = xs.value.length;

    const nx = xs.value.slice();
    const ny = ys.value.slice();
    const nvx = vxs.value.slice();
    const nvy = vys.value.slice();
    const nAngle = currentAngles.value.slice();

    for (let i = 0; i < n; i++) {
      // The ambient current slowly changes direction (a random walk), and the body's
      // velocity eases toward it — this is what gives the drifting, water-suspended feel
      // instead of a constant-speed bounce.
      nAngle[i] += (Math.random() - 0.5) * CURRENT_STEER_RATE * dt;
      const targetVx = Math.cos(nAngle[i]) * CURRENT_SPEED;
      const targetVy = Math.sin(nAngle[i]) * CURRENT_SPEED;
      const response = Math.min(VELOCITY_RESPONSE * dt, 1);
      nvx[i] += (targetVx - nvx[i]) * response;
      nvy[i] += (targetVy - nvy[i]) * response;

      let x = nx[i] + nvx[i] * dt;
      let y = ny[i] + nvy[i] * dt;
      let bounced = false;

      if (x < -overflow) {
        x = -overflow;
        nvx[i] = Math.abs(nvx[i]) * BOUNCE_RESTITUTION;
        bounced = true;
      } else if (x > w - 2 * r + overflow) {
        x = w - 2 * r + overflow;
        nvx[i] = -Math.abs(nvx[i]) * BOUNCE_RESTITUTION;
        bounced = true;
      }
      if (y < -overflow) {
        y = -overflow;
        nvy[i] = Math.abs(nvy[i]) * BOUNCE_RESTITUTION;
        bounced = true;
      } else if (y > h - 2 * r + overflow) {
        y = h - 2 * r + overflow;
        nvy[i] = -Math.abs(nvy[i]) * BOUNCE_RESTITUTION;
        bounced = true;
      }

      // Without this, the wandering "target current" (nAngle) would keep dragging the
      // velocity right back toward the wall it just bounced off of, so it'd sit there
      // vibrating in place instead of sailing away — re-point the target to match the
      // bounce so the body actually commits to its new direction.
      if (bounced) {
        nAngle[i] = Math.atan2(nvy[i], nvx[i]);
      }

      nx[i] = x;
      ny[i] = y;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const dx = nx[j] - nx[i];
        const dy = ny[j] - ny[i];
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;
        const minDist = 2 * r;
        if (dist >= minDist) continue;

        const ux = dx / dist;
        const uy = dy / dist;
        const overlap = (minDist - dist) / 2;
        nx[i] -= ux * overlap;
        ny[i] -= uy * overlap;
        nx[j] += ux * overlap;
        ny[j] += uy * overlap;

        const relVx = nvx[j] - nvx[i];
        const relVy = nvy[j] - nvy[i];
        const relN = relVx * ux + relVy * uy;
        if (relN < 0) {
          const impulse = -(1 + BOUNCE_RESTITUTION) * relN * 0.5;
          nvx[i] -= impulse * ux;
          nvy[i] -= impulse * uy;
          nvx[j] += impulse * ux;
          nvy[j] += impulse * uy;
          // Same fix as the wall bounce: point each body's target current at its new
          // velocity so it doesn't immediately get dragged back into the other badge.
          nAngle[i] = Math.atan2(nvy[i], nvx[i]);
          nAngle[j] = Math.atan2(nvy[j], nvx[j]);
        }
      }
    }

    xs.value = nx;
    ys.value = ny;
    vxs.value = nvx;
    vys.value = nvy;
    currentAngles.value = nAngle;
  }, true);

  return (
    <View style={styles.stage} onLayout={handleLayout}>
      {items.map((item, index) => (
        <FloatingBadge key={item.key} item={item} index={index} xs={xs} ys={ys} />
      ))}
    </View>
  );
}

type FloatingBadgeProps = {
  item: MenuItem;
  index: number;
  xs: ReturnType<typeof useSharedValue<number[]>>;
  ys: ReturnType<typeof useSharedValue<number[]>>;
};

function FloatingBadge({ item, index, xs, ys }: FloatingBadgeProps) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: xs.value[index] ?? 0 }, { translateY: ys.value[index] ?? 0 }],
  }));

  return (
    <Animated.View style={[styles.badgeWrap, animatedStyle]}>
      <Pressable onPress={item.onPress} style={styles.badgeTouchable}>
        {({ pressed }) => (
          <Image source={item.image} style={[styles.badge, pressed && styles.pressed]} contentFit="cover" />
        )}
      </Pressable>
    </Animated.View>
  );
}

export function TitleMenuScreen({
  onSelectMenuProposal,
  onSelectMealMemories,
  onSelectShoppingMemo,
  onSelectBudget,
  onSelectRecipeLab,
  onSelectPerokokoRoom,
}: TitleMenuScreenProps) {
  const items: MenuItem[] = [
    {
      key: 'menu-proposal',
      image: require('@/assets/images/menu/title-menu-badge-menu-proposal.jpg'),
      onPress: onSelectMenuProposal,
    },
    {
      key: 'meal-memories',
      image: require('@/assets/images/menu/title-menu-badge-meal-memories.jpg'),
      onPress: onSelectMealMemories,
    },
    {
      key: 'budget',
      image: require('@/assets/images/menu/title-menu-badge-budget.jpg'),
      onPress: onSelectBudget,
    },
    {
      key: 'recipe-lab',
      image: require('@/assets/images/menu/title-menu-badge-recipe-lab.jpg'),
      onPress: onSelectRecipeLab,
    },
    {
      key: 'perokoko-room',
      image: require('@/assets/images/menu/title-menu-badge-perokoko-room.jpg'),
      onPress: onSelectPerokokoRoom,
    },
    {
      key: 'shopping-list',
      image: require('@/assets/images/menu/title-menu-badge-shopping-list.jpg'),
      onPress: onSelectShoppingMemo,
    },
  ];

  return (
    <View style={styles.flex}>
      <DissolveBackground images={MENU_BACKGROUNDS} />
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <FloatingStage items={items} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  stage: {
    flex: 1,
    marginHorizontal: Spacing.four,
    marginVertical: Spacing.three,
  },
  badgeWrap: {
    position: 'absolute',
    width: `${BADGE_SIZE_RATIO * 100}%`,
    aspectRatio: 1,
  },
  badgeTouchable: {
    flex: 1,
  },
  badge: {
    width: '100%',
    height: '100%',
    borderRadius: 9999,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.7,
  },
});
