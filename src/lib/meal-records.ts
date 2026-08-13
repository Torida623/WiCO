import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { LinkedRecipeSnapshot } from '@/lib/recipes';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

// 三色食品群: energy = 黄(エネルギーになる食品), protein = 赤(血や肉をつくる食品),
// vegetable = 緑(体の調子を整える食品).
export type FoodGroupLevel = 'low' | 'slightlyLow' | 'adequate' | 'slightlyHigh' | 'high';

export type NutritionBalance = {
  energy: FoodGroupLevel;
  protein: FoodGroupLevel;
  vegetable: FoodGroupLevel;
  comment?: string;
};

export type MealRecord = {
  id: string;
  eatenAt: string;
  mealType?: MealType;
  photoUri: string;
  dishes: string[];
  memo?: string;
  nutritionBalance?: NutritionBalance;
  favorite: boolean;
  createdAt: string;
  /** 参考にしたレシピ — recipe content snapshotted from the decided menu this meal was cooked from
   * (if any), so it survives the menu's own 48h expiry. Empty when the meal wasn't recorded from a
   * decided menu (e.g. eating out, a quick photo with no dish plan behind it). */
  linkedRecipes?: LinkedRecipeSnapshot[];
  /** Titles from linkedRecipes that have already been sent to レシピ研究所 — lets the save checklist
   * on the memory's detail page remember its state across visits instead of resetting every time. */
  savedRecipeTitles?: string[];
};

export type NewMealRecordInput = {
  eatenAt: string;
  mealType?: MealType;
  photoUri: string;
  dishes: string[];
  memo?: string;
  nutritionBalance?: NutritionBalance;
  favorite?: boolean;
  linkedRecipes?: LinkedRecipeSnapshot[];
};

export type MealRecordPatch = Partial<Omit<MealRecord, 'id' | 'createdAt'>>;

export type MealRecordSearchQuery = {
  from?: string;
  to?: string;
  keyword?: string;
  favoriteOnly?: boolean;
};

export type WeeklyNutritionBalance = {
  energy: FoodGroupLevel;
  protein: FoodGroupLevel;
  vegetable: FoodGroupLevel;
  recordCount: number;
};

const FOOD_GROUP_LEVEL_ORDER: FoodGroupLevel[] = ['low', 'slightlyLow', 'adequate', 'slightlyHigh', 'high'];

function averageFoodGroupLevel(levels: FoodGroupLevel[]): FoodGroupLevel {
  const sum = levels.reduce((total, level) => total + FOOD_GROUP_LEVEL_ORDER.indexOf(level), 0);
  return FOOD_GROUP_LEVEL_ORDER[Math.round(sum / levels.length)];
}

/** Aggregates each food group's level across records into a single week-level score. Returns null if none of the records carry a nutrition balance yet. */
export function summarizeNutritionBalance(records: MealRecord[]): WeeklyNutritionBalance | null {
  const balances = records
    .map((record) => record.nutritionBalance)
    .filter((balance): balance is NutritionBalance => balance !== undefined);
  if (balances.length === 0) return null;

  return {
    energy: averageFoodGroupLevel(balances.map((balance) => balance.energy)),
    protein: averageFoodGroupLevel(balances.map((balance) => balance.protein)),
    vegetable: averageFoodGroupLevel(balances.map((balance) => balance.vegetable)),
    recordCount: balances.length,
  };
}

const FOOD_GROUP_LEVEL_LABEL: Record<FoodGroupLevel, string> = {
  low: '不足気味',
  slightlyLow: 'やや少なめ',
  adequate: '適量',
  slightlyHigh: 'やや多め',
  high: '多め',
};

const RECENT_MEAL_LOOKBACK_DAYS = 5;
const RECENT_MEAL_DISH_LIMIT = 8;

/**
 * Compact recent-history text for the menu-proposal prompt: recent dish names (so the AI can
 * avoid repeats) plus the current food-group balance (so it can lean toward what's been missing).
 * Returns '' when there's no history yet, so callers can skip it cleanly.
 */
export async function summarizeRecentMealsForPrompt(): Promise<string> {
  const from = new Date();
  from.setDate(from.getDate() - RECENT_MEAL_LOOKBACK_DAYS);
  const records = await searchMealRecords({ from: from.toISOString() });
  if (records.length === 0) return '';

  const recentDishes = [...new Set(records.flatMap((record) => record.dishes))].slice(0, RECENT_MEAL_DISH_LIMIT);
  const balance = summarizeNutritionBalance(records);

  const parts: string[] = [];
  if (recentDishes.length > 0) {
    parts.push(`直近${RECENT_MEAL_LOOKBACK_DAYS}日間に食べた料理: ${recentDishes.join('、')}`);
  }
  if (balance) {
    parts.push(
      `直近の栄養バランス: エネルギー系${FOOD_GROUP_LEVEL_LABEL[balance.energy]}・たんぱく質系${FOOD_GROUP_LEVEL_LABEL[balance.protein]}・野菜系${FOOD_GROUP_LEVEL_LABEL[balance.vegetable]}`,
    );
  }
  return parts.join('\n');
}

