import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wico:shopping-memo-checked';
const CUSTOM_ITEMS_STORAGE_KEY = 'wico:shopping-memo-custom-items';
const INGREDIENTS_STORAGE_KEY = 'wico:shopping-memo-ingredients';

async function readCheckedMap(): Promise<Record<string, boolean>> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export async function getCheckedIngredients(): Promise<Record<string, boolean>> {
  return readCheckedMap();
}

export async function setIngredientChecked(name: string, checked: boolean): Promise<void> {
  const current = await readCheckedMap();
  current[name] = checked;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export async function clearCheckedItems(names: string[]): Promise<Record<string, boolean>> {
  const current = await readCheckedMap();
  names.forEach((name) => delete current[name]);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  return current;
}

async function readCustomItems(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_ITEMS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function listCustomItems(): Promise<string[]> {
  return readCustomItems();
}

export async function addCustomItem(name: string): Promise<string[]> {
  const trimmed = name.trim();
  const current = await readCustomItems();
  if (!trimmed || current.includes(trimmed)) return current;
  const next = [trimmed, ...current];
  await AsyncStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removeCustomItem(name: string): Promise<string[]> {
  return removeCustomItems([name]);
}

export async function removeCustomItems(names: string[]): Promise<string[]> {
  const current = await readCustomItems();
  const next = current.filter((item) => !names.includes(item));
  await AsyncStorage.setItem(CUSTOM_ITEMS_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export type MemoIngredient = { name: string; amounts: string[] };

async function readMemoIngredients(): Promise<MemoIngredient[]> {
  const raw = await AsyncStorage.getItem(INGREDIENTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMemoIngredients(items: MemoIngredient[]): Promise<void> {
  await AsyncStorage.setItem(INGREDIENTS_STORAGE_KEY, JSON.stringify(items));
}

export async function listMemoIngredients(): Promise<MemoIngredient[]> {
  return readMemoIngredients();
}

/** Merges `items` into the memo, combining amounts for names that are already present. Adding an
 * ingredient that's already in the memo with the same amount is a no-op, so re-adding from the same
 * decided menu twice is safe. */
export async function addIngredientsToMemo(items: MemoIngredient[]): Promise<MemoIngredient[]> {
  const current = await readMemoIngredients();
  const amountsByName = new Map(current.map((item) => [item.name, [...item.amounts]]));

  for (const { name, amounts } of items) {
    const key = name.trim();
    if (!key) continue;
    const existingAmounts = amountsByName.get(key) ?? [];
    amounts.forEach((amount) => {
      if (amount && !existingAmounts.includes(amount)) existingAmounts.push(amount);
    });
    amountsByName.set(key, existingAmounts);
  }

  const next = Array.from(amountsByName, ([name, amounts]) => ({ name, amounts }));
  await writeMemoIngredients(next);
  return next;
}

export async function removeMemoIngredients(names: string[]): Promise<MemoIngredient[]> {
  const current = await readMemoIngredients();
  const next = current.filter((item) => !names.includes(item.name));
  await writeMemoIngredients(next);
  return next;
}
