import { fmt } from '../lib/macros';
import { cx } from './ui';

export type MacroKind = 'netCarbs' | 'fat' | 'protein';

export const MACRO_META: Record<MacroKind, { label: string; bar: string; preview: string; swatch: string }> = {
  netCarbs: { label: 'Net carbs', bar: 'bg-brand-600', preview: 'bg-brand-300', swatch: '#226f67' },
  fat: { label: 'Fat', bar: 'bg-[#a8641a]', preview: 'bg-[#e6bf8a]', swatch: '#a8641a' },
  protein: { label: 'Protein', bar: 'bg-[#3b5fa8]', preview: 'bg-[#a9bce3]', swatch: '#3b5fa8' },
};

/**
 * Progress toward a daily target. Net carbs are an upper limit; fat and protein are goals.
 * `preview` shows the impact of a meal before it's confirmed.
 */
export function MacroBar({
  kind,
  value,
  target,
  preview = 0,
  compact,
}: {
  kind: MacroKind;
  value: number;
  target: number;
  preview?: number;
  compact?: boolean;
}) {
  const meta = MACRO_META[kind];
  const total = value + preview;
  const scale = Math.max(target, total) || 1;
  const valuePct = (Math.min(value, scale) / scale) * 100;
  const previewPct = (Math.min(preview, scale - value) / scale) * 100;
  const targetPct = (target / scale) * 100;
  const isLimit = kind === 'netCarbs';
  const remaining = target - total;

  let helper: string;
  if (isLimit) {
    helper = remaining >= 0 ? `${fmt(remaining)} g left today` : `${fmt(-remaining)} g above today's limit`;
  } else {
    helper = remaining > 0 ? `${fmt(remaining)} g to go` : 'Target reached';
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cx('font-semibold text-ink', compact && 'text-[0.95rem]')}>{meta.label}</span>
        <span className="tabular-nums text-ink-soft">
          <span className="font-semibold text-ink">{fmt(total)}</span> / {fmt(target)} g
          {isLimit && <span className="sr-only"> limit</span>}
        </span>
      </div>
      <div
        className={cx('relative mt-1.5 overflow-hidden rounded-full bg-stone-200', compact ? 'h-2.5' : 'h-3.5')}
        role="meter"
        aria-label={`${meta.label}: ${fmt(total)} of ${fmt(target)} grams`}
        aria-valuenow={Math.round(total)}
        aria-valuemin={0}
        aria-valuemax={Math.round(target)}
      >
        <div className={cx('absolute inset-y-0 left-0 rounded-full', meta.bar)} style={{ width: `${valuePct}%` }} />
        {preview > 0 && (
          <div
            className={cx('absolute inset-y-0 rounded-r-full', meta.preview)}
            style={{ left: `calc(${valuePct}% + 2px)`, width: `max(calc(${previewPct}% - 2px), 4px)` }}
          />
        )}
        {targetPct < 100 && <div className="absolute inset-y-0 w-0.5 bg-ink/50" style={{ left: `${targetPct}%` }} />}
      </div>
      {!compact && <p className="mt-1 text-sm text-ink-muted">{helper}</p>}
    </div>
  );
}
