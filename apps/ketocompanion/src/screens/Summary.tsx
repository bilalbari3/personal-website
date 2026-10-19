import { useState, type ReactNode } from 'react';
import { useStore } from '../state/AppState';
import { Button, PageHeader, Segmented } from '../components/ui';
import { GkiTrendChart, KetoneTrendChart } from '../components/Charts';
import { PrintIcon } from '../components/Icons';
import { pct, summarizePeriod } from '../lib/adherence';
import { addDays, daysBetween, formatDate, todayISO } from '../lib/dates';
import { addMacros, dayTotals, fatPercent, fmt, ZERO } from '../lib/macros';
import { formatGlucose, METHOD_LABELS, readingGKI, readingStatus, readingValue, URINE_LABELS, URINE_LEVELS } from '../lib/ketones';
import type { KetoneMethod, KetoneReading } from '../types';

type Span = '14' | '30';

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

function fmtKetone(v: number | undefined, method: KetoneMethod) {
  if (v == null) return '—';
  if (method === 'blood') return `${v.toFixed(1)} mmol/L`;
  if (method === 'breath') return `${Math.round(v)} ppm`;
  return URINE_LABELS[URINE_LEVELS[Math.round(v)]];
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid">
      <h2 className="mb-2 border-b border-stone-300 pb-1 text-[0.8rem] font-bold uppercase tracking-wider text-ink-soft">{title}</h2>
      {children}
    </section>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-stone-50 p-2.5 print:border print:border-stone-200 print:bg-white">
      <p className="text-[0.8rem] text-ink-muted">{label}</p>
      <p className="text-lg font-bold tabular-nums leading-tight print:text-base">{value}</p>
      {sub && <p className="text-[0.75rem] text-ink-muted">{sub}</p>}
    </div>
  );
}

