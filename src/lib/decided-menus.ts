import AsyncStorage from '@react-native-async-storage/async-storage';

import { Course, EntryPoint, seasoningLabel } from '@/constants/meal-flow';
import { LinkedRecipeSnapshot } from '@/lib/recipes';

export type DecidedMenuIngredient = { name: string; amount: string };

export type DecidedSeasoningGroup = { items: DecidedMenuIngredient[] };

export type DecidedDish = {
  course: Course;
  title: string;
  basicIngredients: DecidedMenuIngredient[];
  seasoningGroups: DecidedSeasoningGroup[];
  steps: string[];
};

export type DecidedMenu = {
  id: string;
  entryPoint: EntryPoint;
  proposalText: string;
  recipeText: string;
  dishes: DecidedDish[];
  people?: string;
  decidedAt: string;
  expiresAt: string;
};

export type NewDecidedMenuInput = {
  entryPoint: EntryPoint;
  proposalText: string;
  recipeText: string;
  dishes: DecidedDish[];
  people?: string;
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
    dishes: input.dishes,
    people: input.people,
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

/** Merges ingredients across all of a menu's dishes, combining amounts for names that repeat across dishes. */
export function aggregateMenuIngredients(menu: DecidedMenu): AggregatedIngredient[] {
  const amountsByName = new Map<string, string[]>();

  const addIngredient = ({ name, amount }: DecidedMenuIngredient) => {
    const key = name.trim();
    if (!key) return;
    const amounts = amountsByName.get(key) ?? [];
    if (amount && !amounts.includes(amount)) amounts.push(amount);
    amountsByName.set(key, amounts);
  };

  for (const dish of menu.dishes ?? []) {
    (dish.basicIngredients ?? []).forEach(addIngredient);
    (dish.seasoningGroups ?? []).forEach((group) => group.items.forEach(addIngredient));
  }

  return Array.from(amountsByName, ([name, amounts]) => ({ name, amounts }));
}

const STEPS_MARKER = '【作り方】';

export function extractMainDish(proposalText: string): string {
  return proposalText.match(/・(?:主菜|メイン)：(.+)/)?.[1]?.trim() ?? '（レシピ）';
}

export function extractBookContent(text: string): string {
  const splitIndex = text.indexOf('【材料】');
  return splitIndex >= 0 ? text.slice(splitIndex) : text;
}

function stripServingsLabel(text: string): string {
  return text.replace(/^\([^)]*\)\s*/, '').trim();
}

export function splitBookContent(content: string): { ingredientsText: string; stepsText: string } {
  const stepsIndex = content.indexOf(STEPS_MARKER);
  if (stepsIndex < 0) {
    return { ingredientsText: stripServingsLabel(content.replace('【材料】', '').trim()), stepsText: '' };
  }
  return {
    ingredientsText: stripServingsLabel(content.slice(0, stepsIndex).replace('【材料】', '').trim()),
    stepsText: content.slice(stepsIndex + STEPS_MARKER.length).trim(),
  };
}

/** The AI (or a re-parsed pinned recipe) sometimes echoes the ingredient name back into `amount`
 * (e.g. name "クリームコーン缶" + amount "クリームコーン缶 1/2缶"), which would otherwise render as
 * "クリームコーン缶 クリームコーン缶 1/2缶". Strip that duplicate before display. */
function formatIngredientLine(name: string, amount: string): string {
  const trimmedName = name.trim();
  const trimmedAmount = amount.trim();
  const dedupedAmount =
    trimmedAmount.startsWith(trimmedName) && trimmedAmount.length > trimmedName.length
      ? trimmedAmount.slice(trimmedName.length).trim()
      : trimmedAmount;
  return `・${trimmedName} ${dedupedAmount}`;
}

export function buildDishIngredientsText(dish: DecidedDish): string {
  const blocks: string[] = [];
  const basicIngredients = dish.basicIngredients ?? [];
  const seasoningGroups = dish.seasoningGroups ?? [];
  if (basicIngredients.length) {
    blocks.push(basicIngredients.map((i) => formatIngredientLine(i.name, i.amount)).join('\n'));
  }
  seasoningGroups.forEach((group, index) => {
    if (!group.items.length) return;
    blocks.push(
      `〈調味料${seasoningLabel(index)}・合わせ調味料〉\n${group.items.map((i) => formatIngredientLine(i.name, i.amount)).join('\n')}`,
    );
  });
  return blocks.join('\n\n');
}

function buildDishBookContent(dish: DecidedDish, people?: string): string {
  const servingsLabel = people ? `(${people}人分)` : '(指定された人数分)';
  const lines = [`【材料】${servingsLabel}`, buildDishIngredientsText(dish), '', STEPS_MARKER];
  dish.steps.forEach((s, idx) => lines.push(`${idx + 1}. ${s}`));
  return lines.join('\n');
}

/** Builds the 「参考にしたレシピ」snapshot(s) handed to a meal record when recording it from a decided
 * menu — one entry per structured dish, or a single entry from the freeform proposal/recipe text when
 * the menu predates structured dishes. Content, not a reference, since the menu itself expires in 48h.
 * `dishIndices`, when given, limits structured menus to just those dishes — what actually got cooked
 * can drift from what got decided (a swapped-out 汁物, a skipped side), so 献立ノート lets the person
 * uncheck whichever dish didn't happen before handing off to the memory. */
export function buildLinkedRecipesFromMenu(menu: DecidedMenu, dishIndices?: number[]): LinkedRecipeSnapshot[] {
  if (menu.dishes && menu.dishes.length > 0) {
    const dishes = dishIndices ? dishIndices.map((index) => menu.dishes[index]).filter((d): d is DecidedDish => Boolean(d)) : menu.dishes;
    return dishes.map((dish) => ({
      title: dish.title,
      bookContent: buildDishBookContent(dish, menu.people),
      course: dish.course,
    }));
  }
  return [{ title: extractMainDish(menu.proposalText), bookContent: extractBookContent(menu.recipeText) }];
}

/** Priority order for picking a single representative dish out of a menu — used both to sort a
 * structured menu's dish list for display and to default 料理の思い出's title field to just one dish
 * (主菜 first) instead of every dish jammed into one field. */
export const COURSE_PRIORITY_ORDER: Course[] = ['主菜', '主食', '副菜', '汁物'];

/** Defaults 料理の思い出's title field to whichever linked recipe ranks highest in
 * COURSE_PRIORITY_ORDER (courseless entries — the single-recipe unstructured case — sort last but
 * there's only ever one of those anyway). '' when there's nothing linked yet. */
export function pickPrimaryLinkedRecipeTitle(recipes: LinkedRecipeSnapshot[]): string {
  if (recipes.length === 0) return '';
  const rank = (recipe: LinkedRecipeSnapshot) =>
    recipe.course ? COURSE_PRIORITY_ORDER.indexOf(recipe.course) : COURSE_PRIORITY_ORDER.length;
  return [...recipes].sort((a, b) => rank(a) - rank(b))[0].title;
}
