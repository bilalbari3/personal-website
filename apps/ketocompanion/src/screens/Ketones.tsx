import { useMemo, useState } from 'react';
import { useStore } from '../state/AppState';
import { Card, LinkButton, PageHeader, SectionTitle, Segmented } from '../components/ui';
import { GkiTrendChart, KetoneTrendChart } from '../components/Charts';
import { StatusPill } from '../components/KetoneStatus';
import { PlusIcon, TrashIcon } from '../components/Icons';
import { addDays, formatDate, formatTime } from '../lib/dates';
import { formatGlucose, formatReading, METHOD_LABELS, readingGKI, readingStatus, sortReadings } from '../lib/ketones';
import { useToast } from '../components/Toast';

type Window = '7' | '14' | '30';

export function KetonesScreen() {
  const store = useStore();
  const { state, today } = store;
  const { settings } = state;
  const toast = useToast();
  const [win, setWin] = useState<Window>('14');
  const [showAll, setShowAll] = useState(false);
  const days = Number(win);
  const method = settings.ketoneMethod;

  const start = addDays(today, -(days - 1));
  const inWindow = useMemo(
    () => sortReadings(state.readings).filter((r) => r.date >= start && r.date <= today),
    [state.readings, start, today],
  );
  const methodReadings = inWindow.filter((r) => r.method === method);
  const inRange = methodReadings.filter((r) => readingStatus(r, settings) === 'in').length;
  const hasGKI = method === 'blood' && methodReadings.some((r) => readingGKI(r) != null);
  const gkis = methodReadings.map(readingGKI).filter((g): g is number => g != null);

  const history = [...inWindow].reverse();
  const visible = showAll ? history : history.slice(0, 8);

  const rangeText =
    method === 'blood'
      ? `${settings.ranges.blood.min.toFixed(1)}–${settings.ranges.blood.max.toFixed(1)} mmol/L`
      : method === 'breath'
        ? `${settings.ranges.breath.min}–${settings.ranges.breath.max} ppm`
        : `${settings.ranges.urineMin} or higher`;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Ketones"
        subtitle={METHOD_LABELS[method]}
        action={
          <LinkButton href="#/log-ketone" className="shrink-0 px-4">
            <PlusIcon size={20} /> Log
          </LinkButton>
        }
      />

      <Segmented<Window>
        label="Time range"
        value={win}
        onChange={setWin}
        options={[
          { value: '7', label: '7 days' },
          { value: '14', label: '14 days' },
          { value: '30', label: '30 days' },
        ]}
      />

      <Card aria-labelledby="trend-title">
        <SectionTitle id="trend-title">Your ketone trend</SectionTitle>
        <p className="-mt-1 mb-3 flex items-center gap-2 text-ink-soft">
          <span className="inline-block h-3.5 w-6 rounded-sm bg-brand-100 ring-1 ring-brand-200" aria-hidden="true" />
          Shaded band: your target range ({rangeText})
        </p>
        {methodReadings.length ? (
          <KetoneTrendChart readings={state.readings} method={method} settings={settings} end={today} days={days} />
        ) : (
          <p className="rounded-xl bg-stone-50 p-4 text-ink-soft">No {METHOD_LABELS[method].toLowerCase()} readings in this period yet.</p>
        )}
        {methodReadings.some((r) => readingStatus(r, settings) === 'contact') && (
          <p className="mt-3 flex items-center gap-2 text-ink-soft">
            <span className="inline-block h-3 w-3 rotate-45 bg-[#b45309]" aria-hidden="true" />
            Marks a reading above {settings.bhbContactThreshold.toFixed(1)} mmol/L, the level to tell your care team about.
          </p>
        )}
        {methodReadings.length > 0 && (
          <p className="mt-3 text-ink-soft">
            <span className="font-semibold text-ink">{inRange}</span> of {methodReadings.length} readings in the last {days} days were in your
            target range.
          </p>
        )}
      </Card>

      {hasGKI && (
        <Card aria-labelledby="gki-title">
          <SectionTitle id="gki-title">Glucose-Ketone Index (GKI)</SectionTitle>
          <p className="-mt-1 mb-3 text-ink-soft">
            Glucose (mmol/L) ÷ ketones (mmol/L). Lower generally means deeper ketosis.
            {gkis.length > 0 && (
              <>
                {' '}
                Average over this period: <span className="font-semibold text-ink">{(gkis.reduce((a, b) => a + b, 0) / gkis.length).toFixed(1)}</span>.
              </>
            )}
          </p>
          <GkiTrendChart readings={state.readings} end={today} days={days} />
          <p className="mt-2 text-sm text-ink-muted">Shown only for days with both a blood ketone and a glucose reading.</p>
        </Card>
      )}

      <Card aria-labelledby="history-title">
        <SectionTitle id="history-title">Readings</SectionTitle>
        {history.length === 0 ? (
          <p className="text-ink-soft">No readings in this period.</p>
        ) : (
          <>
            <ul className="divide-y divide-stone-100">
              {visible.map((r) => {
                const status = readingStatus(r, settings);
                const gki = readingGKI(r);
                return (
                  <li key={r.id} className="flex items-center gap-3 py-3">
                    <div className="w-20 shrink-0 text-sm text-ink-muted">
                      <p className="font-semibold text-ink-soft">{r.date === today ? 'Today' : formatDate(r.date)}</p>
                      <p>{formatTime(r.time)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold tabular-nums">
                        {formatReading(r)}
                        {r.method !== method && <span className="ml-2 text-sm font-normal text-ink-muted">({METHOD_LABELS[r.method]})</span>}
                      </p>
                      {(r.glucoseMgDl != null || gki != null) && (
                        <p className="text-sm tabular-nums text-ink-muted">
                          {r.glucoseMgDl != null && `Glucose ${formatGlucose(r.glucoseMgDl, settings.glucoseUnit)}`}
                          {gki != null && ` · GKI ${gki.toFixed(1)}`}
                        </p>
                      )}
                      {status && <StatusPill status={status} short className="mt-1.5" />}
                    </div>
                    <button
                      type="button"
                      aria-label={`Delete reading from ${formatDate(r.date)} ${formatTime(r.time)}`}
                      onClick={() => {
                        store.deleteReading(r.id);
                        toast('Reading removed');
                      }}
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted hover:bg-stone-100"
                    >
                      <TrashIcon size={20} />
                    </button>
                  </li>
                );
              })}
            </ul>
            {history.length > visible.length && (
              <button type="button" onClick={() => setShowAll(true)} className="mt-2 w-full py-2 font-semibold text-brand-700 underline underline-offset-2">
                Show all {history.length} readings
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
