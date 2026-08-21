import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { Course } from '@/constants/meal-flow';
import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { grantFirstCookingTrioGift } from '@/lib/first-cooking-gifts';
import { ensureAnonSession, getCurrentUserId, supabase } from '@/lib/supabase';

/** A not-yet-saved recipe candidate — the shape decided-menus hands off to a meal record's
 * 「参考にしたレシピ」snapshot, and what a meal record later hands to saveAiRecipe(). Deliberately a
 * plain content snapshot (not a reference by id) since the menu it came from expires in 48h. */
export type LinkedRecipeSnapshot = { title: string; bookContent: string; course?: Course };

export type RecipeTags = { genreTag: string | null; formatTag: string | null; tasteTag: string | null; temperatureTag: string | null };

const EMPTY_RECIPE_TAGS: RecipeTags = { genreTag: null, formatTag: null, tasteTag: null, temperatureTag: null };
const RECIPE_TAGS_FETCH_TIMEOUT_MS = 30_000;

/** Runs at save-to-lab time (not at menu-generation or meal-record time) since these tags are only
 * ever needed if the dish actually gets saved. Best-effort: a failure here shouldn't block the save. */
export async function fetchRecipeTags(title: string, bookContent: string): Promise<RecipeTags> {
  try {
    const res = await fetchWithTimeout(
      getApiUrl('/api/recipe-tags'),
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, bookContent }) },
      RECIPE_TAGS_FETCH_TIMEOUT_MS,
    );
    if (!res.ok) throw new Error('recipe-tags request failed');
    const data = await res.json();
    return {
      genreTag: data.genreTag ?? null,
      formatTag: data.formatTag ?? null,
      tasteTag: data.tasteTag ?? null,
      temperatureTag: data.temperatureTag ?? null,
    };
  } catch (error) {
    console.error('タグの生成に失敗:', error);
    return EMPTY_RECIPE_TAGS;
  }
}

export type RecipeSource = 'ai' | 'user' | 'public';

export type SavedRecipe = {
  id: string;
  source: RecipeSource;
  title: string;
  photoUri?: string;
  bookContent: string;
  savedAt: string;
  course?: Course;
  /** Today's-mood tags, same categories as the menu-planning flow (@/constants/meal-flow) — lets a recipe be matched against a mood later. */
  genreTag?: string | null;
  formatTag?: string | null;
  tasteTag?: string | null;
  temperatureTag?: string | null;
  /** Optional one-line description of the dish, shown on the detail screen only (not list rows). */
  summary?: string | null;
  /** Only ever set on source: 'user' recipes — whether this was published to the public feed. Used to keep
   * 保存したレシピ and 投稿したレシピ mutually exclusive: a published recipe only shows in the posted tab. */
  published?: boolean;
  /** Only set for source: 'public' — the Supabase auth.uid() that posted it, used to gate the delete link to the owner. */
  ownerId?: string;
};

export type NewUserRecipeInput = {
  title: string;
  photoUri?: string;
  ingredientsText: string;
  stepsText: string;
  publish: boolean;
  course?: Course;
  genreTag?: string | null;
  formatTag?: string | null;
  tasteTag?: string | null;
  temperatureTag?: string | null;
  summary?: string;
};

export type NewAiRecipeInput = {
  title: string;
  bookContent: string;
  course?: Course;
  genreTag?: string | null;
  formatTag?: string | null;
  tasteTag?: string | null;
  temperatureTag?: string | null;
};

const STORAGE_KEY = 'wico:recipes';

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getPhotoDir(): Directory {
  return new Directory(Paths.document, 'recipe-photos');
}

async function readAll(): Promise<SavedRecipe[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedRecipe[];
  } catch {
    return [];
  }
}

async function writeAll(recipes: SavedRecipe[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(recipes));
}

