import {
  COURSE_TAG_TINT,
  FORMAT_TAG_TINT,
  GENRE_TAG_TINT,
  TASTE_TAG_TINT,
  TEMPERATURE_TAG_TINT,
} from '@/constants/meal-flow';
import { SavedRecipe } from '@/lib/recipes';

type RecipeTagTint = { light: string; solid: string };

export type RecipeTagChip = { key: string; label: string; background: string; text: string };

function chipFromTint(key: string, label: string, tint: RecipeTagTint): RecipeTagChip {
  return { key, label, background: tint.light, text: tint.solid };
}

/** 料理の種類 (course) + 料理の特徴 tags (genre/format/taste/temperature), in the same color-coding as
 * the post form's TagChips (@/constants/meal-flow) — only tags actually set on the recipe are included.
 * Rendered as light fill + colored border + colored text (not the form's solid-fill "selected" look) —
 * a whole list of solid-filled chips read as too loud/dark once every recipe has them on all the time.
 * Shared between the list rows and the detail screen so a tag reads as the same category everywhere. */
export function buildRecipeTagChips(recipe: SavedRecipe): RecipeTagChip[] {
  const chips: RecipeTagChip[] = [];
  if (recipe.course) chips.push(chipFromTint('course', recipe.course, COURSE_TAG_TINT));
  if (recipe.genreTag) chips.push(chipFromTint('genre', recipe.genreTag, GENRE_TAG_TINT));
  if (recipe.formatTag) chips.push(chipFromTint('format', recipe.formatTag, FORMAT_TAG_TINT));
  if (recipe.tasteTag) chips.push(chipFromTint('taste', recipe.tasteTag, TASTE_TAG_TINT));
  if (recipe.temperatureTag) chips.push(chipFromTint('temperature', recipe.temperatureTag, TEMPERATURE_TAG_TINT));
  return chips;
}
