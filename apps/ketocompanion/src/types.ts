// ───────────────────────────────────────────────────────────────────────────
// KetoCompanion data model
// Everything lives in one AppState object persisted to localStorage.
// Dates are local calendar dates ("YYYY-MM-DD"); times are "HH:mm".
// ───────────────────────────────────────────────────────────────────────────

export type ISODate = string;
export type HHmm = string;

/** Macros for one serving. Net carbs = total carbs − fiber. */
export interface Macros {
  netCarbs: number; // g
  fat: number; // g
  protein: number; // g
  calories: number; // kcal (shown for reference only; never a target)
}

export type FoodCategory =
  | 'Protein'
  | 'Dairy & eggs'
  | 'Fats & oils'
  | 'Nuts & seeds'
  | 'Vegetables'
  | 'Fruit'
  | 'Drinks & extras';

export interface Food {
  id: string;
  name: string;
  category: FoodCategory;
  serving: string; // human description, e.g. "1 large egg"
  macros: Macros;
}

export type RecipeTag = 'vegetarian' | 'dairy-free' | 'budget-friendly' | 'under-15' | 'no-cook';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface RecipeIngredient {
  text: string; // what the patient reads: "3 large eggs"
  foodId?: string; // links to the food database so macros are computed, not guessed
  servings?: number; // number of food servings used across the whole recipe
}

export interface Recipe {
  id: string;
  name: string;
  summary: string;
  slots: MealSlot[];
  prepMinutes: number;
  serves: number; // recipe yield; macros are per serving
  tags: RecipeTag[];
  ingredients: RecipeIngredient[];
  steps: string[];
  tip?: string;
}

/** One line in a logged meal. Macros are copied at log time so history never changes. */
export interface LoggedItem {
  kind: 'food' | 'recipe';
  refId: string;
  name: string;
  serving: string;
  servings: number;
  perServing: Macros;
}

export interface MealLog {
  id: string;
  date: ISODate;
  time: HHmm;
  slot: MealSlot;
  items: LoggedItem[];
}

/** A saved combination of foods the patient can re-log with one tap. */
export interface CustomMeal {
  id: string;
  name: string;
  items: { foodId: string; servings: number }[];
}

export type KetoneMethod = 'blood' | 'breath' | 'urine';
export type UrineLevel = 'negative' | 'trace' | 'small' | 'moderate' | 'large';
export type GlucoseUnit = 'mg/dL' | 'mmol/L';

export interface KetoneReading {
  id: string;
  date: ISODate;
  time: HHmm;
  method: KetoneMethod;
  bhb?: number; // mmol/L (blood)
  glucoseMgDl?: number; // stored canonically in mg/dL; displayed in the preferred unit
  breathPpm?: number; // breath acetone
  urine?: UrineLevel;
}

export interface Note {
  id: string;
  date: ISODate;
  text: string;
}

export interface Range {
  min: number;
  max: number;
}

export interface Settings {
  patientName: string;
  startDate: ISODate;
  /** Daily targets set by the care team. */
  targets: {
    netCarbsMax: number; // g/day upper limit
    fat: number; // g/day
    protein: number; // g/day
  };
  ketoneMethod: KetoneMethod;
  glucoseUnit: GlucoseUnit;
  ranges: {
    blood: Range; // mmol/L BHB
    breath: Range; // ppm
    urineMin: UrineLevel; // lowest strip level counted as "in range"
  };
  /** BHB above this prompts a "contact your care team" message. */
  bhbContactThreshold: number;
  showHydrationReminder: boolean;
}

export interface AppState {
  version: 1;
  settings: Settings;
  meals: MealLog[];
  readings: KetoneReading[];
  notes: Note[];
  favorites: string[]; // food ids
  customMeals: CustomMeal[];
  /** Date the hydration reminder was last dismissed (it returns the next day). */
  hydrationDismissedOn?: ISODate;
}
