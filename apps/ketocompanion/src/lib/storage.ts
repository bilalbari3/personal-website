import type { AppState } from '../types';
import { buildSeedState } from '../data/seed';

// Everything is stored locally in this browser. Nothing is sent anywhere.
export const STORAGE_KEY = 'ketocompanion:v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AppState;
      if (parsed && parsed.version === 1 && parsed.settings) return parsed;
    }
  } catch {
    // Private mode, blocked storage or corrupt JSON: fall back to fresh demo data.
  }
  return buildSeedState();
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be unavailable; the app keeps working in memory.
  }
}
