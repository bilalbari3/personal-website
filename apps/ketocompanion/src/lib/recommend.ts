import { RECIPES, recipeMacros } from '../data/recipes';
import type { Macros, MealSlot, Recipe, RecipeTag } from '../types';
import { fatPercent, fmt, type Remaining } from './macros';

export interface Recommendation {
  recipe: Recipe;
  macros: Macros;
  fits: boolean;
  score: number;
  reasons: string[];
}

/**
 * Rank recipes for the rest of today.
 * A recipe "fits your day" when its net carbs fit in what's left of today's limit and its protein
 * doesn't run far past today's target. Among fitting recipes we favour simple, affordable meals
 * and ones that help fill the remaining fat target.
 */
export function recommend(
  remaining: Remaining,
  opts: { slot?: MealSlot; tags?: RecipeTag[] } = {},
): Recommendation[] {
  const carbsLeft = Math.max(remaining.netCarbs, 0);
  const proteinLeft = Math.max(remaining.protein, 0);
  const fatLeft = Math.max(remaining.fat, 0);

  return RECIPES.filter((r) => !opts.slot || r.slots.includes(opts.slot))
    .filter((r) => !opts.tags?.length || opts.tags.every((t) => r.tags.includes(t)))
    .map((recipe) => {
      const m = recipeMacros(recipe);
      const fitsCarbs = m.netCarbs <= carbsLeft + 0.5;
      const fitsProtein = m.protein <= proteinLeft + 15;
      const fits = fitsCarbs && fitsProtein;

      let score = fits ? 100 : 0;
      // Use less of the remaining carb budget → higher score.
      score -= carbsLeft > 0 ? (m.netCarbs / carbsLeft) * 25 : m.netCarbs * 5;
      // Reward meals that help reach the fat target without overshooting much.
      if (fatLeft > 0) score += Math.min(m.fat / fatLeft, 1) * 15;
      if (fatPercent(m) >= 65) score += 6;
      // Simplicity and cost matter when energy or budget is limited.
      if (recipe.tags.includes('budget-friendly')) score += 8;
      if (recipe.tags.includes('under-15')) score += 6;
      if (recipe.tags.includes('no-cook')) score += 4;
      score -= Math.max(0, recipe.prepMinutes - 15) * 0.3;
      // Prefer recipes designed for the requested meal (e.g. a real snack for a snack).
      if (opts.slot && recipe.slots[0] === opts.slot) score += 10;

      const reasons: string[] = [];
      if (carbsLeft > 0) {
        const left = Math.max(carbsLeft - m.netCarbs, 0);
        reasons.push(
          fitsCarbs
            ? `${fmt(m.netCarbs, 1)} g net carbs, leaving about ${fmt(left)} g for the rest of today`
            : `${fmt(m.netCarbs, 1)} g net carbs, a bit more than the ${fmt(carbsLeft)} g left today`,
        );
      } else {
        reasons.push(`${fmt(m.netCarbs, 1)} g net carbs`);
      }
      if (recipe.prepMinutes <= 15) reasons.push(`Ready in about ${recipe.prepMinutes} min`);
      if (recipe.tags.includes('budget-friendly')) reasons.push('Budget-friendly');
      if (recipe.tags.includes('no-cook')) reasons.push('No cooking needed');

      return { recipe, macros: m, fits, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** Which slot comes next, skipping main meals already logged today. */
export function nextSlot(nowHHmm: string, loggedSlots: Set<MealSlot>): MealSlot {
  const h = Number(nowHHmm.slice(0, 2));
  const order: MealSlot[] = h < 11 ? ['breakfast', 'lunch', 'dinner'] : h < 15 ? ['lunch', 'dinner'] : h < 21 ? ['dinner'] : [];
  return order.find((s) => !loggedSlots.has(s)) ?? 'snack';
}
