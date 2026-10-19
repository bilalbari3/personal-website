import type { AppState, ISODate } from '../types';
import { addDays, dateRange, parseISODate } from './dates';
import { readingStatus, sortReadings, type KetoneStatus } from './ketones';
import { dayTotals, mealsForDate } from './macros';

export interface DayAdherence {
  date: ISODate;
  beforeStart: boolean;
  isToday: boolean;
  loggedMeals: boolean;
  netCarbs: number;
  carbsInTarget: boolean | null; // null = no meals logged, so unknown
  hadReading: boolean;
  ketoneStatus: KetoneStatus | null; // from the last reading of the day
  ketonesInRange: boolean | null;
  /** 0–3 goals met; used for the heatmap. */
  score: number;
}

export function dayAdherence(state: AppState, date: ISODate, today: ISODate): DayAdherence {
  const { settings } = state;
  const beforeStart = date < settings.startDate;
  const loggedMeals = mealsForDate(state.meals, date).length > 0;
  const totals = dayTotals(state.meals, date);
  const carbsInTarget = loggedMeals ? totals.netCarbs <= settings.targets.netCarbsMax : null;

  const dayReadings = sortReadings(state.readings.filter((r) => r.date === date));
  const last = dayReadings[dayReadings.length - 1];
  const ketoneStatus = last ? (readingStatus(last, settings) ?? null) : null;
  const ketonesInRange = ketoneStatus ? ketoneStatus === 'in' : null;

  const score = (carbsInTarget ? 1 : 0) + (ketonesInRange ? 1 : 0) + (loggedMeals ? 1 : 0);
  return {
    date,
    beforeStart,
    isToday: date === today,
    loggedMeals,
    netCarbs: totals.netCarbs,
    carbsInTarget,
    hadReading: dayReadings.length > 0,
    ketoneStatus,
    ketonesInRange,
    score,
  };
}

export interface PeriodSummary {
  days: DayAdherence[]; // complete days counted (excludes today and pre-start days)
  carbDays: number;
  ketoneDays: number;
  readingDays: number;
  loggedDays: number;
  total: number;
}

/**
 * Summarise the `n` complete days before today (today is still in progress, so it isn't
 * counted). Days before the program start are excluded so new patients aren't penalised.
 */
export function summarizePeriod(state: AppState, n: number, today: ISODate): PeriodSummary {
  const end = addDays(today, -1);
  const start = addDays(today, -n);
  const days = dateRange(start, end)
    .map((d) => dayAdherence(state, d, today))
    .filter((d) => !d.beforeStart);
  return {
    days,
    carbDays: days.filter((d) => d.carbsInTarget).length,
    ketoneDays: days.filter((d) => d.ketonesInRange).length,
    readingDays: days.filter((d) => d.hadReading).length,
    loggedDays: days.filter((d) => d.loggedMeals).length,
    total: days.length,
  };
}

export function pct(n: number, d: number) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/** Gentle, strengths-first summary sentences. Never mentions streaks or "failing". */
export function supportiveMessages(p: PeriodSummary, label: string): string[] {
  if (p.total === 0) return ['Once you have a full day logged, your summary will appear here.'];
  const out: string[] = [];
  out.push(`You were in your ketone range ${p.ketoneDays} of ${p.total} days ${label}.`);
  out.push(`Your net carbs were within your target on ${p.carbDays} of ${p.total} days.`);
  out.push(`You logged meals on ${p.loggedDays} of ${p.total} days. That gives your care team a clear picture.`);

  const ratio = (p.ketoneDays + p.carbDays) / (2 * p.total);
  if (ratio >= 0.8) out.push('This was a steady stretch. Whatever routines are helping, they are working.');
  else if (ratio >= 0.5)
    out.push('Most days were on plan. Some ups and downs are expected, and each new day counts on its own.');
  else
    out.push(
      'This stretch had more ups and downs. That is part of the process, not a failure. Consider sharing what made it harder with your care team. They can help.',
    );
  return out;
}

/** Looks for a dip in ketone range and reports how quickly things came back. */
export function bounceBack(state: AppState, today: ISODate, lookback = 30): string | null {
  const days = dateRange(addDays(today, -lookback), addDays(today, -1))
    .map((d) => dayAdherence(state, d, today))
    .filter((d) => !d.beforeStart && d.ketonesInRange !== null);
  // Find the most recent run of out-of-range days that was followed by an in-range day,
  // ignoring the first week (ketones are still rising during induction).
  const startPlus7 = addDays(state.settings.startDate, 7);
  for (let i = days.length - 1; i > 0; i--) {
    if (days[i].ketonesInRange && days[i - 1].ketonesInRange === false && days[i - 1].date >= startPlus7) {
      let j = i - 1;
      while (j > 0 && days[j - 1].ketonesInRange === false) j--;
      const dipLen = i - j;
      const weekday = parseISODate(days[j].date).toLocaleDateString(undefined, { weekday: 'long' });
      return `After a dip that started ${weekday}, your ketones were back in range within ${dipLen} day${dipLen === 1 ? '' : 's'}. That is what getting back on track looks like.`;
    }
  }
  return null;
}
