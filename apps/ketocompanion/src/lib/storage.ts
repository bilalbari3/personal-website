import type { AppState } from '../types';
import { buildSeedState } from '../data/seed';
import { todayISO } from './dates';

// Everything is stored locally in this browser. Nothing is sent anywhere.
export const STORAGE_KEY = 'ketocompanion:v1';

/**
 * True when the state is seeded demo data built for a different day, so its story has drifted
 * into the past. Data saved before `demoAnchor` existed is recognised by its seeded ids.
 */
export function isStaleDemo(state: AppState, today: string): boolean {
  if (state.demoAnchor) return state.demoAnchor !== today;
  return [...state.meals, ...state.readings].some((x) => x.id.includes('-seed-'));
}

export function loadState(today = todayISO()): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1 && parsed.settings && !isStaleDemo(parsed, today)) return parsed;
    }
  } catch {
    // Private mode, blocked storage or corrupt JSON: fall back to fresh demo data.
  }
  return buildSeedState(today);
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable; the app keeps working in memory.
  }
}
