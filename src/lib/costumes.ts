import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wico:equipped-costume';

const DEFAULT_NEUTRAL_DAY = require('@/assets/images/mascot/perokoko-neutral.png');
const DEFAULT_NEUTRAL_NIGHT = require('@/assets/images/mascot/perokoko-neutral-night.png');

export type CostumeId = 'default' | (typeof COSTUMES)[number]['id'];

export type CostumeTier = 'normal' | 'premium';

export type CostumeDef = {
  id: string;
  label: string;
  tier: CostumeTier;
  image: number;
  /**
   * True when the art bakes in its own scene (not just a transparent character cutout) — e.g.
   * the premium 初回プレゼント skin, drawn as a full kitchen vignette. Those only look right in
   * large display slots (ペロココの部屋 / 献立ノート's footer mascot); small ones (the chat
   * avatar icon) should fall back to the default look rather than cramming a whole scene into
   * a 36px icon — see [[getMascotNeutralImage]].
   */
  hasOwnBackground: boolean;
};

export const COSTUMES = [
  {
    id: 'first-cooking-apron',
    label: 'はじめての料理（エプロン）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-first-cooking-apron.png'),
    hasOwnBackground: false,
  },
  {
    id: 'first-cooking-whisk',
    label: 'はじめての料理（あわ立て器）',
    tier: 'normal',
    image: require('@/assets/images/mascot/costume-first-cooking-whisk.png'),
    hasOwnBackground: false,
  },
  {
    id: 'first-cooking-chef-premium',
    label: 'はじめての料理（シェフコート）',
    tier: 'premium',
    image: require('@/assets/images/mascot/costume-first-cooking-premium.png'),
    hasOwnBackground: true,
  },
  {
    id: 'first-cooking-plate-premium',
    label: 'はじめての料理（お子様プレート）',
    tier: 'premium',
    image: require('@/assets/images/mascot/costume-first-cooking-plate-premium.png'),
    hasOwnBackground: true,
  },
] as const satisfies readonly CostumeDef[];

export function findCostume(id: CostumeId): CostumeDef | undefined {
  return COSTUMES.find((costume) => costume.id === id);
}

export async function getEquippedCostume(): Promise<CostumeId> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return 'default';
  return findCostume(raw as CostumeId) ? (raw as CostumeId) : 'default';
}

export async function setEquippedCostume(id: CostumeId): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, id);
}

/**
 * Resolves which "neutral pose" mascot image to show for the given equipped costume. Pass
 * `allowBackground: false` for small/icon-sized display slots so a `hasOwnBackground` costume
 * falls back to the plain default look instead of squeezing a whole scene into a tiny icon.
 */
export function getMascotNeutralImage(
  costumeId: CostumeId,
  isDay: boolean,
  options?: { allowBackground?: boolean },
): number {
  const defaultImage = isDay ? DEFAULT_NEUTRAL_DAY : DEFAULT_NEUTRAL_NIGHT;
  if (costumeId === 'default') return defaultImage;

  const costume = findCostume(costumeId);
  if (!costume) return defaultImage;
  if (costume.hasOwnBackground && options?.allowBackground === false) return defaultImage;
  return costume.image;
}