function sortBySavedAtDesc(recipes: SavedRecipe[]): SavedRecipe[] {
  return [...recipes].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function listRecipes(): Promise<SavedRecipe[]> {
  return sortBySavedAtDesc(await readAll());
}

/** 保存したレシピ tab: local recipes minus the ones already published, so a recipe only ever shows in
 * one of 保存したレシピ / 投稿したレシピ, never both. Cross-checks unflagged recipes against this
 * device's public posts (not just the local `published` flag) and backfills the flag when it finds a
 * match — needed because `published` didn't exist yet when older recipes were posted, so those would
 * otherwise show in both tabs forever. Other callers (e.g. the menu-chat recipe picker) should keep
 * using listRecipes() — this filter is specific to that tab's mutual-exclusivity rule. */
export async function listSavedRecipes(): Promise<SavedRecipe[]> {
  let recipes = await listRecipes();
  const unflagged = recipes.filter((recipe) => recipe.source === 'user' && !recipe.published);

  if (unflagged.length > 0) {
    const posted = await listMyPublicRecipes();
    const postedKeys = new Set(posted.map((p) => `${p.title} ${p.bookContent}`));
    const fixIds = new Set(
      unflagged.filter((recipe) => postedKeys.has(`${recipe.title} ${recipe.bookContent}`)).map((r) => r.id),
    );
    if (fixIds.size > 0) {
      recipes = recipes.map((recipe) => (fixIds.has(recipe.id) ? { ...recipe, published: true } : recipe));
      await writeAll(recipes);
    }
  }

  return recipes.filter((recipe) => !recipe.published);
}

export async function getRecipe(id: string): Promise<SavedRecipe | undefined> {
  return (await readAll()).find((recipe) => recipe.id === id);
}

function photoExtension(sourceUri: string): string {
  const match = sourceUri.match(/\.([a-zA-Z0-9]+)(\?.*)?$/);
  return match ? match[1].toLowerCase() : 'jpg';
}

/** Copies a picker asset into the app's own document directory, same pattern as meal-records.ts's importMealPhoto. */
async function importRecipePhoto(sourceUri: string): Promise<string> {
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

export async function saveUserRecipe(input: NewUserRecipeInput): Promise<SavedRecipe> {
  const photoUri = input.photoUri ? await importRecipePhoto(input.photoUri) : undefined;
  const bookContent = `【材料】\n${input.ingredientsText.trim()}\n\n【作り方】\n${input.stepsText.trim()}`;

  const recipe: SavedRecipe = {
    id: generateId(),
    source: 'user',
    title: input.title.trim() || '（レシピ名なし）',
    photoUri,
    bookContent,
    savedAt: new Date().toISOString(),
    course: input.course,
    genreTag: input.genreTag,
    formatTag: input.formatTag,
    tasteTag: input.tasteTag,
    temperatureTag: input.temperatureTag,
    summary: input.summary?.trim() || undefined,
    published: input.publish,
  };

  const recipes = await readAll();
  recipes.push(recipe);
  await writeAll(recipes);

  if (input.publish) {
    publishRecipe(recipe).catch((error) => console.error('レシピの公開に失敗:', error));
  }

  return recipe;
}

export async function saveAiRecipe(input: NewAiRecipeInput): Promise<SavedRecipe> {
  const recipe: SavedRecipe = {
    id: generateId(),
    source: 'ai',
    title: input.title,
    bookContent: input.bookContent,
    savedAt: new Date().toISOString(),
    course: input.course,
    genreTag: input.genreTag,
    formatTag: input.formatTag,
    tasteTag: input.tasteTag,
    temperatureTag: input.temperatureTag,
  };

  const recipes = await readAll();
  recipes.push(recipe);
  await writeAll(recipes);
  return recipe;
}

export async function deleteRecipe(id: string): Promise<void> {
  const recipes = await readAll();
  const target = recipes.find((recipe) => recipe.id === id);
  await writeAll(recipes.filter((recipe) => recipe.id !== id));
  if (target?.photoUri) await deletePhotoIfExists(target.photoUri);
}

const PUBLIC_TABLE = 'public_recipes';
const PHOTO_BUCKET = 'recipe-photos';
const PUBLIC_FEED_LIMIT = 50;

type PublicRecipeRow = {
  id: string;
  owner_id: string;
  title: string;
  book_content: string;
  photo_url: string | null;
  course: string | null;
  genre_tag: string | null;
  format_tag: string | null;
  taste_tag: string | null;
  temperature_tag: string | null;
  summary: string | null;
  created_at: string;
};

const PUBLIC_RECIPE_COLUMNS =
  'id, owner_id, title, book_content, photo_url, course, genre_tag, format_tag, taste_tag, temperature_tag, summary, created_at';

function fromPublicRow(row: PublicRecipeRow): SavedRecipe {
  return {
    id: row.id,
    source: 'public',
    ownerId: row.owner_id,
    title: row.title,
    photoUri: row.photo_url ?? undefined,
    bookContent: row.book_content,
    savedAt: row.created_at,
    course: (row.course as Course | null) ?? undefined,
    genreTag: row.genre_tag,
    formatTag: row.format_tag,
    tasteTag: row.taste_tag,
    temperatureTag: row.temperature_tag,
    summary: row.summary,
  };
}

async function uploadRecipePhoto(ownerId: string, recipeId: string, localPhotoUri: string): Promise<string> {
  const extension = photoExtension(localPhotoUri);
  const bytes = await new File(localPhotoUri).bytes();
  const path = `${ownerId}/${recipeId}.${extension}`;

  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, bytes, { contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`, upsert: true });
  if (error) throw error;

  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Fire-and-forget from saveUserRecipe: uploads the photo (if any) then inserts the public_recipes row. Failure here never undoes the local save. */
export async function publishRecipe(recipe: SavedRecipe): Promise<void> {
  const ownerId = await ensureAnonSession();
  const photoUrl = recipe.photoUri ? await uploadRecipePhoto(ownerId, recipe.id, recipe.photoUri) : null;

  const { error } = await supabase.from(PUBLIC_TABLE).insert({
    owner_id: ownerId,
    title: recipe.title,
    book_content: recipe.bookContent,
    photo_url: photoUrl,
    course: recipe.course ?? null,
    genre_tag: recipe.genreTag ?? null,
    format_tag: recipe.formatTag ?? null,
    taste_tag: recipe.tasteTag ?? null,
    temperature_tag: recipe.temperatureTag ?? null,
    summary: recipe.summary ?? null,
  });
  if (error) throw error;
  grantFirstCookingTrioGift('recipe-post').catch((giftError) => console.error(giftError));
}

export async function listPublicRecipes(): Promise<SavedRecipe[]> {
  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select(PUBLIC_RECIPE_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(PUBLIC_FEED_LIMIT);
  if (error) {
    console.error('公開レシピの取得に失敗:', error);
    return [];
  }
  return (data ?? []).map(fromPublicRow);
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Shared by every public-feed view that shouldn't show the current device's own posts (those
 * live under 投稿したレシピ instead) — おすすめレシピ and the search panel both need this, so a
 * fix to one doesn't silently miss the other. Read-only, so it must not create a new anon session. */
async function excludeOwnRecipes(recipes: SavedRecipe[]): Promise<SavedRecipe[]> {
  const ownerId = await getCurrentUserId();
  return ownerId ? recipes.filter((recipe) => recipe.ownerId !== ownerId) : recipes;
}

/** おすすめレシピ tab: the public feed minus this device's own posts, shuffled for discovery. */
export async function listRecommendedRecipes(): Promise<SavedRecipe[]> {
  return shuffle(await excludeOwnRecipes(await listPublicRecipes()));
}

/** 検索パネル向け: 公開フィードから自分の投稿を除いたもの。検索は並び順が毎回変わると使いにくいのでシャッフルしない。 */
export async function listSearchableRecipes(): Promise<SavedRecipe[]> {
  return excludeOwnRecipes(await listPublicRecipes());
}

/** 投稿したレシピ tab: only the public recipes owned by this device's anon session. Read-only, so it must not create a new anon session — a device that has never posted just gets an empty list. */
export async function listMyPublicRecipes(): Promise<SavedRecipe[]> {
  const ownerId = await getCurrentUserId();
  if (!ownerId) return [];

  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select(PUBLIC_RECIPE_COLUMNS)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });
  if (error) {
    console.error('投稿したレシピの取得に失敗:', error);
    return [];
  }
  return (data ?? []).map(fromPublicRow);
}

export async function getPublicRecipe(id: string): Promise<SavedRecipe | undefined> {
  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select(PUBLIC_RECIPE_COLUMNS)
    .eq('id', id)
    .maybeSingle();
  if (error || !data) return undefined;
  return fromPublicRow(data);
}

function photoPathFromPublicUrl(photoUrl: string): string | null {
  const marker = `/${PHOTO_BUCKET}/`;
  const index = photoUrl.indexOf(marker);
  return index >= 0 ? photoUrl.slice(index + marker.length) : null;
}

export async function deletePublicRecipe(id: string, photoUrl?: string): Promise<void> {
  const { error } = await supabase.from(PUBLIC_TABLE).delete().eq('id', id);
  if (error) throw error;

  const photoPath = photoUrl ? photoPathFromPublicUrl(photoUrl) : null;
  if (photoPath) await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
}
