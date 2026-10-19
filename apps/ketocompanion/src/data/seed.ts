import type { AppState, KetoneReading, LoggedItem, Macros, MealLog, MealSlot, Note, Settings } from '../types';
import { addDays, parseISODate, todayISO } from '../lib/dates';
import { getFood } from './foods';
import { getRecipe, recipeMacros } from './recipes';

// ───────────────────────────────────────────────────────────────────────────
// Fictional demo patient "Alex", about three weeks into a prescribed ketogenic diet.
// The story is anchored to today's date so the demo always looks current:
//   days 1–5   induction, ketones rising
//   days 6–14  stable, in range
//   days 15–16 a weekend (family birthday) with higher carbs → ketone dip
//   days 17+   recovery, back in range within a few days
// ───────────────────────────────────────────────────────────────────────────

export function defaultSettings(startDate: string): Settings {
  return {
    patientName: 'Alex',
    startDate,
    targets: { netCarbsMax: 30, fat: 135, protein: 90 },
    ketoneMethod: 'blood',
    glucoseUnit: 'mg/dL',
    ranges: {
      blood: { min: 1.0, max: 3.0 },
      breath: { min: 5, max: 30 },
      urineMin: 'small',
    },
    bhbContactThreshold: 5.0,
    showHydrationReminder: true,
  };
}

/** Small deterministic PRNG so the seeded story is identical on every reset. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Part = [kind: 'f' | 'r', id: string, servings: number];

const food = (id: string, servings = 1): Part => ['f', id, servings];
const recipe = (id: string, servings = 1): Part => ['r', id, servings];

function toItem([kind, id, servings]: Part): LoggedItem {
  if (kind === 'f') {
    const f = getFood(id)!;
    return { kind: 'food', refId: f.id, name: f.name, serving: f.serving, servings, perServing: f.macros };
  }
  const r = getRecipe(id)!;
  return { kind: 'recipe', refId: r.id, name: r.name, serving: '1 serving', servings, perServing: recipeMacros(r) };
}

/** Off-plan foods that aren't in the keto database; logged honestly with estimated macros. */
function other(name: string, serving: string, m: Macros): LoggedItem {
  return { kind: 'food', refId: `other-${name.toLowerCase().replace(/\W+/g, '-')}`, name, serving, servings: 1, perServing: m };
}

const BREAKFASTS: Part[][] = [
  [recipe('scrambled-eggs-spinach'), food('coffee'), food('heavy-cream')],
  [recipe('bacon-eggs-avocado'), food('coffee'), food('heavy-cream')],
  [recipe('egg-muffins'), food('coffee'), food('heavy-cream')],
  [recipe('cream-cheese-pancakes'), food('raspberries', 0.5), food('coffee'), food('heavy-cream')],
  [recipe('chia-pudding'), food('tea')],
];
const LUNCHES: Part[][] = [
  [recipe('tuna-lettuce-wraps'), food('cherry-tomatoes')],
  [recipe('chicken-caesar')],
  [recipe('cobb-salad')],
  [recipe('egg-salad'), food('cucumber')],
  [recipe('snack-plate-lunch')],
  [recipe('sardine-avocado-plate')],
];
const DINNERS: Part[][] = [
  [recipe('sheet-pan-chicken')],
  [recipe('salmon-asparagus'), food('cauli-rice'), food('butter', 0.5)],
  [recipe('burger-bowl')],
  [recipe('steak-garlic-spinach'), food('mushrooms')],
  [recipe('egg-roll-bowl')],
  [recipe('pork-chops-green-beans')],
  [recipe('shirataki-meat-sauce'), food('mixed-greens'), food('vinaigrette')],
];
const SNACKS: Part[][] = [
  [food('macadamia')],
  [food('cheddar'), food('almonds', 0.5)],
  [recipe('celery-almond-butter')],
  [food('dark-chocolate')],
  [food('pecans'), food('raspberries', 0.5)],
  [recipe('broth-and-seeds')],
];

