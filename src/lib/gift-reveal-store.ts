import { useSyncExternalStore } from 'react';

import { CostumeId } from '@/lib/costumes';

/**
 * 「プレゼント!!」演出の呼び出し口。誕生日プレゼント（ルート layout から）・はじめての料理シリーズの
 * プレゼント（各画面のアクションから）など、色んな場所から呼ばれるので、[[bgm-volume-store]]と同じ
 * external store パターンでどこからでも announceGift() できるようにしている。
 */
type Listener = () => void;

let pendingGift: CostumeId | null = null;
const listeners = new Set<Listener>();

export function announceGift(costumeId: CostumeId): void {
  pendingGift = costumeId;
  listeners.forEach((listener) => listener());
}

export function clearGift(): void {
  pendingGift = null;
  listeners.forEach((listener) => listener());
}

function getSnapshot(): CostumeId | null {
  return pendingGift;
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePendingGift(): CostumeId | null {
  return useSyncExternalStore(subscribe, getSnapshot);
}
