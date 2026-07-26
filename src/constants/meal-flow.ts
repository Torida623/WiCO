export type EntryPoint = 'breakfast' | 'lunch' | 'dinner' | 'aiRecommend' | 'fridge';

export type StepId =
  | 'entryPoint'
  | 'people'
  | 'cookingTime'
  | 'moodAndAllergy'
  | 'ingredients'
  | 'shopping'
  | 'proposal'
  | 'final';

export type Answers = {
  entryPoint?: EntryPoint;
  people?: string;
  cookingTime?: 'relaxed' | 'quick';
  mood?: string;
  allergy?: string;
  ingredients?: string;
  shopping?: 'yes' | 'no';
  revisionRequest?: string;
};

export const ENTRY_POINT_OPTIONS: { value: EntryPoint; label: string }[] = [
  { value: 'breakfast', label: '朝ごはん' },
  { value: 'lunch', label: '昼ごはん' },
  { value: 'dinner', label: '夜ごはん' },
  { value: 'aiRecommend', label: 'ウィコッコのおすすめ' },
  { value: 'fridge', label: '冷蔵庫にある食材から考える' },
];

export const COOKING_TIME_OPTIONS: { value: 'relaxed' | 'quick'; label: string }[] = [
  { value: 'relaxed', label: '時間をかけてもOK' },
  { value: 'quick', label: 'ぱぱっと作りたい' },
];

export const SHOPPING_OPTIONS: { value: 'yes' | 'no'; label: string }[] = [
  { value: 'yes', label: '行けます' },
  { value: 'no', label: '行けません' },
];

export function getNextStep(current: StepId, answers: Answers): StepId {
  switch (current) {
    case 'entryPoint':
      return 'people';
    case 'people':
      return answers.entryPoint === 'breakfast' || answers.entryPoint === 'lunch'
        ? 'moodAndAllergy'
        : 'cookingTime';
    case 'cookingTime':
      return 'moodAndAllergy';
    case 'moodAndAllergy':
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

