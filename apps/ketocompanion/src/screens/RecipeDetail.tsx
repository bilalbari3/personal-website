import { useState } from 'react';
import { useStore } from '../state/AppState';
import { getRecipe, recipeMacros, TAG_LABELS } from '../data/recipes';
import { Button, Card, PageHeader, Segmented, SectionTitle, Stepper, Tag } from '../components/ui';
import { MacroBar } from '../components/MacroBar';
import { FitsBadge, MacroLine } from '../components/RecipeCard';
import { ClockIcon, InfoIcon } from '../components/Icons';
import { dayTotals, remainingFor, SLOT_LABELS, slotForTime } from '../lib/macros';
import { recommend } from '../lib/recommend';
import { nowHHmm } from '../lib/dates';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';
import type { MealSlot } from '../types';

export function RecipeDetailScreen({ id }: { id: string }) {
  const store = useStore();
  const { state, today } = store;
  const toast = useToast();
  const recipe = getRecipe(id);
  const defaultSlot = recipe?.slots.includes(slotForTime(nowHHmm())) ? slotForTime(nowHHmm()) : recipe?.slots[0] ?? 'snack';
  const [slot, setSlot] = useState<MealSlot>(defaultSlot);
  const [servings, setServings] = useState(1);

  if (!recipe) {
    return (
      <div>
        <PageHeader title="Recipe not found" back />
        <a href="#/recipes">Back to meal ideas</a>
      </div>
    );
  }

  const m = recipeMacros(recipe);
  const totals = dayTotals(state.meals, today);
  const remaining = remainingFor(totals, state.settings);
  const rec = recommend(remaining).find((r) => r.recipe.id === recipe.id);
  const { targets } = state.settings;

  const log = () => {
    store.addMeal({
      date: today,
      time: nowHHmm(),
      slot,
      items: [{ kind: 'recipe', refId: recipe.id, name: recipe.name, serving: '1 serving', servings, perServing: m }],
    });
    toast(`${SLOT_LABELS[slot]} logged`);
    navigate('today');
  };

  return (
    <div className="space-y-5">
      <PageHeader title={recipe.name} subtitle={recipe.summary} back />

      <div className="flex flex-wrap items-center gap-2">
        {rec?.fits && <FitsBadge />}
        <span className="inline-flex items-center gap-1 text-ink-soft">
          <ClockIcon size={18} /> {recipe.prepMinutes} min
        </span>
        <span className="text-ink-soft">· Serves {recipe.serves}</span>
        {recipe.tags.map((t) => (
          <Tag key={t}>{TAG_LABELS[t]}</Tag>
        ))}
      </div>

      <Card>
        <SectionTitle>Per serving</SectionTitle>
        <MacroLine m={m} />
        <p className="mt-1 text-sm text-ink-muted">About {m.calories} kcal</p>
        {rec && <p className="mt-2 text-ink-soft">{rec.reasons[0]}.</p>}
      </Card>

      <Card aria-labelledby="ing-title">
        <SectionTitle id="ing-title">Ingredients</SectionTitle>
        <ul className="space-y-2">
          {recipe.ingredients.map((ing) => (
            <li key={ing.text} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
              {ing.text}
            </li>
          ))}
        </ul>
      </Card>

      <Card aria-labelledby="steps-title">
        <SectionTitle id="steps-title">Steps</SectionTitle>
        <ol className="space-y-3">
          {recipe.steps.map((s, i) => (
            <li key={s} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                {i + 1}
              </span>
              <span className="pt-0.5">{s}</span>
            </li>
          ))}
        </ol>
        {recipe.tip && (
          <p className="mt-4 flex gap-2 rounded-xl bg-stone-100 p-3 text-ink-soft">
            <InfoIcon size={20} className="mt-0.5 shrink-0" /> {recipe.tip}
          </p>
        )}
      </Card>

      <Card aria-labelledby="log-title">
        <SectionTitle id="log-title">Log this meal</SectionTitle>
        <div className="space-y-4">
          <Segmented<MealSlot>
            label="Meal"
            value={slot}
            onChange={setSlot}
            options={(['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).map((s) => ({ value: s, label: SLOT_LABELS[s] }))}
          />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Servings</span>
            <Stepper label="servings" value={servings} onChange={setServings} />
          </div>
          <div className="space-y-3 rounded-2xl bg-stone-50 p-4">
            <p className="text-sm text-ink-muted">Dark bar: already eaten today. Light bar: this meal.</p>
            <MacroBar kind="netCarbs" value={totals.netCarbs} preview={m.netCarbs * servings} target={targets.netCarbsMax} />
            <MacroBar kind="fat" value={totals.fat} preview={m.fat * servings} target={targets.fat} />
            <MacroBar kind="protein" value={totals.protein} preview={m.protein * servings} target={targets.protein} />
          </div>
          <Button block className="min-h-[56px] text-lg" onClick={log}>
            I ate this
          </Button>
        </div>
      </Card>
    </div>
  );
}
