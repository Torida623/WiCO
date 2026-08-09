import { ImageSource } from 'expo-image';

export type EntryPoint = 'breakfast' | 'lunch' | 'dinner' | 'aiRecommend' | 'fridge';

export type Course = '主食' | '主菜' | '副菜' | '汁物';

export const COURSE_OPTIONS: { value: Course; label: string }[] = [
  { value: '主食', label: '主食' },
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

export type Answers = {
  entryPoint?: EntryPoint;
  people?: string;
  cookingTime?: 'relaxed' | 'quick';
  mood?: string;
  allergy?: string;
  pinnedRecipe?: PinnedDish;
  ingredients?: string;
  shopping?: 'yes' | 'no';
  revisionRequest?: string;
};

export const ENTRY_POINT_OPTIONS: {
  value: EntryPoint;
  label: string;
  icon: ImageSource;
  iconPosition?: 'left' | 'right';
  newRow?: boolean;
}[] = [
  { value: 'breakfast', label: '朝ごはん', icon: require('@/assets/images/ui/entry-icons/rice-ball.png') },
  { value: 'lunch', label: '昼ごはん', icon: require('@/assets/images/ui/entry-icons/sun.png') },
  { value: 'dinner', label: '夜ごはん', icon: require('@/assets/images/ui/entry-icons/moon-stars.png') },
  {
    value: 'aiRecommend',
    label: 'ペロココのおすすめ',
    icon: require('@/assets/images/ui/entry-icons/chef-hat.png'),
    iconPosition: 'right',
    newRow: true,
  },
  {
    value: 'fridge',
    label: '冷蔵庫にある食材から考える',
    icon: require('@/assets/images/ui/entry-icons/carrot.png'),
    iconPosition: 'right',
    newRow: true,
  },
];

export const COOKING_TIME_OPTIONS: { value: 'relaxed' | 'quick'; label: string }[] = [
  { value: 'relaxed', label: '時間をかけてもOK' },
  { value: 'quick', label: 'ぱぱっと作りたい' },
];

export const SHOPPING_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: '行けます' },
  { value: 'no', label: '行けません' },
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

