import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ChevronLeftIcon, CloseIcon, MinusIcon, PlusIcon } from './Icons';
import { goBack } from '../lib/router';

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(' ');
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'quiet';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-brand-700 border border-brand-600/40 hover:bg-brand-50 active:bg-brand-100',
  ghost: 'bg-transparent text-brand-700 hover:bg-brand-50',
  quiet: 'bg-stone-100 text-ink hover:bg-stone-200',
};

export function Button({
  variant = 'primary',
  className,
  block,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cx(
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[1.0625rem] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        block && 'w-full',
        className,
      )}
    />
  );
}

export function LinkButton({
  href,
  variant = 'primary',
  className,
  children,
  block,
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
  block?: boolean;
}) {
  return (
    <a
      href={href}
      className={cx(
        'inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[1.0625rem] font-semibold no-underline transition-colors',
        variants[variant],
        block && 'w-full',
        className,
      )}
    >
      {children}
    </a>
  );
}

export function Card({ children, className, as: As = 'section', ...rest }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article'; 'aria-labelledby'?: string }) {
  return (
    <As {...rest} className={cx('rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]', className)}>
      {children}
    </As>
  );
}

export function SectionTitle({ children, id, action }: { children: ReactNode; id?: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 id={id} className="text-lg font-semibold text-ink">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, back, action }: { title: string; subtitle?: string; back?: boolean; action?: ReactNode }) {
  return (
    <header className="mb-5 flex items-start gap-2">
      {back && (
        <button
          type="button"
          onClick={() => goBack()}
          className="-ml-2 mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-soft hover:bg-stone-200/60"
          aria-label="Go back"
        >
          <ChevronLeftIcon size={26} />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-ink-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cx('flex rounded-xl bg-stone-200/70 p-1', className)}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            'min-h-[44px] flex-1 rounded-lg px-3 text-[0.95rem] font-semibold transition-colors',
            value === o.value ? 'bg-white text-brand-800 shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Stepper({
  value,
  onChange,
  step = 0.5,
  min = 0.5,
  max = 10,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-ink hover:bg-stone-200 disabled:opacity-40"
        onClick={() => onChange(Math.max(min, value - step))}
        disabled={value <= min}
        aria-label={`Less ${label}`}
      >
        <MinusIcon size={20} />
      </button>
      <span className="w-12 text-center text-lg font-semibold tabular-nums" aria-live="polite">
        {value % 1 === 0 ? value : value.toFixed(1)}
      </span>
      <button
        type="button"
        className="flex h-11 w-11 items-center justify-center rounded-full bg-stone-100 text-ink hover:bg-stone-200 disabled:opacity-40"
        onClick={() => onChange(Math.min(max, value + step))}
        disabled={value >= max}
        aria-label={`More ${label}`}
      >
        <PlusIcon size={20} />
      </button>
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
  htmlFor?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block font-semibold text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-sm text-ink-muted">{hint}</p>}
    </div>
  );
}

export const inputClass =
  'block w-full min-h-[48px] rounded-xl border border-stone-300 bg-white px-4 text-[1.0625rem] text-ink placeholder:text-stone-500 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/30';

export function Chip({ active, onClick, children }: { active?: boolean; onClick?: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cx(
        'min-h-[40px] shrink-0 rounded-full border px-4 text-[0.95rem] font-medium transition-colors',
        active ? 'border-brand-600 bg-brand-600 text-white' : 'border-stone-300 bg-white text-ink-soft hover:border-brand-400',
      )}
    >
      {children}
    </button>
  );
}

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'brand' }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.8125rem] font-medium',
        tone === 'brand' ? 'bg-brand-100 text-brand-800' : 'bg-stone-100 text-ink-soft',
      )}
    >
      {children}
    </span>
  );
}

/** Accessible modal dialog / bottom sheet. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className="m-0 mt-auto w-full max-w-none rounded-t-3xl bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40 sm:m-auto sm:max-w-lg sm:rounded-3xl"
    >
      {open && (
        <div className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
            <h2 id={titleId} className="text-xl font-semibold">
              {title}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-stone-100"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="overflow-y-auto px-5 py-4">{children}</div>
          {footer && <div className="border-t border-stone-100 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

/** Small transient confirmation message. */
export function Toast({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 print:hidden">
      {message && <div className="rounded-xl bg-ink px-5 py-3 font-medium text-white shadow-lg">{message}</div>}
    </div>
  );
}