// Ketone story: morning fasting blood BHB (mmol/L) and glucose (mg/dL) by day index.
const BHB_STORY: Record<number, [number, number]> = {
  0: [0.2, 97],
  1: [0.4, 94],
  2: [0.6, 91],
  3: [0.9, 88],
  4: [1.2, 85],
  5: [1.4, 84],
  6: [1.8, 81],
  7: [1.6, 83],
  8: [2.1, 79],
  9: [1.9, 80],
  10: [2.3, 77],
  11: [1.7, 82],
  12: [2.0, 79],
  13: [2.2, 78],
  14: [1.8, 82], // Saturday morning, before the birthday dinner
  15: [0.6, 98], // Sunday: dip after higher-carb day
  16: [0.5, 96],
  17: [0.9, 90],
  18: [1.3, 86], // back in range
};

const NOTES: Record<number, string> = {
  1: 'Felt tired and a bit foggy this afternoon. Had some broth and an early night.',
  4: 'Energy is better today. Made egg muffins for the week.',
  8: 'Sleeping more soundly this week. Mood feels steadier.',
  14: 'Family birthday dinner. Had pasta and cake. Glad I went.',
  16: 'Back to my usual meals today. Feeling a little sluggish but okay.',
  19: 'Question for my care team: is it normal to feel more thirsty in the evenings?',
};

/** Most recent Saturday that is 5–11 days before `today` (so recovery is visible on any weekday). */
function anchorSaturday(today: string) {
  for (let back = 5; back <= 11; back++) {
    const d = addDays(today, -back);
    if (parseISODate(d).getDay() === 6) return d;
  }
  return addDays(today, -7);
}

