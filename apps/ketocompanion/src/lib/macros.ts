import type { ISODate, LoggedItem, Macros, MealLog, MealSlot, Settings } from '../types';

export const ZERO: Macros = { netCarbs: 0, fat: 0, protein: 0, calories: 0 };

export function addMacros(a: Macros, b: Macros, times = 1): Macros {
  return {
    netCarbs: a.netCarbs + b.netCarbs * times,
    fat: a.fat + b.fat * times,
    protein: a.protein + b.protein * times,
    calories: a.calories + b.calories * times,
  };
}

export function itemsTotal(items: LoggedItem[]): Macros {
  return items.reduce((acc, it) => addMacros(acc, it.perServing, it.servings), ZERO);
}

export function mealsForDate(meals: MealLog[], date: ISODate) {
  return meals.filter((m) => m.date === date).sort((a, b) => a.time.localeCompare(b.time));
}

export function dayTotals(meals: MealLog[], date: ISODate): Macros {
  return mealsForDate(meals, date).reduce((acc, m) => addMacros(acc, itemsTotal(m.items)), ZERO);
}

export interface Remaining {
  netCarbs: number;
  fat: number;
  protein: number;
}

export function remainingFor(totals: Macros, s: Settings): Remaining {
  return {
    netCarbs: s.targets.netCarbsMax - totals.netCarbs,
    fat: s.targets.fat - totals.fat,
    protein: s.targets.protein - totals.protein,
  };
}

/** Share of energy from fat, 0–100. */
export function fatPercent(m: Macros) {
  const kcal = m.fat * 9 + m.protein * 4 + m.netCarbs * 4;
  return kcal > 0 ? (m.fat * 9 * 100) / kcal : 0;
}

export function fmt(n: number, digits = 0) {
  const v = Math.round(n * 10 ** digits) / 10 ** digits;
  return v.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
};

export const SLOT_ORDER: MealSlot[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Default meal slot for the current time of day. */
export function slotForTime(hhmm: string): MealSlot {
  const h = Number(hhmm.slice(0, 2));
  if (h < 11) return 'breakfast';
  if (h < 15) return 'lunch';
  if (h < 21) return 'dinner';
  return 'snack';
}
