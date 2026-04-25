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
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 sm:px-10">
      <section className="grid gap-6 rounded-[28px] border border-[color:var(--color-border)] bg-[linear-gradient(145deg,rgba(212,162,76,0.16),rgba(15,13,10,0.92)_32%,rgba(15,13,10,0.96))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.35em] text-[color:var(--color-text-muted)]">
              <span>{eyebrow}</span>
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.key}
                  href={buildLocalizedHref(item.href, { lang: locale })}
                  className={`tracking-[0.2em] ${
                    item.key === activeSection
                      ? 'text-[color:var(--color-accent-bright)]'
                      : 'hover:text-[color:var(--color-text-base)]'
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </div>
            <h1 className="font-serif text-4xl tracking-tight text-[color:var(--color-accent-bright)] sm:text-5xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-sm leading-6 text-[color:var(--color-text-muted)] sm:text-base">
                {description}
              </p>
            ) : null}
          </div>

          <div className="grid gap-3 text-right">
            <span className="inline-flex items-center justify-end gap-2 text-sm text-[color:var(--color-text-base)]">
              <span className="h-2.5 w-2.5 rounded-full bg-[color:var(--color-pos)]" />
              {source === 'local' ? 'Local metrics' : 'Remote metrics'}
            </span>
            <span className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
              Generated {formatDateTime(generatedAt)}
            </span>
          </div>
        </div>

        {summary ? <div className="grid gap-4 sm:grid-cols-3">{summary}</div> : null}
      </section>

      {filters}
      {children}
    </main>
  );
}
