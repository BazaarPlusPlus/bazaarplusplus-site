import type { ReactNode } from 'react';

import type { Locale, MetricsSource } from '../lib/metrics';
import { buildLocalizedHref, formatDateTime } from '../lib/dashboard';

type Section = 'heroes' | 'cards' | 'builds';

type StatsPageShellProps = {
  activeSection: Section;
  locale: Locale;
  eyebrow: string;
  title: string;
  source: MetricsSource;
  generatedAt: string;
  summary: ReactNode;
  filters: ReactNode;
  children: ReactNode;
};

const NAV_ITEMS: Array<{ key: Section; label: string; numeral: string; href: string }> = [
  { key: 'heroes', label: 'Heroes', numeral: 'I', href: '/' },
  { key: 'cards', label: 'Cards', numeral: 'II', href: '/cards' },
  { key: 'builds', label: 'Builds', numeral: 'III', href: '/builds' },
];

export default function StatsPageShell({
  activeSection,
  locale,
  eyebrow,
  title,
  source,
  generatedAt,
  summary,
  filters,
  children,
}: StatsPageShellProps) {
  const hasOverview = Boolean(summary);
  const formattedGeneratedAt = formatDateTime(generatedAt);

  return (
    <div className="relative min-h-screen">
      <header
        aria-label={eyebrow}
        className="sticky top-0 z-30 border-b border-[color:var(--color-border-soft)] bg-[linear-gradient(180deg,rgba(15,12,8,0.96),rgba(10,8,5,0.92))] backdrop-blur-md"
      >
        <div className="pointer-events-none absolute inset-x-0 -bottom-px h-px bg-gradient-to-r from-transparent via-[color:var(--color-accent-glow)] to-transparent" />
        <div className="mx-auto grid w-full max-w-[1440px] items-center gap-4 px-6 py-4 sm:px-10 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          <a
            href={buildLocalizedHref('/', { lang: locale })}
            aria-label="BazaarPlusPlus Analytics home"
            className="group flex w-fit items-center gap-3"
          >
            <span className="relative flex h-11 w-11 shrink-0 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.32),transparent_72%)] blur-md transition-opacity group-hover:opacity-100" />
              <img
                src="/bazaarplusplus-icon.png"
                alt=""
                className="relative h-11 w-11 object-contain drop-shadow-[0_0_18px_rgba(232,185,74,0.32)]"
              />
            </span>
            <span className="grid leading-none">
              <span className="font-display text-[1.32rem] font-semibold tracking-[-0.01em] text-[color:var(--color-accent-bright)]">
                BazaarPlusPlus
              </span>
              <span className="font-display-italic text-[0.78rem] font-medium tracking-[0.32em] text-[color:var(--color-text-muted)]">
                · analytics ·
              </span>
            </span>
          </a>

          <nav aria-label="Primary" className="flex min-w-0 items-center justify-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.key === activeSection;
              return (
                <a
                  key={item.key}
                  href={buildLocalizedHref(item.href, { lang: locale })}
                  aria-current={active ? 'page' : undefined}
                  className={`group relative inline-flex items-center gap-2.5 rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? 'text-[color:var(--color-accent-bright)]'
                      : 'text-[color:var(--color-text-muted)] hover:text-[color:var(--color-text-base)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`font-display-italic text-[0.7rem] tracking-[0.18em] transition ${
                      active
                        ? 'text-[color:var(--color-accent)]'
                        : 'text-[color:var(--color-text-faint)] group-hover:text-[color:var(--color-text-muted)]'
                    }`}
                  >
                    {item.numeral}
                  </span>
                  <span className="tracking-[0.06em]">{item.label}</span>
                  {active ? (
                    <span className="pointer-events-none absolute inset-x-3 -bottom-[18px] h-[2px] rounded-full bg-[color:var(--color-accent)] shadow-[0_0_14px_rgba(232,185,74,0.55)]" />
                  ) : null}
                </a>
              );
            })}
          </nav>

          <div className="flex min-w-0 items-center justify-end gap-4 text-xs text-[color:var(--color-text-muted)]">
            <span className="inline-flex items-center gap-2 font-medium uppercase tracking-[0.16em]">
              <span className="relative flex h-2 w-2">
                <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-pos)] opacity-50" />
                <span className="relative h-2 w-2 rounded-full bg-[color:var(--color-pos)] shadow-[0_0_10px_rgba(109,191,122,0.7)]" />
              </span>
              <span className="text-[color:var(--color-text-base)]">
                {source === 'local' ? 'Local feed' : 'Live feed'}
              </span>
            </span>
            <span className="hidden h-4 w-px bg-[color:var(--color-border-soft)] sm:block" />
            <time
              dateTime={generatedAt}
              className="hidden font-mono text-[0.72rem] tracking-[0.04em] text-[color:var(--color-text-muted)] sm:inline tnum"
            >
              {formattedGeneratedAt}
            </time>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
        {hasOverview ? (
          <section className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.14),transparent_70%)] blur-3xl" />
              <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(208,90,74,0.06),transparent_70%)] blur-3xl" />
            </div>

            <div className="grid gap-8">
              <div className="max-w-3xl">
                <p className="eyebrow eyebrow-rule">{eyebrow}</p>
                <h1 className="mt-3 font-display text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.025em] text-[color:var(--color-text-base)] sm:text-[3.2rem]">
                  {title.split(' ').map((word, i, arr) =>
                    i === arr.length - 1 ? (
                      <span key={`${word}:${i}`} className="font-display-italic text-[color:var(--color-accent-bright)]">
                        {word}
                      </span>
                    ) : (
                      <span key={`${word}:${i}`}>{word} </span>
                    )
                  )}
                </h1>
              </div>

              {summary ? <div className="grid gap-4 sm:grid-cols-3">{summary}</div> : null}
            </div>
          </section>
        ) : (
          <h1 className="sr-only">{title}</h1>
        )}

        {filters}
        {children}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)] pt-6 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">
          <span className="font-display-italic normal-case tracking-[0.08em]">
            BazaarPlusPlus · the bazaar runs on numbers
          </span>
          <span className="tnum">
            <span className="text-[color:var(--color-text-muted)]">last sync</span> · {formattedGeneratedAt}
          </span>
        </footer>
      </main>
    </div>
  );
}
