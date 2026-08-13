import { ImageSource } from 'expo-image';

export type EntryPoint = 'breakfast' | 'lunch' | 'dinner' | 'aiRecommend' | 'fridge';

export type Course = '主食' | '主菜' | '副菜' | '汁物';

export const COURSE_OPTIONS: { value: Course; label: string }[] = [
  { value: '主食', label: 'ごはん・パン・麺' },
  { value: '主菜', label: '主菜' },
  { value: '副菜', label: '副菜' },
  { value: '汁物', label: '汁物' },
];

export type StepId =
  | 'entryPoint'
  | 'people'
  | 'cookingTime'
  | 'allergy'
  | 'mood'
  | 'ingredients'
  | 'shopping'
  | 'proposal'
  | 'final';

export type PinnedDish = {
  course: Course;
  title: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
};

/** Letters used to label 合わせ調味料 groups (調味料A, 調味料B, ...) — shared by the recipe-lab post
 * form and the AI-generated menu recipes so both use the same convention. */
export function seasoningLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

export type Answers = {
  entryPoint?: EntryPoint;
  people?: string;
  cookingTime?: 'relaxed' | 'quick';
  mood?: string;
  /** Registered items that are true allergens (from the official ALLERGENS list) — treated as an absolute
   * safety constraint by the AI, distinct from dislikedFoods which is just a preference. */
  allergens?: string;
  /** Disliked ingredients + one-off freeform exceptions from the allergy step — avoided on a best-effort
   * basis, not the hard safety constraint that allergens is. */
  dislikedFoods?: string;
  pinnedRecipe?: PinnedDish;
  ingredients?: string;
  shopping?: 'yes' | 'no';
  revisionRequest?: string;
  /** Recent-meal-history context (recent dishes + food-group balance) injected right before the initial proposal fetch — see summarizeRecentMealsForPrompt(). Not set by any chat step, so it never affects getNextStep(). */
  mealHistory?: string;
  /** Household's soft learned tendencies (disliked-seeming ingredients, seasoning preference, etc.) injected right before the initial proposal fetch — see lib/kitchen-memory.ts. Not set by any chat step, so it never affects getNextStep(). */
  kitchenMemory?: string;
};

export const ENTRY_POINT_OPTIONS: {
  value: EntryPoint;
  label: string;
  image: ImageSource;
  imageAspectRatio: number;
  imageScale: number;
}[] = [
  {
    value: 'breakfast',
    label: '朝ごはん',
    image: require('@/assets/images/ui/entry-buttons/entry-breakfast-button.png'),
    imageAspectRatio: 614 / 319,
    // Scaled well below the shared 72px base: with 5 illustrated options (vs. 2 for cooking
    // time/shopping), full-size badges stacked too tall and pushed into the fixed-position mascot.
    imageScale: 1.07,
  },
  {
    value: 'lunch',
    label: '昼ごはん',
    image: require('@/assets/images/ui/entry-buttons/entry-lunch-button.png'),
    imageAspectRatio: 581 / 319,
    imageScale: 1.07,
  },
  {
    value: 'dinner',
    label: '夜ごはん',
    image: require('@/assets/images/ui/entry-buttons/entry-dinner-button.png'),
    imageAspectRatio: 732 / 306,
    imageScale: 1.07,
  },
  {
    value: 'aiRecommend',
    label: 'ペロココのおすすめ',
    image: require('@/assets/images/ui/entry-buttons/entry-aiRecommend-button.png'),
    imageAspectRatio: 759 / 314,
    imageScale: 1.07,
  },
  {
    value: 'fridge',
    label: '冷蔵庫にある食材から考える',
    image: require('@/assets/images/ui/entry-buttons/entry-fridge-button.png'),
    imageAspectRatio: 755 / 338,
    imageScale: 1.07,
  },
];

export const COOKING_TIME_OPTIONS: {
  value: 'relaxed' | 'quick';
  label: string;
  image: ImageSource;
  imageAspectRatio: number;
  imageScale: number;
}[] = [
  {
    value: 'relaxed',
    label: '時間をかけてもOK',
    image: require('@/assets/images/ui/cooking-time-relaxed-button.png'),
    imageAspectRatio: 983 / 452,
    // The rising steam eats into the crop (badge is only ~75% of the canvas height), so this needs
    // a taller box than 'quick' for the badge itself to read as the same size.
    imageScale: 1.07,
  },
  {
    value: 'quick',
    label: 'ぱぱっと作りたい',
    image: require('@/assets/images/ui/cooking-time-quick-button.png'),
    imageAspectRatio: 958 / 407,
    imageScale: 0.94,
  },
];

export const SHOPPING_OPTIONS: { value: 'yes' | 'no'; label: string; image: ImageSource; imageAspectRatio: number }[] = [
  {
    value: 'yes',
    label: '行けます',
    image: require('@/assets/images/ui/shopping-available-button.png'),
    imageAspectRatio: 943 / 344,
  },
  {
    value: 'no',
    label: '行けません',
    image: require('@/assets/images/ui/shopping-unavailable-button.png'),
    imageAspectRatio: 942 / 345,
  },
];

export const GENRE_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: '和食', label: '和食' },
  { value: '洋食', label: '洋食' },
  { value: '中華', label: '中華' },
];

export const FORMAT_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: 'ごはん', label: 'ごはん' },
  { value: 'パン', label: 'パン' },
  { value: '麺・粉物', label: '麺・粉物' },
  { value: '鍋', label: '鍋' },
];

export const TASTE_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: 'あっさり', label: 'あっさり' },
  { value: '濃いめ', label: '濃いめ' },
  { value: 'ピリ辛', label: 'ピリ辛' },
  { value: '甘辛', label: '甘辛' },
  { value: '酸味', label: '酸味' },
];

export const TEMPERATURE_TAG_OPTIONS: { value: string; label: string }[] = [
  { value: '温', label: '温' },
  { value: '冷', label: '冷' },
];

/** Category color-coding for the recipe search tags, shared between the post form (recipe-lab/new.tsx)
 * and the list rows (recipe-lab/list.tsx) so a tag reads as the same category everywhere. */
export const GENRE_TAG_TINT = { light: '#F8E2DE', solid: '#C1584A' };
export const FORMAT_TAG_TINT = { light: '#F6EDD1', solid: '#B08328' };
export const TASTE_TAG_TINT = { light: '#E5EFDD', solid: '#5E8A42' };
export const TEMPERATURE_TAG_TINT = { light: '#E1ECF5', solid: '#3F6E97' };
/** Same tint pair shape as the four categories above, for the 料理の種類 (course) tag shown alongside
 * them on recipe-lab list rows and the detail screen. `solid` matches the app's orange accent. */
export const COURSE_TAG_TINT = { light: '#FBE2D1', solid: '#F0955B' };

export function getNextStep(current: StepId, answers: Answers): StepId {
  switch (current) {
    case 'entryPoint':
      return 'people';
    case 'people':
      return answers.entryPoint === 'breakfast' || answers.entryPoint === 'lunch' ? 'allergy' : 'cookingTime';
    case 'cookingTime':
      return 'allergy';
    case 'allergy':
      return 'mood';
    case 'mood':
      return 'ingredients';
    case 'ingredients':
      if (answers.ingredients && answers.ingredients.trim().length > 0) return 'proposal';
      if (answers.entryPoint === 'breakfast') return 'proposal';
      return 'shopping';
    case 'shopping':
      return 'proposal';
    case 'proposal':
      return answers.revisionRequest && answers.revisionRequest.trim().length > 0 ? 'proposal' : 'final';
    case 'final':
      return 'final';
  }
}

