import { useState } from 'react';
import { useStore } from '../state/AppState';
import { Chip, PageHeader, cx } from '../components/ui';
import { RecipeCard } from '../components/RecipeCard';
import { TAG_LABELS } from '../data/recipes';
import { dayTotals, fmt, remainingFor, SLOT_LABELS, SLOT_ORDER } from '../lib/macros';
import { nextSlot, recommend } from '../lib/recommend';
import { nowHHmm } from '../lib/dates';
import type { MealSlot, RecipeTag } from '../types';

const TAGS: RecipeTag[] = ['budget-friendly', 'under-15', 'no-cook', 'vegetarian', 'dairy-free'];

export function RecipesScreen() {
  const { state, today } = useStore();
  const [slot, setSlot] = useState<MealSlot | 'any'>(() =>
    nextSlot(nowHHmm(), new Set(state.meals.filter((m) => m.date === today).map((m) => m.slot))),
  );
  const [tags, setTags] = useState<RecipeTag[]>([]);
  const [fitsOnly, setFitsOnly] = useState(true);

  const remaining = remainingFor(dayTotals(state.meals, today), state.settings);
  const recs = recommend(remaining, { slot: slot === 'any' ? undefined : slot, tags });
  const fitting = recs.filter((r) => r.fits);
  const others = recs.filter((r) => !r.fits);
  const carbsLeft = Math.max(remaining.netCarbs, 0);

  const toggleTag = (t: RecipeTag) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  return (
    <div className="space-y-4">
      <PageHeader title="Meal ideas" subtitle="Simple, affordable keto meals. The ones that fit what's left of your day come first." />

      <div className="rounded-2xl bg-brand-50 p-4 text-brand-900">
        <p className="font-semibold">Left for today</p>
        <p className="mt-0.5 tabular-nums">
          {fmt(carbsLeft)} g net carbs · {fmt(Math.max(remaining.fat, 0))} g fat · {fmt(Math.max(remaining.protein, 0))} g protein
        </p>
        {carbsLeft <= 3 && (
          <p className="mt-1 text-sm">You've used most of today's carbs. The very low-carb options below can still work well.</p>
        )}
      </div>

      <div className="space-y-2">
        <p className="font-semibold">Meal</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          <Chip active={slot === 'any'} onClick={() => setSlot('any')}>
            Any
          </Chip>
          {SLOT_ORDER.map((s) => (
            <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
              {SLOT_LABELS[s]}
            </Chip>
          ))}
        </div>
        <p className="pt-1 font-semibold">Filters</p>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {TAGS.map((t) => (
            <Chip key={t} active={tags.includes(t)} onClick={() => toggleTag(t)}>
              {TAG_LABELS[t]}
            </Chip>
          ))}
        </div>
        <label className="flex min-h-[48px] cursor-pointer items-center gap-3 pt-1">
          <input
            type="checkbox"
            checked={fitsOnly}
            onChange={(e) => setFitsOnly(e.target.checked)}
            className="h-6 w-6 rounded border-stone-400 accent-brand-600"
          />
          <span className="font-medium">Only show meals that fit my day</span>
        </label>
      </div>

      <section aria-labelledby="fits-title">
        <h2 id="fits-title" className="mb-3 text-lg font-semibold">
          Fits your day <span className="font-normal text-ink-muted">({fitting.length})</span>
        </h2>
        {fitting.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {fitting.map((r) => (
              <RecipeCard key={r.recipe.id} rec={r} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-white p-4 text-ink-soft">
            No meals match all of these filters right now. Try removing a filter, or choose a lighter snack.
          </p>
        )}
      </section>

      {!fitsOnly && others.length > 0 && (
        <section aria-labelledby="other-title" className={cx('pt-2')}>
          <h2 id="other-title" className="mb-1 text-lg font-semibold">
            Other ideas for another day <span className="font-normal text-ink-muted">({others.length})</span>
          </h2>
          <p className="mb-3 text-ink-muted">These have more carbs or protein than you have left today.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {others.map((r) => (
              <RecipeCard key={r.recipe.id} rec={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
