import { useMemo, useState } from 'react';
import { useStore } from '../state/AppState';
import { Button, Card, Dialog, LinkButton, SectionTitle, inputClass } from '../components/ui';
import { MacroBar } from '../components/MacroBar';
import { ContactCareTeam, StatusPill } from '../components/KetoneStatus';
import { FitsBadge, MacroLine } from '../components/RecipeCard';
import { ClipboardIcon, ClockIcon, CloseIcon, DropIcon, PencilIcon, PlateIcon, TrashIcon, WaterIcon } from '../components/Icons';
import { daysBetween, formatLongDate, formatTime, nowHHmm } from '../lib/dates';
import { dayTotals, fmt, itemsTotal, mealsForDate, remainingFor, SLOT_LABELS } from '../lib/macros';
import { formatGlucose, formatReading, readingGKI, readingStatus, sortReadings } from '../lib/ketones';
import { nextSlot, recommend } from '../lib/recommend';
import { useToast } from '../components/Toast';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export function TodayScreen() {
  const store = useStore();
  const { state, today } = store;
  const { settings } = state;
  const toast = useToast();
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');

  const meals = mealsForDate(state.meals, today);
  const totals = dayTotals(state.meals, today);
  const remaining = remainingFor(totals, settings);
  const dayNumber = daysBetween(settings.startDate, today) + 1;

  const latest = useMemo(() => {
    const sorted = sortReadings(state.readings);
    return sorted[sorted.length - 1];
  }, [state.readings]);
  const latestStatus = latest ? readingStatus(latest, settings) : undefined;
  const latestGKI = latest ? readingGKI(latest) : undefined;

  const slot = nextSlot(nowHHmm(), new Set(meals.map((m) => m.slot)));
  const suggestion = recommend(remaining, { slot })[0];

  const showHydration = settings.showHydrationReminder && state.hydrationDismissedOn !== today;

  const logSuggestion = () => {
    if (!suggestion) return;
    store.addMeal({
      date: today,
      time: nowHHmm(),
      slot,
      items: [
        {
          kind: 'recipe',
          refId: suggestion.recipe.id,
          name: suggestion.recipe.name,
          serving: '1 serving',
          servings: 1,
          perServing: suggestion.macros,
        },
      ],
    });
    toast(`${SLOT_LABELS[slot]} logged`);
  };

  const saveNote = () => {
    if (!noteText.trim()) return;
    store.addNote({ date: today, text: noteText.trim() });
    setNoteText('');
    setNoteOpen(false);
    toast('Note saved. It will appear in your care team summary.');
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-ink-muted">{formatLongDate(today)}</p>
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight">
          {greeting()}, {settings.patientName}
        </h1>
        {dayNumber > 0 && (
          <p className="mt-1 text-ink-soft">
            Day {dayNumber} of your plan.{' '}
            {dayNumber <= 14
              ? 'The first couple of weeks are an adjustment. Be patient with yourself.'
              : 'Thanks for showing up for your health today.'}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <LinkButton href="#/log-meal" className="min-h-[60px] whitespace-nowrap px-3 text-lg">
          <PlateIcon /> Log a meal
        </LinkButton>
        <LinkButton href="#/log-ketone" variant="secondary" className="min-h-[60px] whitespace-nowrap px-3 text-lg">
          <DropIcon /> Log ketones
        </LinkButton>
      </div>

      <Card aria-labelledby="macros-title">
        <SectionTitle id="macros-title">Today's food</SectionTitle>
        <div className="space-y-4">
          <MacroBar kind="netCarbs" value={totals.netCarbs} target={settings.targets.netCarbsMax} />
          <MacroBar kind="fat" value={totals.fat} target={settings.targets.fat} />
          <MacroBar kind="protein" value={totals.protein} target={settings.targets.protein} />
        </div>
        {totals.netCarbs > settings.targets.netCarbsMax && (
          <p className="mt-4 rounded-xl bg-stone-100 p-3 text-ink-soft">
            Today went a little over your carb target. That's okay. Your next meal is a fresh start, and nothing needs to be made
            up.
          </p>
        )}
      </Card>

      <Card aria-labelledby="ketone-title">
        <SectionTitle id="ketone-title" action={<a href="#/ketones" className="font-semibold">See trend</a>}>
          Latest ketone reading
        </SectionTitle>
        {latest ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-x-4 gap-y-1">
              <p className="text-4xl font-bold tabular-nums tracking-tight">{formatReading(latest)}</p>
              <p className="pb-1 text-ink-muted">
                {latest.date === today ? 'Today' : formatLongDate(latest.date)}, {formatTime(latest.time)}
              </p>
            </div>
            {latestStatus && latestStatus !== 'contact' && <StatusPill status={latestStatus} />}
            {latestStatus === 'contact' && <ContactCareTeam threshold={settings.bhbContactThreshold} />}
            {(latest.glucoseMgDl != null || latestGKI != null) && (
              <dl className="grid grid-cols-2 gap-3 pt-1">
                {latest.glucoseMgDl != null && (
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-sm text-ink-muted">Glucose</dt>
                    <dd className="text-lg font-semibold tabular-nums">{formatGlucose(latest.glucoseMgDl, settings.glucoseUnit)}</dd>
                  </div>
                )}
                {latestGKI != null && (
                  <div className="rounded-xl bg-stone-50 p-3">
                    <dt className="text-sm text-ink-muted">Glucose-Ketone Index</dt>
                    <dd className="text-lg font-semibold tabular-nums">{latestGKI.toFixed(1)}</dd>
                  </div>
                )}
              </dl>
            )}
          </div>
        ) : (
          <p className="text-ink-soft">No readings yet. When you check your ketones, log them here.</p>
        )}
      </Card>

      {showHydration && (
        <div className="relative rounded-2xl border border-sky-200 bg-sky-50 p-4 pr-12 text-sky-950">
          <div className="flex gap-3">
            <WaterIcon className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">A gentle reminder: fluids and electrolytes</p>
              <p className="mt-1">
                Drinking enough fluids and keeping up salt, potassium and magnesium can help with tiredness or headaches on keto.
                Ask your care team what amounts are right for you.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={store.dismissHydration}
            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full hover:bg-sky-100"
            aria-label="Dismiss reminder for today"
          >
            <CloseIcon size={20} />
          </button>
        </div>
      )}

      {suggestion && (
        <Card aria-labelledby="next-title">
          <SectionTitle id="next-title" action={<a href="#/recipes" className="font-semibold">More ideas</a>}>
            Next suggested meal
          </SectionTitle>
          <p className="text-sm font-semibold uppercase tracking-wide text-ink-muted">{SLOT_LABELS[slot]}</p>
          <h3 className="mt-1 text-xl font-semibold">{suggestion.recipe.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {suggestion.fits && <FitsBadge />}
            <span className="inline-flex items-center gap-1 text-ink-muted">
              <ClockIcon size={17} /> {suggestion.recipe.prepMinutes} min
            </span>
          </div>
          <MacroLine m={suggestion.macros} className="mt-2" />
          <p className="mt-1 text-ink-muted">{suggestion.reasons[0]}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <LinkButton href={`#/recipe/${suggestion.recipe.id}`} variant="secondary">
              See recipe
            </LinkButton>
            <Button onClick={logSuggestion}>I ate this</Button>
          </div>
        </Card>
      )}

      <Card aria-labelledby="meals-title">
        <SectionTitle id="meals-title" action={<a href="#/log-meal" className="font-semibold">Add</a>}>
          Logged today
        </SectionTitle>
        {meals.length === 0 ? (
          <p className="text-ink-soft">Nothing logged yet today.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {meals.map((m) => {
              const t = itemsTotal(m.items);
              return (
                <li key={m.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      {SLOT_LABELS[m.slot]} <span className="font-normal text-ink-muted">· {formatTime(m.time)}</span>
                    </p>
                    <p className="truncate text-ink-soft">{m.items.map((i) => i.name).join(', ')}</p>
                    <p className="text-sm tabular-nums text-ink-muted">
                      {fmt(t.netCarbs, 1)} g net carbs · {fmt(t.fat)} g fat · {fmt(t.protein)} g protein
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
                    aria-label={`Remove ${SLOT_LABELS[m.slot]} at ${formatTime(m.time)}`}
                    onClick={() => {
                      store.deleteMeal(m.id);
                      toast('Meal removed');
                    }}
                  >
                    <TrashIcon size={20} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button variant="quiet" onClick={() => setNoteOpen(true)} className="min-h-[56px]">
          <PencilIcon /> How are you feeling? Add a note
        </Button>
        <LinkButton href="#/summary" variant="quiet" className="min-h-[56px]">
          <ClipboardIcon /> Summary for my care team
        </LinkButton>
      </div>

      <p className="px-1 text-sm text-ink-muted">
        KetoCompanion supports the plan your care team made with you. It doesn't give medication or dosing advice. Talk with your
        care team about any changes.
      </p>

      <Dialog
        open={noteOpen}
        onClose={() => setNoteOpen(false)}
        title="Add a note"
        footer={
          <Button block onClick={saveNote} disabled={!noteText.trim()}>
            Save note
          </Button>
        }
      >
        <label htmlFor="note" className="mb-2 block text-ink-soft">
          Mood, sleep, energy, or questions for your care team. Notes are included in your care team summary.
        </label>
        <textarea
          id="note"
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          className={`${inputClass} py-3`}
          placeholder="e.g. Slept well, felt calm today."
        />
      </Dialog>
    </div>
  );
}
