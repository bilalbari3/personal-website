import type { KetoneStatus } from '../lib/ketones';
import { STATUS_COPY, STATUS_SHORT } from '../lib/ketones';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, PhoneIcon } from './Icons';
import { cx } from './ui';

// Status always pairs a colour with an icon and words, so it never relies on colour alone.
const STYLE: Record<KetoneStatus, { cls: string; Icon: typeof CheckIcon }> = {
  in: { cls: 'bg-brand-50 text-brand-800 ring-brand-200', Icon: CheckIcon },
  below: { cls: 'bg-sky-50 text-sky-900 ring-sky-200', Icon: ArrowDownIcon },
  above: { cls: 'bg-amber-50 text-amber-900 ring-amber-200', Icon: ArrowUpIcon },
  contact: { cls: 'bg-amber-100 text-amber-950 ring-amber-300', Icon: PhoneIcon },
};

export function StatusPill({ status, className, short }: { status: KetoneStatus; className?: string; short?: boolean }) {
  const { cls, Icon } = STYLE[status];
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-semibold ring-1',
        short ? 'px-2.5 py-0.5 text-[0.8125rem]' : 'px-3 py-1 text-[0.9375rem]',
        cls,
        className,
      )}
    >
      <Icon size={short ? 15 : 18} />
      {short ? STATUS_SHORT[status] : STATUS_COPY[status].label}
    </span>
  );
}

/** Calm, clear message shown when BHB is above the care-team threshold. */
export function ContactCareTeam({ threshold }: { threshold: number }) {
  return (
    <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200/70">
          <PhoneIcon size={20} />
        </span>
        <div className="space-y-2">
          <p className="font-semibold">Please contact your care team today.</p>
          <p>
            This reading is above {threshold.toFixed(1)} mmol/L, the level your care team asked you to let them know about. It
            doesn't mean you did anything wrong. They may want to check in or ask you to re-test.
          </p>
          <p>
            If you feel very unwell, for example with vomiting, stomach pain, fast breathing or confusion, get urgent medical care.
          </p>
        </div>
      </div>
    </div>
  );
}
