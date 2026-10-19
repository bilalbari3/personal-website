import type { ReactNode } from 'react';
import type { Route } from '../lib/router';
import { BookIcon, ChartIcon, DropIcon, GearIcon, HomeIcon, PlateIcon } from './Icons';
import { cx } from './ui';

const TABS = [
  { href: '#/', label: 'Today', Icon: HomeIcon, match: ['today'] },
  { href: '#/log-meal', label: 'Log food', Icon: PlateIcon, match: ['log-meal'] },
  { href: '#/ketones', label: 'Ketones', Icon: DropIcon, match: ['ketones', 'log-ketone'] },
  { href: '#/recipes', label: 'Meal ideas', Icon: BookIcon, match: ['recipes', 'recipe'] },
  { href: '#/progress', label: 'Progress', Icon: ChartIcon, match: ['progress', 'summary'] },
];

export function DemoBanner() {
  return (
    <div className="bg-ink px-4 py-1.5 text-center text-[0.8125rem] font-medium tracking-wide text-white print:border print:border-ink print:bg-white print:text-ink">
      Demo: fictional data, not for clinical use
    </div>
  );
}

export function Layout({ route, children }: { route: Route; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas print:min-h-0 print:bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        Skip to content
      </a>
      <div className="sticky top-[env(safe-area-inset-top,0px)] z-30 print:static">
        <DemoBanner />
        <header className="border-b border-stone-200 bg-canvas/95 backdrop-blur print:hidden">
          <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
            <a href="#/" className="flex items-center gap-2 text-ink no-underline" aria-label="KetoCompanion home">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true">
                  <path d="M6 17c3.5-8 16.5-8 20 0-3.5 6-16.5 6-20 0z" fill="currentColor" />
                </svg>
              </span>
              <span className="text-lg font-bold tracking-tight">KetoCompanion</span>
            </a>
            <a
              href="#/settings"
              className={cx(
                'flex h-11 w-11 items-center justify-center rounded-full text-ink-soft hover:bg-stone-200/60',
                route.name === 'settings' && 'bg-stone-200/70 text-ink',
              )}
              aria-label="Settings"
              aria-current={route.name === 'settings' ? 'page' : undefined}
            >
              <GearIcon />
            </a>
          </div>
        </header>
      </div>

      <main id="main" className="mx-auto max-w-2xl px-4 pb-32 pt-5 print:max-w-none print:p-0">
        {children}
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-5">
          {TABS.map(({ href, label, Icon, match }) => {
            const active = match.includes(route.name);
            return (
              <li key={href}>
                <a
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cx(
                    'flex min-h-[64px] flex-col items-center justify-center gap-1 text-[0.78rem] font-semibold no-underline',
                    active ? 'text-brand-700' : 'text-ink-muted hover:text-ink',
                  )}
                >
                  <span className={cx('flex h-8 w-12 items-center justify-center rounded-full', active && 'bg-brand-100')}>
                    <Icon size={22} />
                  </span>
                  {label}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
