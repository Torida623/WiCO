import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

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
};

export type NewMealRecordInput = {
  eatenAt: string;
  mealType?: MealType;
  photoUri: string;
  dishes: string[];
  memo?: string;
  nutritionBalance?: NutritionBalance;
  favorite?: boolean;
};

export type MealRecordPatch = Partial<Omit<MealRecord, 'id' | 'createdAt'>>;

export type MealRecordSearchQuery = {
  from?: string;
  to?: string;
  keyword?: string;
  favoriteOnly?: boolean;
};

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
      const haystack = [...record.dishes, record.memo ?? ''].join(' ').toLowerCase();
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