export type MemoedMealEvidence = { eatenAt: string; dishes: string[]; memo: string };

const KITCHEN_MEMORY_EVIDENCE_LOOKBACK_DAYS = 90;
const KITCHEN_MEMORY_EVIDENCE_LIMIT = 30;

/**
 * Chronological (oldest→newest) window of memoed meals, used as the *only* grounding evidence
 * when lib/kitchen-memory.ts regenerates the household's kitchen-memory summary — deliberately
 * raw records, not a prior summary, so each regeneration re-derives its conclusions from what
 * actually happened rather than trusting its own past inference.
 */
export async function listMemoedMealsForKitchenMemory(): Promise<MemoedMealEvidence[]> {
  const from = new Date();
  from.setDate(from.getDate() - KITCHEN_MEMORY_EVIDENCE_LOOKBACK_DAYS);
  const records = await searchMealRecords({ from: from.toISOString() });

  return records
    .filter((record): record is MealRecord & { memo: string } => Boolean(record.memo?.trim()))
    .slice(0, KITCHEN_MEMORY_EVIDENCE_LIMIT) // records are newest-first, so this keeps the most recent ones
    .reverse() // oldest -> newest, so the AI reads it as a timeline
    .map((record) => ({ eatenAt: record.eatenAt, dishes: record.dishes, memo: record.memo.trim() }));
}

const STORAGE_KEY = 'wico:meal-records';
function getPhotoDir(): Directory {
  return new Directory(Paths.document, 'meal-photos');
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<MealRecord[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as MealRecord[];
  } catch {
    return [];
  }
}

async function writeAll(records: MealRecord[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function sortByEatenAtDesc(records: MealRecord[]): MealRecord[] {
  return [...records].sort((a, b) => b.eatenAt.localeCompare(a.eatenAt));
}

export async function listMealRecords(): Promise<MealRecord[]> {
  return sortByEatenAtDesc(await readAll());
}

export async function getMealRecord(id: string): Promise<MealRecord | undefined> {
  return (await readAll()).find((record) => record.id === id);
}

export async function searchMealRecords(query: MealRecordSearchQuery): Promise<MealRecord[]> {
  const keyword = query.keyword?.trim().toLowerCase();

  const filtered = (await readAll()).filter((record) => {
    if (query.from && record.eatenAt < query.from) return false;
    if (query.to && record.eatenAt > query.to) return false;
    if (query.favoriteOnly && !record.favorite) return false;
    if (keyword) {
      const haystack = record.dishes.join(' ').toLowerCase();
      if (!haystack.includes(keyword)) return false;
    }
    return true;
  });

  return sortByEatenAtDesc(filtered);
}

function photoExtension(sourceUri: string): string {
  const match = sourceUri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * Copies a picker/camera asset (which may live in a temp cache location the OS
 * can clear at any time) into the app's own document directory so the record
 * keeps working regardless of what happens to the original.
 */
export async function importMealPhoto(sourceUri: string): Promise<string> {
  const photoDir = getPhotoDir();
  if (!photoDir.exists) {
    photoDir.create({ intermediates: true, idempotent: true });
  }
  const destination = new File(photoDir, `${generateId()}.${photoExtension(sourceUri)}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

async function deletePhotoIfExists(photoUri: string): Promise<void> {
  const file = new File(photoUri);
  if (file.exists) file.delete();
}

export async function saveMealRecord(input: NewMealRecordInput): Promise<MealRecord> {
  const record: MealRecord = {
    id: generateId(),
    eatenAt: input.eatenAt,
    mealType: input.mealType,
    photoUri: input.photoUri,
    dishes: input.dishes,
    memo: input.memo,
    nutritionBalance: input.nutritionBalance,
    favorite: input.favorite ?? false,
    createdAt: new Date().toISOString(),
    linkedRecipes: input.linkedRecipes,
  };

  const records = await readAll();
  records.push(record);
  await writeAll(records);
  return record;
}

export async function updateMealRecord(id: string, patch: MealRecordPatch): Promise<MealRecord> {
  const records = await readAll();
  const index = records.findIndex((record) => record.id === id);
  if (index === -1) throw new Error(`Meal record not found: ${id}`);

  const updated: MealRecord = { ...records[index], ...patch };
  records[index] = updated;
  await writeAll(records);
  return updated;
}

export async function deleteMealRecord(id: string): Promise<void> {
  const records = await readAll();
  const target = records.find((record) => record.id === id);
  await writeAll(records.filter((record) => record.id !== id));
  if (target) await deletePhotoIfExists(target.photoUri);
}
