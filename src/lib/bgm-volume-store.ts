import { useSyncExternalStore } from 'react';

import { getBgmVolume as readStoredBgmVolume, setBgmVolume as persistBgmVolume } from '@/lib/user-profile';

/**
 * BGM音量の倍率をアプリ全体で即座に共有するための小さなexternal store。設定画面（どこからでも
 * AppTabsの奥深くにある）で変更した瞬間に、ルートの_layout.tsxが鳴らしているBGMへ画面遷移を待たず
 * 反映させるためにReact Contextの代わりに使っている。
 */
type Listener = () => void;

let currentVolume = 1;
let hasStartedLoading = false;
const listeners = new Set<Listener>();

/** モジュール読み込み時点(Web版のSSRだと`window`が無いタイミング)ではなく、実際に画面が
 * useBgmVolume()を使い始めて購読された後まで読み込みを遅らせる。useSyncExternalStoreはsubscribe()を
 * マウント後のeffectから呼ぶので、これだけでSSR中の実行を避けられる。 */
function ensureLoaded(): void {
  if (hasStartedLoading) return;
  hasStartedLoading = true;
  readStoredBgmVolume().then((volume) => {
    currentVolume = volume;
    listeners.forEach((listener) => listener());
  });
}

function getSnapshot(): number {
  return currentVolume;
}

function subscribe(listener: Listener): () => void {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function setBgmVolume(volume: number): Promise<void> {
  currentVolume = volume;
  listeners.forEach((listener) => listener());
  await persistBgmVolume(volume);
}

export function useBgmVolume(): number {
  return useSyncExternalStore(subscribe, getSnapshot);
}
