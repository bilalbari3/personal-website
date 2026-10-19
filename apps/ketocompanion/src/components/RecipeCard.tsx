import type { Recommendation } from '../lib/recommend';
import { TAG_LABELS } from '../data/recipes';
import { fmt } from '../lib/macros';
import { CheckIcon, ClockIcon } from './Icons';
import { Tag, cx } from './ui';

export function MacroLine({ m, className }: { m: { netCarbs: number; fat: number; protein: number }; className?: string }) {
  return (
    <p className={cx('tabular-nums text-ink-soft', className)}>
      <span className="font-semibold text-ink">{fmt(m.netCarbs, 1)} g</span> net carbs ·{' '}
      <span className="font-semibold text-ink">{fmt(m.fat)} g</span> fat ·{' '}
      <span className="font-semibold text-ink">{fmt(m.protein)} g</span> protein
    </p>
  );
}

export function FitsBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 px-2.5 py-0.5 text-[0.8125rem] font-semibold text-white">
      <CheckIcon size={15} /> Fits your day
    </span>
  );
}

export function RecipeCard({ rec, showReasons = true }: { rec: Recommendation; showReasons?: boolean }) {
  const { recipe, macros, fits, reasons } = rec;
  return (
    <a
      href={`#/recipe/${recipe.id}`}
      className="block rounded-2xl border border-stone-200 bg-white p-4 text-ink no-underline shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-brand-400"
    >
      <div className="flex flex-wrap items-center gap-2">
        {fits && <FitsBadge />}
        <span className="inline-flex items-center gap-1 text-sm text-ink-muted">
          <ClockIcon size={16} /> {recipe.prepMinutes} min
        </span>
      </div>
      <h3 className="mt-2 text-lg font-semibold leading-snug">{recipe.name}</h3>
      <MacroLine m={macros} className="mt-1 text-[0.95rem]" />
      {showReasons && reasons.length > 0 && <p className="mt-1.5 text-[0.95rem] text-ink-muted">{reasons[0]}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {recipe.tags.map((t) => (
          <Tag key={t}>{TAG_LABELS[t]}</Tag>
        ))}
      </div>
    </a>
  );
}