export function SummaryScreen() {
  const { state, today } = useStore();
  const { settings } = state;
  const [span, setSpan] = useState<Span>('14');
  const n = Number(span);
  const start = addDays(today, -n);
  const end = addDays(today, -1);
  const method = settings.ketoneMethod;

  const period = summarizePeriod(state, n, today);
  const days = period.days.map((d) => d.date);

  // Average intake across days that had meals logged.
  const logged = period.days.filter((d) => d.loggedMeals).map((d) => dayTotals(state.meals, d.date));
  const sum = logged.reduce((acc, m) => addMacros(acc, m), ZERO);
  const avgMacros = logged.length
    ? { netCarbs: sum.netCarbs / logged.length, fat: sum.fat / logged.length, protein: sum.protein / logged.length, calories: sum.calories / logged.length }
    : ZERO;

  const readings = state.readings.filter((r) => r.date >= start && r.date <= end);
  const mReadings = readings.filter((r) => r.method === method);
  const values = mReadings.map(readingValue).filter((v): v is number => v != null);
  const inRange = mReadings.filter((r) => readingStatus(r, settings) === 'in').length;
  const aboveThreshold = mReadings.filter((r) => readingStatus(r, settings) === 'contact').length;
  const glucoses = readings.map((r) => r.glucoseMgDl).filter((g): g is number => g != null);
  const gkis = readings.map(readingGKI).filter((g): g is number => g != null);

  // Week-by-week table
  const weeks: { label: string; dates: string[] }[] = [];
  for (let i = 0; i < days.length; i += 7) {
    const chunk = days.slice(i, i + 7);
    weeks.push({ label: `${formatDate(chunk[0])} – ${formatDate(chunk[chunk.length - 1])}`, dates: chunk });
  }
  const weekRows = weeks.map((w) => {
    const ds = period.days.filter((d) => w.dates.includes(d.date));
    const loggedDs = ds.filter((d) => d.loggedMeals);
    const rs = mReadings.filter((r) => w.dates.includes(r.date));
    const rv = rs.map(readingValue).filter((v): v is number => v != null);
    const wg = rs.map((r: KetoneReading) => readingGKI(r)).filter((g): g is number => g != null);
    return {
      label: w.label,
      carbs: avg(loggedDs.map((d) => d.netCarbs)),
      carbDays: `${ds.filter((d) => d.carbsInTarget).length}/${ds.length}`,
      ketone: method === 'urine' ? (rv.length ? Math.max(...rv) : undefined) : avg(rv),
      ketoneDays: `${ds.filter((d) => d.ketonesInRange).length}/${ds.length}`,
      gki: avg(wg),
    };
  });

  const notes = state.notes.filter((nt) => nt.date >= start && nt.date <= today).sort((a, b) => a.date.localeCompare(b.date));
  const dayOfPlan = daysBetween(settings.startDate, today) + 1;

  return (
    <div>
      <div className="no-print space-y-4">
        <PageHeader title="For my care team" subtitle="A one-page summary to bring to your appointment or print." back />
        <div className="flex flex-wrap items-center gap-3">
          <Segmented<Span>
            label="Summary period"
            className="min-w-[220px] flex-1"
            value={span}
            onChange={setSpan}
            options={[
              { value: '14', label: 'Last 14 days' },
              { value: '30', label: 'Last 30 days' },
            ]}
          />
          {import.meta.env.VITE_ARTIFACT === '1' ? null : (
            <Button onClick={() => window.print()} className="shrink-0">
              <PrintIcon size={20} /> Print or save PDF
            </Button>
          )}
        </div>
        {import.meta.env.VITE_ARTIFACT === '1' && (
          <p className="text-sm text-ink-muted">You can show this page on screen. To print it, run the app in a regular browser.</p>
        )}
      </div>

      <article
        aria-label="Care team summary"
        className="mt-5 space-y-4 rounded-2xl border border-stone-200 bg-white p-5 text-[0.95rem] shadow-sm print:mt-2 print:space-y-3 print:rounded-none print:border-0 print:p-0 print:shadow-none"
      >
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-brand-600 pb-3">
          <div>
            <p className="text-[0.8rem] font-semibold uppercase tracking-wider text-brand-700">KetoCompanion · Patient-reported summary</p>
            <h1 className="text-2xl font-bold tracking-tight print:text-xl">{settings.patientName}</h1>
            <p className="text-ink-soft">
              {formatDate(start, { month: 'short', day: 'numeric', year: 'numeric' })} – {formatDate(end, { month: 'short', day: 'numeric', year: 'numeric' })} ({n}{' '}
              days) · Day {dayOfPlan} of ketogenic diet plan (started {formatDate(settings.startDate, { month: 'short', day: 'numeric' })})
            </p>
          </div>
          <div className="text-right text-[0.8rem] text-ink-muted">
            <p>Generated {formatDate(todayISO(), { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            <p className="font-semibold text-ink">Demo: fictional data</p>
          </div>
        </header>

        <Section title="Plan targets (set by care team)">
          <p className="text-ink-soft">
            Net carbs ≤ <b className="text-ink">{settings.targets.netCarbsMax} g/day</b> · Fat <b className="text-ink">{settings.targets.fat} g/day</b> · Protein{' '}
            <b className="text-ink">{settings.targets.protein} g/day</b> · Ketone method: <b className="text-ink">{METHOD_LABELS[method]}</b>, target{' '}
            <b className="text-ink">
              {method === 'blood'
                ? `${settings.ranges.blood.min.toFixed(1)}–${settings.ranges.blood.max.toFixed(1)} mmol/L`
                : method === 'breath'
                  ? `${settings.ranges.breath.min}–${settings.ranges.breath.max} ppm`
                  : `${URINE_LABELS[settings.ranges.urineMin]} or higher`}
            </b>
            {method === 'blood' && <> · Contact threshold &gt; {settings.bhbContactThreshold.toFixed(1)} mmol/L</>}
          </p>
        </Section>

        <Section title="Adherence">
          <div className="grid grid-cols-3 gap-2">
            <Metric label="Days ketones in range" value={`${pct(period.ketoneDays, period.total)}%`} sub={`${period.ketoneDays} of ${period.total} days (last reading of day)`} />
            <Metric label="Days net carbs within target" value={`${pct(period.carbDays, period.total)}%`} sub={`${period.carbDays} of ${period.total} days`} />
            <Metric label="Logging consistency" value={`${pct(period.loggedDays, period.total)}%`} sub={`Meals: ${period.loggedDays}/${period.total} · Ketones: ${period.readingDays}/${period.total} days`} />
          </div>
        </Section>

        <Section title={`Average daily intake (${logged.length} logged days)`}>
          <div className="grid grid-cols-5 gap-2">
            <Metric label="Net carbs" value={`${fmt(avgMacros.netCarbs)} g`} />
            <Metric label="Fat" value={`${fmt(avgMacros.fat)} g`} />
            <Metric label="Protein" value={`${fmt(avgMacros.protein)} g`} />
            <Metric label="Energy from fat" value={`${fmt(fatPercent(avgMacros))}%`} />
            <Metric label="Energy" value={`${fmt(avgMacros.calories)}`} sub="kcal/day" />
          </div>
        </Section>

        <Section title="Ketones and glucose">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Metric
              label={`Mean ${method === 'blood' ? 'BHB' : method === 'breath' ? 'breath acetone' : 'urine (peak)'}`}
              value={fmtKetone(method === 'urine' ? (values.length ? Math.max(...values) : undefined) : avg(values), method)}
              sub={values.length ? `Range ${fmtKetone(Math.min(...values), method)} – ${fmtKetone(Math.max(...values), method)}` : undefined}
            />
            <Metric label="Readings in range" value={`${pct(inRange, mReadings.length)}%`} sub={`${inRange} of ${mReadings.length} readings`} />
            <Metric label="Mean glucose" value={glucoses.length ? formatGlucose(avg(glucoses)!, settings.glucoseUnit) : '—'} sub={`${glucoses.length} readings`} />
            <Metric
              label="Mean GKI"
              value={gkis.length ? avg(gkis)!.toFixed(1) : '—'}
              sub={gkis.length ? `Range ${Math.min(...gkis).toFixed(1)} – ${Math.max(...gkis).toFixed(1)}` : 'Needs BHB + glucose'}
            />
          </div>
          {method === 'blood' && (
            <p className="mt-2 text-[0.85rem] text-ink-soft">
              Readings above the contact threshold ({settings.bhbContactThreshold.toFixed(1)} mmol/L): <b className="text-ink">{aboveThreshold}</b>
            </p>
          )}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            <figure>
              <figcaption className="mb-1 text-[0.85rem] font-semibold">
                Daily {method === 'blood' ? 'BHB (mmol/L)' : method === 'breath' ? 'breath acetone (ppm)' : 'urine ketones'}, target band shaded
              </figcaption>
              {/* Responsive on screen; fixed width for print, where resize events are unreliable. */}
              <div className="print:hidden">
                <KetoneTrendChart readings={state.readings} method={method} settings={settings} end={end} days={n} height={180} />
              </div>
              <div className="hidden print:block">
                <KetoneTrendChart readings={state.readings} method={method} settings={settings} end={end} days={n} height={160} width={340} animate={false} />
              </div>
            </figure>
            {method === 'blood' && (
              <figure>
                <figcaption className="mb-1 text-[0.85rem] font-semibold">Daily GKI (glucose mmol/L ÷ BHB mmol/L)</figcaption>
                <div className="print:hidden">
                  <GkiTrendChart readings={state.readings} end={end} days={n} height={180} />
                </div>
                <div className="hidden print:block">
                  <GkiTrendChart readings={state.readings} end={end} days={n} height={160} width={340} animate={false} />
                </div>
              </figure>
            )}
          </div>
        </Section>

        <Section title="Week by week">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[0.85rem] tabular-nums">
              <thead>
                <tr className="text-ink-muted">
                  <th className="py-1 pr-2 font-semibold">Week</th>
                  <th className="py-1 pr-2 font-semibold">Avg net carbs</th>
                  <th className="py-1 pr-2 font-semibold">Carb target days</th>
                  <th className="py-1 pr-2 font-semibold">Avg ketones</th>
                  <th className="py-1 pr-2 font-semibold">Ketone range days</th>
                  <th className="py-1 font-semibold">Avg GKI</th>
                </tr>
              </thead>
              <tbody>
                {weekRows.map((w) => (
                  <tr key={w.label} className="border-t border-stone-200">
                    <td className="py-1 pr-2">{w.label}</td>
                    <td className="py-1 pr-2">{w.carbs != null ? `${fmt(w.carbs)} g` : '—'}</td>
                    <td className="py-1 pr-2">{w.carbDays}</td>
                    <td className="py-1 pr-2">{fmtKetone(w.ketone, method)}</td>
                    <td className="py-1 pr-2">{w.ketoneDays}</td>
                    <td className="py-1">{w.gki != null ? w.gki.toFixed(1) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        <Section title="Patient notes">
          {notes.length === 0 ? (
            <p className="text-ink-muted">No notes in this period.</p>
          ) : (
            <ul className="space-y-1">
              {notes.map((nt) => (
                <li key={nt.id} className="flex gap-3">
                  <span className="w-16 shrink-0 font-semibold text-ink-soft">{formatDate(nt.date)}</span>
                  <span>{nt.text}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="border-t border-stone-300 pt-2 text-[0.75rem] text-ink-muted">
          Patient-recorded data from a home meter and food log; not verified by a clinician. Ketone adherence uses the last reading of each day. Net
          carbs = total carbohydrate − fiber, from a reference food database. Generated by the KetoCompanion demo using fictional data. Not for
          clinical use.
        </footer>
      </article>
    </div>
  );
}
