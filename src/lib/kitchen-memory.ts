import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchWithTimeout, getApiUrl } from '@/lib/api';
import { listMemoedMealsForKitchenMemory } from '@/lib/meal-records';

const STORAGE_KEY = 'wico:kitchen-memory';
const KITCHEN_MEMORY_TIMEOUT_MS = 20_000;

/** The household's current soft-tendency notes (e.g. "ピーマンは苦手っぽい"), or '' if nothing learned yet. */
export async function getKitchenMemory(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEY)) ?? '';
}

/**
 * Fire-and-forget: regenerates the household's kitchen memory from scratch, grounded entirely
 * in the actual meal-record memos (never in its own previously-generated summary) — so a
 * tendency can strengthen, weaken, get overturned, or drop off the record as real evidence
 * changes, instead of calcifying the moment it's first guessed. Never awaited by the meal-log
 * save flow and silently no-ops on failure — this is a background nicety, not something a
 * meal-log save should ever fail over.
 */
export async function refreshKitchenMemory(): Promise<void> {
  try {
    const evidence = await listMemoedMealsForKitchenMemory();
    if (evidence.length === 0) return;

    const res = await fetchWithTimeout(
      getApiUrl('/api/kitchen-memory'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidence }),
      },
      KITCHEN_MEMORY_TIMEOUT_MS,
    );
    if (!res.ok) return;
    const data = await res.json();
    if (typeof data.summary === 'string') {
      await AsyncStorage.setItem(STORAGE_KEY, data.summary);
    }
  } catch (error) {
    console.error('台所メモリーの更新に失敗:', error);
  }
}
