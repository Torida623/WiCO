import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'wico:shopping-memo-checked';

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
