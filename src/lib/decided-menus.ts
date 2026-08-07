import AsyncStorage from '@react-native-async-storage/async-storage';

import { EntryPoint } from '@/constants/meal-flow';

export type DecidedMenuIngredient = { name: string; amount: string };

export type DecidedMenu = {
  id: string;
  entryPoint: EntryPoint;
  proposalText: string;
  recipeText: string;
  ingredients: DecidedMenuIngredient[];
  decidedAt: string;
  expiresAt: string;
};

export type NewDecidedMenuInput = {
  entryPoint: EntryPoint;
  proposalText: string;
  recipeText: string;
  ingredients: DecidedMenuIngredient[];
};

const STORAGE_KEY = 'wico:decided-menus';
const RETENTION_HOURS = 48;

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readAll(): Promise<DecidedMenu[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as DecidedMenu[];
  } catch {
    return [];
  }
}

async function writeAll(menus: DecidedMenu[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(menus));
}

function isExpired(menu: DecidedMenu, now: Date): boolean {
  return new Date(menu.expiresAt).getTime() <= now.getTime();
}

function sortByDecidedAtDesc(menus: DecidedMenu[]): DecidedMenu[] {
  return [...menus].sort((a, b) => b.decidedAt.localeCompare(a.decidedAt));
}

/** Drops menus past their 48-hour retention window and persists the shrunk list if anything was removed. */
async function purgeExpired(menus: DecidedMenu[]): Promise<DecidedMenu[]> {
  const now = new Date();
  const alive = menus.filter((menu) => !isExpired(menu, now));
  if (alive.length !== menus.length) await writeAll(alive);
  return alive;
}

export async function listDecidedMenus(): Promise<DecidedMenu[]> {
  return sortByDecidedAtDesc(await purgeExpired(await readAll()));
}

export async function getDecidedMenu(id: string): Promise<DecidedMenu | undefined> {
  const menus = await purgeExpired(await readAll());
  return menus.find((menu) => menu.id === id);
}

export async function saveDecidedMenu(input: NewDecidedMenuInput): Promise<DecidedMenu> {
  const decidedAt = new Date();
  const expiresAt = new Date(decidedAt.getTime() + RETENTION_HOURS * 60 * 60 * 1000);

  const menu: DecidedMenu = {
    id: generateId(),
    entryPoint: input.entryPoint,
    proposalText: input.proposalText,
    recipeText: input.recipeText,
    ingredients: input.ingredients,
    decidedAt: decidedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  const menus = await purgeExpired(await readAll());
  menus.push(menu);
  await writeAll(menus);
  return menu;
}

export async function deleteDecidedMenu(id: string): Promise<void> {
  const menus = await readAll();
  await writeAll(menus.filter((menu) => menu.id !== id));
}

export type AggregatedIngredient = { name: string; amounts: string[] };

/** Merges ingredients across all still-active decided menus, combining amounts for ingredients that appear more than once. */
export async function listAggregatedIngredients(): Promise<AggregatedIngredient[]> {
  const menus = await listDecidedMenus();
  const amountsByName = new Map<string, string[]>();

  for (const menu of menus) {
    for (const { name, amount } of menu.ingredients) {
      const key = name.trim();
      if (!key) continue;
      const amounts = amountsByName.get(key) ?? [];
      if (amount && !amounts.includes(amount)) amounts.push(amount);
      amountsByName.set(key, amounts);
    }
  }

  return Array.from(amountsByName, ([name, amounts]) => ({ name, amounts }));
}
