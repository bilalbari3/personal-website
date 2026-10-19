import { cloneElement, type ReactElement } from 'react';
import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import type { ISODate, KetoneMethod, KetoneReading, Settings } from '../types';
import { addDays, dateRange, formatDate } from '../lib/dates';
import { readingGKI, readingValue, URINE_LABELS, URINE_LEVELS } from '../lib/ketones';

const INK_MUTED = '#52606d';
const GRID = '#e7e5e4';
const LINE = '#226f67';
const BAND = '#d6f1ec';
const GKI_LINE = '#3b5fa8';

export interface DailyPoint {
  date: ISODate;
  label: string;
  value: number | null;
  count: number;
}

/** One point per day: average of that day's readings (urine: highest level). */
export function dailySeries(
  readings: KetoneReading[],
  method: KetoneMethod,
  end: ISODate,
  days: number,
  pick: (r: KetoneReading) => number | undefined = readingValue,
): DailyPoint[] {
  return dateRange(addDays(end, -(days - 1)), end).map((date) => {
    const vals = readings
      .filter((r) => r.date === date && r.method === method)
      .map(pick)
      .filter((v): v is number => v != null);
    let value: number | null = null;
    if (vals.length) value = method === 'urine' ? Math.max(...vals) : vals.reduce((a, b) => a + b, 0) / vals.length;
    return { date, label: formatDate(date), value: value == null ? null : Math.round(value * 100) / 100, count: vals.length };
  });
}

function fmtValue(v: number, method: KetoneMethod) {
  if (method === 'urine') return URINE_LABELS[URINE_LEVELS[Math.round(v)]];
  if (method === 'breath') return `${Math.round(v)} ppm`;
  return `${v.toFixed(1)} mmol/L`;
}

function TipBox({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm shadow-md">
      <p className="font-semibold text-ink">{title}</p>
      {lines.map((l) => (
        <p key={l} className="text-ink-soft">
          {l}
        </p>
      ))}
    </div>
  );
}

const tickStyle = { fill: INK_MUTED, fontSize: 12 };

