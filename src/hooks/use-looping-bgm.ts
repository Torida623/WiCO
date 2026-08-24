import { AudioPlayer, AudioSource, useAudioPlayer } from 'expo-audio';
import { useEffect, useRef } from 'react';

const FADE_DURATION_MS = 1500;
const FADE_STEP_MS = 20;
const SILENCE_MS = 1000;

function fadeVolume(player: AudioPlayer, from: number, to: number, durationMs: number, onDone: () => void) {
  const steps = Math.max(1, Math.round(durationMs / FADE_STEP_MS));
  let step = 0;
  const timer = setInterval(() => {
    step += 1;
    const progress = Math.min(1, step / steps);
    player.volume = from + (to - from) * progress;
    if (progress >= 1) {
      clearInterval(timer);
      onDone();
    }
  }, FADE_STEP_MS);
  return timer;
}

function clearTimer(id: ReturnType<typeof setTimeout>) {
  clearTimeout(id);
  clearInterval(id);
}

// The player's own duration/didJustFinish reporting turned out unreliable for
// this file, so the loop is timed off a manually-tuned mark instead: play,
// fade out at fadeStartMs, sit in silence for a beat, then restart from
// the top at full volume. fadeStartMs must be tuned per-track (near the end
// of that track's actual duration) — every timer/interval this schedules,
// including the one inside fadeVolume, gets tracked so a re-run (stage
// change, fast refresh, etc.) can never leave a stale fade running underneath
// a new cycle.
export function useLoopingBgm(
  source: AudioSource,
  volume: number,
  playing: boolean,
  fadeStartMs: number,
  fadeInMs: number,
  /** Delay before the very first play() once `playing` flips true (e.g. letting a screen's own
   * entrance settle before its BGM starts). Loop restarts after that are never delayed. */
  startDelayMs = 0,
): AudioPlayer {
  const player = useAudioPlayer(source);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const loadSubscription = useRef<{ remove: () => void } | null>(null);

  useEffect(() => {
    player.volume = volume;
  }, [player, volume]);

  useEffect(() => {
    function clearTimers() {
      timers.current.forEach(clearTimer);
      timers.current = [];
      loadSubscription.current?.remove();
      loadSubscription.current = null;
    }

    // The player starts loading its source asynchronously the moment it's created (see
    // useAudioPlayer's own docs), so calling play() right away — as happens for the title BGM,
    // whose `playing` is true from the very first render — can silently no-op if the native side
    // hasn't finished loading yet. Every other track gets a natural head start (the user spends a
    // few seconds on earlier screens first), which is why only the title track showed this
    // intermittently. Wait for isLoaded before the very first play() of a cycle.
    function playWhenLoaded(onReady: () => void) {
      if (player.isLoaded) {
        onReady();
        return;
      }
      loadSubscription.current = player.addListener('playbackStatusUpdate', (status) => {
        if (!status.isLoaded) return;
        loadSubscription.current?.remove();
        loadSubscription.current = null;
        onReady();
      });
    }

    function scheduleCycle(fadeIn: boolean) {
      playWhenLoaded(() => {
        player.play();

        if (fadeIn && fadeInMs > 0) {
          player.volume = 0;
          timers.current.push(fadeVolume(player, 0, volume, fadeInMs, () => {}));
        } else {
          player.volume = volume;
        }

        const fadeStartTimer = setTimeout(() => {
          const fadeInterval = fadeVolume(player, volume, 0, FADE_DURATION_MS, () => {
            player.pause();
            const silenceTimer = setTimeout(async () => {
              try {
                await player.seekTo(0);
              } catch {
                // Ignore seek failures — still restart the cycle below so a
                // rejected seek can't silently kill the loop.
              } finally {
                scheduleCycle(false);
              }
            }, SILENCE_MS);
            timers.current.push(silenceTimer);
          });
          timers.current.push(fadeInterval);
        }, fadeStartMs);

        timers.current.push(fadeStartTimer);
      });
    }

    if (playing) {
      const startTimer = setTimeout(() => scheduleCycle(true), startDelayMs);
      timers.current.push(startTimer);
    } else {
      clearTimers();
      player.pause();
      // Reset to the top so the next time this track becomes active again
      // (e.g. returning to a tab after unmountOnBlur reset its screen) it
      // starts fresh instead of resuming mid-track.
      player.seekTo(0).catch(() => {});
    }

    return clearTimers;
  }, [player, volume, playing, fadeStartMs, fadeInMs, startDelayMs]);

  return player;
}
