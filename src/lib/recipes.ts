import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import { Course } from '@/constants/meal-flow';
import { ensureAnonSession, supabase } from '@/lib/supabase';

export type RecipeSource = 'ai' | 'user' | 'public';

export type SavedRecipe = {
  id: string;
  source: RecipeSource;
  title: string;
  photoUri?: string;
  bookContent: string;
  savedAt: string;
  course?: Course;
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
};

export type NewAiRecipeInput = {
  title: string;
  bookContent: string;
  course?: Course;
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
  created_at: string;
};

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
  });
  if (error) throw error;
}

export async function listPublicRecipes(): Promise<SavedRecipe[]> {
  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select('id, owner_id, title, book_content, photo_url, course, created_at')
    .order('created_at', { ascending: false })
    .limit(PUBLIC_FEED_LIMIT);
  if (error) {
    console.error('公開レシピの取得に失敗:', error);
    return [];
  }
  return (data ?? []).map(fromPublicRow);
}

export async function getPublicRecipe(id: string): Promise<SavedRecipe | undefined> {
  const { data, error } = await supabase
    .from(PUBLIC_TABLE)
    .select('id, owner_id, title, book_content, photo_url, course, created_at')
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
