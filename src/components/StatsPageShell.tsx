import type { ReactNode } from 'react';

import type { Locale, MetricsSource } from '../lib/metrics';
import { buildLocalizedHref, formatDateTime } from '../lib/dashboard';

type Section = 'heroes' | 'cards' | 'builds';

type StatsPageShellProps = {
  activeSection: Section;
  locale: Locale;
  eyebrow: string;
  title: string;
  description?: string;
  source: MetricsSource;
  generatedAt: string;
  summary: ReactNode;
  filters: ReactNode;
  children: ReactNode;
};

const NAV_ITEMS: Array<{ key: Section; label: string; href: string }> = [
  { key: 'heroes', label: 'Heroes', href: '/' },
  { key: 'cards', label: 'Cards', href: '/cards' },
  { key: 'builds', label: 'Builds', href: '/builds' },
];

function CalendarIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 text-[color:var(--color-text-muted)]"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
      <path d="M8 2.75v4M16 2.75v4M3.5 9h17M8 13h2.25M13.75 13H16M8 16.5h2.25M13.75 16.5H16" />
    </svg>
  );
}

export default function StatsPageShell({
  activeSection,
  locale,
  eyebrow,
  title,
  description,
  source,
  generatedAt,
  summary,
  filters,
  children,
}: StatsPageShellProps) {
  const hasOverview = Boolean(description || summary);
  const formattedGeneratedAt = formatDateTime(generatedAt);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_50%_-20%,rgba(212,162,76,0.08),transparent_34%),var(--color-bg-base)]">
      <header
        aria-label={eyebrow}
        className="sticky top-0 z-30 border-b border-[color:rgba(58,47,31,0.72)] bg-[linear-gradient(180deg,rgba(20,20,18,0.98),rgba(13,12,10,0.96))] shadow-[0_18px_50px_rgba(0,0,0,0.34)] backdrop-blur"
      >
        <div className="mx-auto grid min-h-[92px] w-full max-w-[1440px] grid-cols-1 items-center gap-4 px-5 py-4 sm:px-8 lg:grid-cols-[minmax(300px,1fr)_auto_minmax(300px,1fr)] lg:py-0">
          <a
            href={buildLocalizedHref('/', { lang: locale })}
            aria-label="BazaarPlusPlus Analytics home"
            className="group flex w-fit items-center gap-4"
          >
            <img
              src="/bazaarplusplus-icon.png"
              alt=""
              className="h-14 w-14 shrink-0 object-cover drop-shadow-[0_0_20px_rgba(212,162,76,0.20)] transition group-hover:drop-shadow-[0_0_24px_rgba(255,210,122,0.32)]"
            />
            <span className="grid w-[196px] gap-1 leading-none">
              <span className="font-serif text-[1.42rem] font-semibold tracking-[0.02em] text-[color:var(--color-accent-bright)]">
                BazaarPlusPlus
              </span>
              <span className="font-serif text-[0.92rem] italic tracking-[0.14em] text-[color:rgba(242,232,213,0.72)]">
                Analytics
              </span>
            </span>
          </a>

          <nav
            aria-label="Primary"
            className="flex min-w-0 flex-wrap items-center gap-x-7 gap-y-2 text-base font-medium text-[color:rgba(242,232,213,0.58)] sm:gap-x-9 lg:justify-center"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.key === activeSection;
              return (
                <a
                  key={item.key}
                  href={buildLocalizedHref(item.href, { lang: locale })}
                  aria-current={active ? 'page' : undefined}
                  className={`relative whitespace-nowrap py-2 transition after:absolute after:-bottom-[22px] after:left-1/2 after:h-[3px] after:w-11 after:-translate-x-1/2 after:rounded-full after:transition sm:after:-bottom-[27px] ${
                    active
                      ? 'text-[color:var(--color-accent-bright)]'
                      : 'after:bg-transparent hover:text-[color:var(--color-text-base)]'
                  } ${
                    active
                      ? 'after:bg-[color:var(--color-accent-bright)] after:shadow-[0_0_16px_rgba(255,210,122,0.55)]'
                      : ''
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[color:var(--color-text-muted)] lg:justify-end">
            <span className="inline-flex items-center gap-2 font-semibold text-[color:var(--color-text-base)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-pos)] shadow-[0_0_14px_rgba(90,169,107,0.62)]" />
              {source === 'local' ? 'Local metrics' : 'Remote metrics'}
            </span>
            <span className="hidden h-7 w-px bg-[color:rgba(58,47,31,0.92)] sm:block" />
            <span className="inline-flex min-w-0 items-center gap-2">
              <CalendarIcon />
              <time dateTime={generatedAt} className="tnum whitespace-nowrap">
                {formattedGeneratedAt}
              </time>
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-8 sm:px-10 sm:py-10">
        {hasOverview ? (
          <section className="grid gap-6 rounded-[24px] border border-[color:var(--color-border)] bg-[linear-gradient(145deg,rgba(212,162,76,0.13),rgba(18,15,11,0.92)_34%,rgba(15,13,10,0.96))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] sm:p-8">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.32em] text-[color:var(--color-text-muted)]">
                {eyebrow}
              </p>
              <h1 className="font-serif text-4xl tracking-tight text-[color:var(--color-accent-bright)] sm:text-5xl">
                {title}
              </h1>
              {description ? (
                <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-text-muted)] sm:text-base">
                  {description}
                </p>
              ) : null}
            </div>

            {summary ? <div className="grid gap-4 sm:grid-cols-3">{summary}</div> : null}
          </section>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}

        {filters}
        {children}
      </main>
    </div>
  );
}
