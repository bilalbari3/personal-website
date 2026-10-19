import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AppState, CustomMeal, KetoneReading, MealLog, Note, Settings } from '../types';
import { loadState, saveState } from '../lib/storage';
import { buildSeedState } from '../data/seed';
import { todayISO } from '../lib/dates';

let counter = 0;
export const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(++counter).toString(36)}`;

interface Store {
  state: AppState;
  today: string;
  addMeal(meal: Omit<MealLog, 'id'>): void;
  deleteMeal(id: string): void;
  addReading(r: Omit<KetoneReading, 'id'>): KetoneReading;
  deleteReading(id: string): void;
  addNote(n: Omit<Note, 'id'>): void;
  deleteNote(id: string): void;
  toggleFavorite(foodId: string): void;
  saveCustomMeal(m: Omit<CustomMeal, 'id'>): void;
  deleteCustomMeal(id: string): void;
  updateSettings(patch: Partial<Settings>): void;
  dismissHydration(): void;
  resetDemo(): void;
  clearAll(): void;
}

const Ctx = createContext<Store | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(loadState);
  const [today, setToday] = useState(todayISO);

  useEffect(() => saveState(state), [state]);

  // Keep "today" correct if the app is left open past midnight.
  useEffect(() => {
    const t = setInterval(() => setToday(todayISO()), 60_000);
    return () => clearInterval(t);
  }, []);

  const update = useCallback((fn: (s: AppState) => AppState) => setState((s) => fn(s)), []);

  const store = useMemo<Store>(
    () => ({
      state,
      today,
      addMeal: (meal) => update((s) => ({ ...s, meals: [...s.meals, { ...meal, id: newId('meal') }] })),
      deleteMeal: (id) => update((s) => ({ ...s, meals: s.meals.filter((m) => m.id !== id) })),
      addReading: (r) => {
        const reading = { ...r, id: newId('ket') };
        update((s) => ({ ...s, readings: [...s.readings, reading] }));
        return reading;
      },
      deleteReading: (id) => update((s) => ({ ...s, readings: s.readings.filter((r) => r.id !== id) })),
      addNote: (n) => update((s) => ({ ...s, notes: [...s.notes, { ...n, id: newId('note') }] })),
      deleteNote: (id) => update((s) => ({ ...s, notes: s.notes.filter((n) => n.id !== id) })),
      toggleFavorite: (foodId) =>
        update((s) => ({
          ...s,
          favorites: s.favorites.includes(foodId) ? s.favorites.filter((f) => f !== foodId) : [...s.favorites, foodId],
        })),
      saveCustomMeal: (m) => update((s) => ({ ...s, customMeals: [...s.customMeals, { ...m, id: newId('custom') }] })),
      deleteCustomMeal: (id) => update((s) => ({ ...s, customMeals: s.customMeals.filter((c) => c.id !== id) })),
      updateSettings: (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      dismissHydration: () => update((s) => ({ ...s, hydrationDismissedOn: todayISO() })),
      resetDemo: () => setState(buildSeedState()),
      clearAll: () =>
        update((s) => ({
          version: 1,
          settings: { ...s.settings, patientName: 'Alex', startDate: todayISO() },
          meals: [],
          readings: [],
          notes: [],
          favorites: [],
          customMeals: [],
        })),
    }),
    [state, today, update],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside AppStateProvider');
  return s;
}
