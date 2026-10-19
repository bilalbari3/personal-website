import type { DayAdherence } from '../lib/adherence';
import { parseISODate, formatDate } from '../lib/dates';
import { cx } from './ui';

// Sequential single-hue scale (goals met 0→3). Text colour chosen per step for AA contrast.
export const HEAT_STEPS = [
  { bg: '#e7e5e4', fg: '#1f2933' },
  { bg: '#ade2d9', fg: '#1f2933' },
  { bg: '#4aa99c', fg: '#1f2933' },
  { bg: '#1d5a54', fg: '#ffffff' },
];

export function describeDay(d: DayAdherence) {
  if (d.beforeStart) return `${formatDate(d.date)}: before your plan started`;
  const parts: string[] = [];
  if (!d.loggedMeals) parts.push('no meals logged');
  else parts.push(d.carbsInTarget ? 'net carbs within target' : 'net carbs above target');
  if (!d.hadReading) parts.push('no ketone reading');
  else parts.push(d.ketonesInRange ? 'ketones in range' : 'ketones outside range');
  return `${formatDate(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}${d.isToday ? ' (today, in progress)' : ''}: ${parts.join(', ')}`;
}

/** Calendar heatmap: columns are weekdays, one cell per day. */
export function CalendarHeatmap({
  days,
  selected,
  onSelect,
}: {
  days: DayAdherence[];
  selected?: string;
  onSelect?: (date: string) => void;
}) {
  if (!days.length) return null;
  const lead = parseISODate(days[0].date).getDay();
  const weekdays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Daily adherence calendar">
        <>
          {weekdays.map((w, i) => (
            <div key={i} aria-hidden="true" title={weekdayNames[i]} className="pb-1 text-center text-sm font-semibold text-ink-muted">
              {w}
            </div>
          ))}
        </>
        <>
          {Array.from({ length: lead }).map((_, i) => (
            <div key={`pad-${i}`} aria-hidden="true" />
          ))}
          {days.map((d) => {
            const step = HEAT_STEPS[d.score];
            const dayNum = parseISODate(d.date).getDate();
            if (d.beforeStart) {
              return (
                <div
                  key={d.date}
                  role="img"
                  aria-label={describeDay(d)}
                  className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-stone-300 text-sm text-stone-500"
                >
                  {dayNum}
                </div>
              );
            }
            return (
              <button
                key={d.date}
                type="button"
                aria-label={describeDay(d)}
                aria-pressed={selected === d.date}
                onClick={() => onSelect?.(d.date)}
                className={cx(
                  'relative flex aspect-square items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-shadow',
                  selected === d.date && 'ring-2 ring-ink ring-offset-2',
                  d.isToday && 'outline outline-2 outline-offset-[-4px] outline-white/80',
                )}
                style={{ background: d.isToday ? '#f5f5f4' : step.bg, color: d.isToday ? '#1f2933' : step.fg }}
              >
                {dayNum}
                {d.isToday && <span className="absolute bottom-0.5 text-[0.6rem] font-medium text-ink-muted">today</span>}
              </button>
            );
          })}
        </>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-soft">
        <span>Goals met each day:</span>
        {HEAT_STEPS.map((s, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="h-4 w-4 rounded" style={{ background: s.bg }} aria-hidden="true" />
            {i}
          </span>
        ))}
      </div>
      <p className="mt-1 text-sm text-ink-muted">The three goals are: net carbs within target, ketones in range, and meals logged.</p>
    </div>
  );
}
