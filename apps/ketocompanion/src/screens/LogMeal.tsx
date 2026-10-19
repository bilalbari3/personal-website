import { useMemo, useState } from 'react';
import { useStore } from '../state/AppState';
import { FOODS, FOOD_CATEGORIES, getFood } from '../data/foods';
import type { Food, FoodCategory, LoggedItem, MealSlot } from '../types';
import { Button, Chip, Dialog, Field, PageHeader, Segmented, Stepper, cx, inputClass } from '../components/ui';
import { MacroBar } from '../components/MacroBar';
import { CheckIcon, PlusIcon, SearchIcon, StarIcon, TrashIcon } from '../components/Icons';
import { addMacros, dayTotals, fmt, itemsTotal, SLOT_LABELS, SLOT_ORDER, slotForTime, ZERO } from '../lib/macros';
import { formatDate, formatTime, nowHHmm } from '../lib/dates';
import { navigate } from '../lib/router';
import { useToast } from '../components/Toast';

type Tab = 'recent' | 'favorites' | 'mine' | 'all';

function toItem(food: Food, servings = 1): LoggedItem {
  return { kind: 'food', refId: food.id, name: food.name, serving: food.serving, servings, perServing: food.macros };
}

export function LogMealScreen() {
  const store = useStore();
  const { state, today } = store;
  const toast = useToast();

  const [date, setDate] = useState(today);
  const [time, setTime] = useState(nowHHmm());
  const [slot, setSlot] = useState<MealSlot>(slotForTime(nowHHmm()));
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('recent');
  const [category, setCategory] = useState<FoodCategory | 'All'>('All');
  const [tray, setTray] = useState<LoggedItem[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [showWhen, setShowWhen] = useState(false);

  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    const sorted = [...state.meals].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    for (const m of sorted) {
      for (const it of m.items) {
        if (it.kind !== 'food' || seen.has(it.refId)) continue;
        const f = getFood(it.refId);
        if (f) {
          seen.add(f.id);
          out.push(f);
        }
      }
      if (out.length >= 15) break;
    }
    return out;
  }, [state.meals]);

  const favoriteFoods = state.favorites.map(getFood).filter((f): f is Food => !!f);

  const q = query.trim().toLowerCase();
  const list: Food[] = q
    ? FOODS.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
    : tab === 'recent'
      ? recentFoods
      : tab === 'favorites'
        ? favoriteFoods
        : tab === 'all'
          ? FOODS.filter((f) => category === 'All' || f.category === category)
          : [];

  const addFood = (food: Food, servings = 1) => {
    setTray((t) => {
      const i = t.findIndex((x) => x.refId === food.id);
      if (i >= 0) return t.map((x, j) => (j === i ? { ...x, servings: x.servings + servings } : x));
      return [...t, toItem(food, servings)];
    });
  };

  const trayTotal = itemsTotal(tray);
  const dayBefore = dayTotals(state.meals, date);
  const { targets } = state.settings;
  const trayCount = tray.length;

  const confirm = () => {
    store.addMeal({ date, time, slot, items: tray });
    toast(`${SLOT_LABELS[slot]} logged`);
    setTray([]);
    setReviewOpen(false);
    navigate('today');
  };

  const saveAsMine = () => {
    const name = saveName.trim();
    if (!name) return;
    store.saveCustomMeal({ name, items: tray.map((t) => ({ foodId: t.refId, servings: t.servings })) });
    setSaveName('');
    toast(`Saved "${name}" to My meals`);
  };

  return (
    <div>
      <PageHeader title="Log a meal" subtitle="Tap foods to add them, then review before saving." />

      <div className="space-y-3">
        <Segmented
          label="Meal"
          value={slot}
          onChange={setSlot}
          options={SLOT_ORDER.map((s) => ({ value: s, label: SLOT_LABELS[s] }))}
        />
        <p className="text-ink-soft">
          {date === today ? 'Today' : formatDate(date, { weekday: 'long', month: 'short', day: 'numeric' })} at {formatTime(time)}{' '}
          <button type="button" className="ml-1 font-semibold text-brand-700 underline underline-offset-2" onClick={() => setShowWhen((v) => !v)}>
            {showWhen ? 'Done' : 'Change'}
          </button>
        </p>
        {showWhen && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date" htmlFor="meal-date">
              <input id="meal-date" type="date" className={inputClass} value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </Field>
            <Field label="Time" htmlFor="meal-time">
              <input id="meal-time" type="time" className={inputClass} value={time} onChange={(e) => e.target.value && setTime(e.target.value)} />
            </Field>
          </div>
        )}

        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted" size={22} />
          <label htmlFor="food-search" className="sr-only">
            Search foods
          </label>
          <input
            id="food-search"
            type="search"
            className={`${inputClass} pl-11`}
            placeholder="Search foods, e.g. eggs, salmon, almonds"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        {!q && (
          <Segmented
            label="Food list"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'recent', label: 'Recent' },
              { value: 'favorites', label: 'Favorites' },
              { value: 'mine', label: 'My meals' },
              { value: 'all', label: 'All' },
            ]}
          />
        )}

        {!q && tab === 'all' && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {(['All', ...FOOD_CATEGORIES] as const).map((c) => (
              <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                {c}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        {!q && tab === 'mine' ? (
          <MyMeals
            onAdd={(items) => {
              items.forEach(({ foodId, servings }) => {
                const f = getFood(foodId);
                if (f) addFood(f, servings);
              });
              toast('Added to your meal');
            }}
          />
        ) : list.length === 0 ? (
          <p className="rounded-2xl bg-white p-5 text-ink-soft">
            {q
              ? `No foods match "${query}". Try a simpler word, like "chicken" or "cheese".`
              : tab === 'favorites'
                ? 'Tap the star next to any food to keep it here.'
                : 'Foods you log will show up here.'}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            {list.map((f) => {
              const inTray = tray.find((t) => t.refId === f.id);
              const fav = state.favorites.includes(f.id);
              return (
                <li key={f.id} className="flex items-center gap-1 border-b border-stone-100 last:border-0">
                  <button
                    type="button"
                    onClick={() => addFood(f)}
                    className="flex min-h-[64px] min-w-0 flex-1 items-center gap-3 py-2.5 pl-4 text-left hover:bg-stone-50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-snug">{f.name}</p>
                      <p className="text-sm tabular-nums text-ink-muted">
                        {f.serving} · {fmt(f.macros.netCarbs, 1)} g net carbs · {fmt(f.macros.fat, 1)} g fat · {fmt(f.macros.protein, 1)} g protein
                      </p>
                    </div>
                    <span
                      className={cx(
                        'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-full px-2 font-semibold',
                        inTray ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-700',
                      )}
                      aria-hidden="true"
                    >
                      {inTray ? <><CheckIcon size={18} /> {inTray.servings}</> : <PlusIcon size={22} />}
                    </span>
                    <span className="sr-only">{inTray ? `Add another serving (${inTray.servings} added)` : 'Add'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => store.toggleFavorite(f.id)}
                    aria-pressed={fav}
                    aria-label={fav ? `Remove ${f.name} from favorites` : `Add ${f.name} to favorites`}
                    className={cx('flex h-12 w-12 shrink-0 items-center justify-center rounded-full hover:bg-stone-100', fav ? 'text-[#a8641a]' : 'text-stone-400')}
                  >
                    <StarIcon filled={fav} size={22} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {trayCount > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-20 px-4 pb-3">
          <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl bg-ink p-3 pl-5 text-white shadow-xl">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {trayCount} item{trayCount === 1 ? '' : 's'} in your {SLOT_LABELS[slot].toLowerCase()}
              </p>
              <p className="text-sm tabular-nums text-stone-300">
                {fmt(trayTotal.netCarbs, 1)} g net carbs · {fmt(trayTotal.fat)} g fat · {fmt(trayTotal.protein)} g protein
              </p>
            </div>
            <Button onClick={() => setReviewOpen(true)} className="bg-white !text-ink hover:bg-stone-100">
              Review
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title={`Review ${SLOT_LABELS[slot].toLowerCase()}`}
        footer={
          <Button block onClick={confirm} disabled={trayCount === 0} className="min-h-[56px] text-lg">
            Log {SLOT_LABELS[slot].toLowerCase()}
          </Button>
        }
      >
        {trayCount === 0 ? (
          <p className="text-ink-soft">Your meal is empty. Add some foods first.</p>
        ) : (
          <div className="space-y-5">
            <ul className="divide-y divide-stone-100">
              {tray.map((it, idx) => (
                <li key={it.refId} className="flex items-center gap-2 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug">{it.name}</p>
                    <p className="text-sm text-ink-muted">
                      {it.servings} × {it.serving}
                    </p>
                  </div>
                  <Stepper
                    label={`servings of ${it.name}`}
                    value={it.servings}
                    onChange={(v) => setTray((t) => t.map((x, j) => (j === idx ? { ...x, servings: v } : x)))}
                  />
                  <button
                    type="button"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => setTray((t) => t.filter((_, j) => j !== idx))}
                    className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
                  >
                    <TrashIcon size={20} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl bg-stone-50 p-4">
              <h3 className="font-semibold">How this meal fits your day</h3>
              <p className="mb-3 text-sm text-ink-muted">Dark bar: already eaten. Light bar: this meal.</p>
              <div className="space-y-3">
                <MacroBar kind="netCarbs" value={dayBefore.netCarbs} preview={trayTotal.netCarbs} target={targets.netCarbsMax} />
                <MacroBar kind="fat" value={dayBefore.fat} preview={trayTotal.fat} target={targets.fat} />
                <MacroBar kind="protein" value={dayBefore.protein} preview={trayTotal.protein} target={targets.protein} />
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                This meal: {fmt(trayTotal.netCarbs, 1)} g net carbs, {fmt(trayTotal.fat)} g fat, {fmt(trayTotal.protein)} g protein (
                {fmt(trayTotal.calories)} kcal).
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="save-name" className="block font-semibold">
                Save this combination for next time <span className="font-normal text-ink-muted">(optional)</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="save-name"
                  className={inputClass}
                  placeholder="e.g. Weekday lunch"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
                <Button variant="secondary" onClick={saveAsMine} disabled={!saveName.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}

function MyMeals({ onAdd }: { onAdd: (items: { foodId: string; servings: number }[]) => void }) {
  const { state, deleteCustomMeal } = useStore();
  if (state.customMeals.length === 0) {
    return (
      <p className="rounded-2xl bg-white p-5 text-ink-soft">
        Meals you save will show up here, so you can log them again with one tap. Build a meal, then choose "Save this
        combination" when you review it.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {state.customMeals.map((c) => {
        const foods = c.items.map((i) => ({ f: getFood(i.foodId), s: i.servings })).filter((x) => x.f);
        const total = foods.reduce((acc, { f, s }) => addMacros(acc, f!.macros, s), ZERO);
        return (
          <li key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4">
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-lg font-semibold">{c.name}</p>
                <p className="text-ink-soft">{foods.map(({ f, s }) => `${s !== 1 ? `${s} × ` : ''}${f!.name}`).join(', ')}</p>
                <p className="text-sm tabular-nums text-ink-muted">
                  {fmt(total.netCarbs, 1)} g net carbs · {fmt(total.fat)} g fat · {fmt(total.protein)} g protein
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete ${c.name}`}
                onClick={() => deleteCustomMeal(c.id)}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
              >
                <TrashIcon size={20} />
              </button>
            </div>
            <Button variant="secondary" block className="mt-3" onClick={() => onAdd(c.items)}>
              <PlusIcon size={20} /> Add to this meal
            </Button>
          </li>
        );
      })}
    </ul>
  );
}
