import { useState } from 'react';
import { useStore } from '../state/AppState';
import { Card, LinkButton, PageHeader, SectionTitle, Segmented } from '../components/ui';
import { CalendarHeatmap, describeDay } from '../components/Heatmap';
import { ClipboardIcon, SparkIcon, TrashIcon } from '../components/Icons';
import { bounceBack, dayAdherence, pct, summarizePeriod, supportiveMessages } from '../lib/adherence';
import { addDays, dateRange, formatDate } from '../lib/dates';
import { fmt } from '../lib/macros';
import { formatReading, sortReadings } from '../lib/ketones';
import { StatusPill } from '../components/KetoneStatus';

type Period = 'week' | 'month';

export function StatTile({ label, n, d, sub }: { label: string; n: number; d: number; sub?: string }) {
  const p = pct(n, d);
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4">
      <p className="text-[0.95rem] font-semibold text-ink-soft">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight">
        {n}
        <span className="text-lg font-semibold text-ink-muted"> of {d} days</span>
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-stone-200" aria-hidden="true">
        <div className="h-full rounded-full bg-brand-600" style={{ width: `${p}%` }} />
      </div>
      <p className="mt-1 text-sm text-ink-muted">{sub ?? `${p}%`}</p>
    </div>
  );
}

export function ProgressScreen() {
  const store = useStore();
  const { state, today } = store;
  const [period, setPeriod] = useState<Period>('week');
  const n = period === 'week' ? 7 : 30;
  const summary = summarizePeriod(state, n, today);
  const label = period === 'week' ? 'this past week' : 'over the past 30 days';
  const messages = supportiveMessages(summary, label);
  const bounce = bounceBack(state, today);

  // Heatmap includes today (shown as "in progress").
  const heatDays = dateRange(addDays(today, -n), today).map((d) => dayAdherence(state, d, today));
  const [selected, setSelected] = useState<string | undefined>(addDays(today, -1));
  const sel = selected ? heatDays.find((d) => d.date === selected) : undefined;
  const selReadings = sel ? sortReadings(state.readings.filter((r) => r.date === sel.date)) : [];

  const notes = [...state.notes].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-5">
      <PageHeader title="Progress" subtitle="A look at how things have been going, one day at a time." />

      <Segmented<Period>
        label="Period"
        value={period}
        onChange={setPeriod}
        options={[
          { value: 'week', label: 'Past week' },
          { value: 'month', label: 'Past 30 days' },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile label="Ketones in range" n={summary.ketoneDays} d={summary.total} />
        <StatTile label="Net carbs within target" n={summary.carbDays} d={summary.total} />
        <StatTile label="Meals logged" n={summary.loggedDays} d={summary.total} />
      </div>
      <p className="-mt-2 text-sm text-ink-muted">Counts full days only, so today isn't included yet.</p>

      <Card aria-labelledby="sum-title">
        <SectionTitle id="sum-title">Summary</SectionTitle>
        <ul className="space-y-2.5">
          {messages.map((m) => (
            <li key={m} className="flex gap-3">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
              <span>{m}</span>
            </li>
          ))}
        </ul>
        {bounce && (
          <p className="mt-4 flex gap-3 rounded-xl bg-brand-50 p-3 text-brand-900">
            <SparkIcon className="mt-0.5 shrink-0" size={20} />
            {bounce}
          </p>
        )}
      </Card>

      <Card aria-labelledby="cal-title">
        <SectionTitle id="cal-title">Day by day</SectionTitle>
        <CalendarHeatmap days={heatDays} selected={selected} onSelect={setSelected} />
        {sel && !sel.beforeStart && (
          <div className="mt-4 rounded-xl bg-stone-50 p-4" aria-live="polite">
            <p className="font-semibold">{formatDate(sel.date, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
            <p className="sr-only">{describeDay(sel)}</p>
            <dl className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-sm text-ink-muted">Net carbs</dt>
                <dd className="font-semibold tabular-nums">{sel.loggedMeals ? `${fmt(sel.netCarbs)} g of ${state.settings.targets.netCarbsMax} g` : 'Not logged'}</dd>
              </div>
              <div>
                <dt className="text-sm text-ink-muted">Ketones (last reading)</dt>
                <dd className="font-semibold tabular-nums">{selReadings.length ? formatReading(selReadings[selReadings.length - 1]) : 'No reading'}</dd>
              </div>
            </dl>
            {sel.ketoneStatus && <StatusPill status={sel.ketoneStatus} className="mt-3" />}
          </div>
        )}
      </Card>

      <LinkButton href="#/summary" block className="min-h-[56px] text-lg">
        <ClipboardIcon /> Summary for my care team
      </LinkButton>

      <Card aria-labelledby="notes-title">
        <SectionTitle id="notes-title">My notes</SectionTitle>
        {notes.length === 0 ? (
          <p className="text-ink-soft">You can add notes from the Today screen. They'll appear here and in your care team summary.</p>
        ) : (
          <ul className="divide-y divide-stone-100">
            {notes.map((nt) => (
              <li key={nt.id} className="flex items-start gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink-muted">{formatDate(nt.date, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                  <p>{nt.text}</p>
                </div>
                <button
                  type="button"
                  aria-label="Delete note"
                  onClick={() => store.deleteNote(nt.id)}
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
                >
                  <TrashIcon size={20} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
