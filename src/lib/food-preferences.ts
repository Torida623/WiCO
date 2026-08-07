import AsyncStorage from '@react-native-async-storage/async-storage';

const DISLIKED_STORAGE_KEY = 'wico:disliked-ingredients';
const ALLERGY_STORAGE_KEY = 'wico:allergy-favorites';

export const DISLIKED_INGREDIENT_LIMIT = 5;

async function readList(key: string): Promise<string[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeList(key: string, list: string[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

export async function listDislikedIngredients(): Promise<string[]> {
  return readList(DISLIKED_STORAGE_KEY);
}

/** No-ops (returns the unchanged list) once `DISLIKED_INGREDIENT_LIMIT` is reached; callers should check the length before calling. */
export async function addDislikedIngredient(name: string): Promise<string[]> {
  const trimmed = name.trim();
  const current = await readList(DISLIKED_STORAGE_KEY);
  if (!trimmed || current.includes(trimmed) || current.length >= DISLIKED_INGREDIENT_LIMIT) return current;
  const next = [...current, trimmed];
  await writeList(DISLIKED_STORAGE_KEY, next);
  return next;
}

export async function removeDislikedIngredient(name: string): Promise<string[]> {
  const current = await readList(DISLIKED_STORAGE_KEY);
  const next = current.filter((item) => item !== name);
  await writeList(DISLIKED_STORAGE_KEY, next);
  return next;
}

export async function listAllergyFavorites(): Promise<string[]> {
  return readList(ALLERGY_STORAGE_KEY);
}

export async function setAllergyFavorite(id: string, isFavorite: boolean): Promise<string[]> {
  const current = await readList(ALLERGY_STORAGE_KEY);
  const next = isFavorite ? [...current, id] : current.filter((item) => item !== id);
  await writeList(ALLERGY_STORAGE_KEY, next);
  return next;
}