export function buildSeedState(today = todayISO()): AppState {
  const rand = mulberry32(20240521);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const jitter = (base: number, spread: number) => base + (rand() * 2 - 1) * spread;
  const hhmm = (h: number, maxMin = 50) => `${String(h).padStart(2, '0')}:${String(Math.floor(rand() * maxMin)).padStart(2, '0')}`;

  const saturday = anchorSaturday(today);
  const startDate = addDays(saturday, -14); // Saturday is day 15
  const settings = defaultSettings(startDate);

  const meals: MealLog[] = [];
  const readings: KetoneReading[] = [];
  const notes: Note[] = [];
  let n = 0;
  const id = (p: string) => `${p}-seed-${++n}`;

  const addMeal = (date: string, slot: MealSlot, time: string, items: LoggedItem[]) =>
    meals.push({ id: id('meal'), date, slot, time, items });

  for (let idx = 0; ; idx++) {
    const date = addDays(startDate, idx);
    if (date > today) break;
    const isToday = date === today;

    // ── Meals ──
    if (isToday) {
      addMeal(date, 'breakfast', '07:45', BREAKFASTS[0].map(toItem));
    } else if (idx === 14) {
      // Saturday: family birthday
      addMeal(date, 'breakfast', '08:40', BREAKFASTS[1].map(toItem));
      addMeal(date, 'lunch', '12:30', LUNCHES[1].map(toItem));
      addMeal(date, 'dinner', '18:30', [
        other('Pasta with meat sauce', '1 cup', { netCarbs: 38, fat: 12, protein: 18, calories: 340 }),
        other('Garlic bread', '1 slice', { netCarbs: 18, fat: 8, protein: 4, calories: 165 }),
        other('Birthday cake', '1 slice', { netCarbs: 34, fat: 12, protein: 2, calories: 260 }),
      ]);
    } else if (idx === 15) {
      // Sunday: leftovers and pancakes
      addMeal(date, 'breakfast', '09:30', [
        other('Pancakes', '2 small', { netCarbs: 26, fat: 7, protein: 5, calories: 190 }),
        toItem(food('butter')),
        toItem(food('coffee')),
        toItem(food('heavy-cream')),
      ]);
      addMeal(date, 'lunch', '13:15', LUNCHES[3].map(toItem));
      addMeal(date, 'dinner', '18:45', [...DINNERS[2].map(toItem), other('Leftover birthday cake', 'small slice', { netCarbs: 20, fat: 7, protein: 1, calories: 150 })]);
    } else if (idx === 12) {
      // A busy day: only breakfast got logged (realistic gap in logging).
      addMeal(date, 'breakfast', hhmm(7), pick(BREAKFASTS).map(toItem));
    } else {
      addMeal(date, 'breakfast', hhmm(7), pick(BREAKFASTS).map(toItem));
      addMeal(date, 'lunch', hhmm(12), pick(LUNCHES).map(toItem));
      addMeal(date, 'dinner', hhmm(18), pick(DINNERS).map(toItem));
      if (rand() < 0.75) addMeal(date, 'snack', hhmm(15), pick(SNACKS).map(toItem));
      // Induction: still learning where the carbs are.
      if (idx <= 4) {
        const extras: Part[][] = [
          [food('pistachios', 2), food('blueberries')],
          [food('strawberries'), food('sunflower-seeds')],
          [food('greek-yogurt'), food('blueberries')],
          [food('pistachios')],
          [food('strawberries')],
        ];
        addMeal(date, 'snack', hhmm(20, 30), extras[idx].map(toItem));
      } else if (rand() < 0.5) {
        addMeal(date, 'snack', hhmm(20, 30), [toItem(pick([food('raspberries'), food('almonds'), food('cherry-tomatoes'), food('dark-chocolate')]))]);
      }
    }

    // ── Ketone readings (blood BHB, usually with glucose) ──
    if (idx === 9) continue; // a day without a reading (forgot the meter at work)
    const story = BHB_STORY[idx];
    const bhb = isToday ? 1.8 : story ? story[0] : Math.round(jitter(1.85, 0.4) * 10) / 10;
    const glucose = isToday ? 81 : story ? story[1] : Math.round(jitter(80, 4));
    readings.push({
      id: id('ket'),
      date,
      time: isToday ? '07:30' : hhmm(7, 25),
      method: 'blood',
      bhb,
      // A few readings without glucose, as happens in real life.
      glucoseMgDl: idx === 6 || idx === 11 ? undefined : glucose,
    });
    if (!isToday && idx >= 5 && idx !== 15 && idx !== 16 && rand() < 0.3) {
      readings.push({
        id: id('ket'),
        date,
        time: hhmm(19, 40),
        method: 'blood',
        bhb: Math.round((bhb + 0.2 + rand() * 0.4) * 10) / 10,
        glucoseMgDl: Math.round(jitter(84, 5)),
      });
    }
    if (idx === 14) {
      readings.push({ id: id('ket'), date, time: '21:40', method: 'blood', bhb: 1.1, glucoseMgDl: 108 });
    }
  }

  for (const [idx, text] of Object.entries(NOTES)) {
    const date = addDays(startDate, Number(idx));
    if (date <= today) notes.push({ id: id('note'), date, text });
  }

  return {
    version: 1,
    settings,
    meals,
    readings,
    notes,
    favorites: ['egg', 'avocado', 'macadamia', 'cheddar', 'chicken-thigh', 'coffee', 'heavy-cream'],
    customMeals: [
      {
        id: 'custom-seed-usual-breakfast',
        name: 'My usual breakfast',
        items: [
          { foodId: 'egg', servings: 3 },
          { foodId: 'butter', servings: 1 },
          { foodId: 'coffee', servings: 1 },
          { foodId: 'heavy-cream', servings: 1 },
        ],
      },
      {
        id: 'custom-seed-desk-snack',
        name: 'Desk snack',
        items: [
          { foodId: 'string-cheese', servings: 1 },
          { foodId: 'macadamia', servings: 0.5 },
        ],
      },
    ],
  };
}