export function KetoneTrendChart({
  readings,
  method,
  settings,
  end,
  days,
  height = 240,
  width,
  animate = true,
}: {
  readings: KetoneReading[];
  method: KetoneMethod;
  settings: Settings;
  end: ISODate;
  days: number;
  height?: number;
  /** Fixed pixel width (used for print, where responsive resizing is unreliable). */
  width?: number;
  animate?: boolean;
}) {
  // The line shows daily averages; any single blood reading above the contact threshold is
  // also marked separately so averaging can never hide it.
  const data = dailySeries(readings, method, end, days).map((p) => {
    if (method !== 'blood') return { ...p, high: null };
    const peak = Math.max(0, ...readings.filter((r) => r.date === p.date && r.method === 'blood').map((r) => r.bhb ?? 0));
    return { ...p, high: peak > settings.bhbContactThreshold ? peak : null };
  });
  const values = data.flatMap((d) => [d.value, d.high]).filter((v): v is number => v != null);
  const maxVal = values.length ? Math.max(...values) : 0;

  let band: [number, number];
  let domain: [number, number];
  let ticks: number[] | undefined;
  let showThreshold = false;
  if (method === 'blood') {
    band = [settings.ranges.blood.min, settings.ranges.blood.max];
    showThreshold = maxVal >= settings.ranges.blood.max;
    const top = Math.max(band[1] + 0.5, maxVal + 0.3, showThreshold ? settings.bhbContactThreshold + 0.3 : 0);
    domain = [0, Math.ceil(top)];
  } else if (method === 'breath') {
    band = [settings.ranges.breath.min, settings.ranges.breath.max];
    domain = [0, Math.ceil(Math.max(band[1] * 1.2, maxVal * 1.1) / 5) * 5];
  } else {
    band = [URINE_LEVELS.indexOf(settings.ranges.urineMin) - 0.3, 4.3];
    domain = [0, 4.3];
    ticks = [0, 1, 2, 3, 4];
  }

  const interval = days <= 7 ? 0 : days <= 14 ? 1 : 4;

  return (
    <ChartFrame width={width} height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <ReferenceArea y1={band[0]} y2={Math.min(band[1], domain[1])} fill={BAND} fillOpacity={0.85} ifOverflow="hidden" />
          {showThreshold && (
            <ReferenceLine
              y={settings.bhbContactThreshold}
              stroke="#b45309"
              strokeDasharray="5 4"
              label={{ value: `Contact care team above ${settings.bhbContactThreshold}`, position: 'insideTopLeft', fill: '#92400e', fontSize: 11 }}
            />
          )}
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: GRID }} interval={interval} minTickGap={4} />
          <YAxis
            domain={domain}
            ticks={ticks}
            tick={tickStyle}
            tickLine={false}
            axisLine={false}
            width={method === 'urine' ? 72 : 40}
            tickFormatter={(v: number) => (method === 'urine' ? URINE_LABELS[URINE_LEVELS[v]] ?? '' : String(v))}
          />
          <Tooltip
            cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
            content={({ active, payload }: TooltipProps<number, string>) => {
              const p = payload?.[0]?.payload as (DailyPoint & { high: number | null }) | undefined;
              if (!active || !p) return null;
              return (
                <TipBox
                  title={formatDate(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  lines={
                    p.value == null
                      ? ['No reading']
                      : [
                          `${p.count > 1 && method !== 'urine' ? 'Average ' : ''}${fmtValue(p.value, method)}`,
                          ...(p.count > 1 ? [`${p.count} readings`] : []),
                          ...(p.high != null ? [`Highest ${fmtValue(p.high, method)}: above contact level`] : []),
                        ]
                  }
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={LINE}
            strokeWidth={2.5}
            dot={{ r: 4, fill: LINE, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: LINE, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={animate}
          />
          {method === 'blood' && (
            <Scatter dataKey="high" fill="#b45309" stroke="#fff" strokeWidth={2} shape="diamond" isAnimationActive={false} legendType="none" />
          )}
        </ComposedChart>
    </ChartFrame>
  );
}

export function GkiTrendChart({
  readings,
  end,
  days,
  height = 200,
  width,
  animate = true,
}: {
  readings: KetoneReading[];
  end: ISODate;
  days: number;
  height?: number;
  width?: number;
  animate?: boolean;
}) {
  const data = dailySeries(readings, 'blood', end, days, readingGKI);
  const values = data.map((d) => d.value).filter((v): v is number => v != null);
  const top = values.length ? Math.ceil(Math.max(...values) + 1) : 10;
  const interval = days <= 7 ? 0 : days <= 14 ? 1 : 4;
  return (
    <ChartFrame width={width} height={height}>
        <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={tickStyle} tickLine={false} axisLine={{ stroke: GRID }} interval={interval} minTickGap={4} />
          <YAxis domain={[0, top]} tick={tickStyle} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: INK_MUTED, strokeWidth: 1 }}
            content={({ active, payload }: TooltipProps<number, string>) => {
              const p = payload?.[0]?.payload as DailyPoint | undefined;
              if (!active || !p) return null;
              return (
                <TipBox
                  title={formatDate(p.date, { weekday: 'short', month: 'short', day: 'numeric' })}
                  lines={[p.value == null ? 'No GKI (needs ketones + glucose)' : `GKI ${p.value.toFixed(1)}`]}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={GKI_LINE}
            strokeWidth={2.5}
            dot={{ r: 4, fill: GKI_LINE, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: GKI_LINE, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
            isAnimationActive={animate}
          />
        </ComposedChart>
    </ChartFrame>
  );
}

/** Responsive by default; fixed size when a width is given. */
function ChartFrame({ width, height, children }: { width?: number; height: number; children: ReactElement }) {
  if (width) return cloneElement(children, { width, height });
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}
