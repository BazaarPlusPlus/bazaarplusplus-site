import type { ReactNode } from 'react';

import { getSiteCopy } from '../../content/site-copy';
import type { Locale, MetricsSource } from '../lib/metrics';
import { formatDateTime } from '../lib/dashboard';
import FooterCredit from './FooterCredit';
import SiteHeader from './SiteHeader';

type Section = 'heroes' | 'cards' | 'builds';

type StatsPageShellProps = {
  activeSection: Section;
  locale: Locale;
  eyebrow: string;
  title: string;
  source: MetricsSource;
  generatedAt: string;
  filters: ReactNode;
  children: ReactNode;
};

export default function StatsPageShell({
  activeSection,
  locale,
  eyebrow,
  title,
  source,
  generatedAt,
  filters,
  children,
}: StatsPageShellProps) {
  const commonCopy = getSiteCopy(locale).common;
  const formattedGeneratedAt = formatDateTime(generatedAt, locale);

  return (
    <div className="relative min-h-screen">
      <SiteHeader activeSection={activeSection} locale={locale} liveFeedSource={source} />

      <main className="relative mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10 sm:px-10 sm:py-14">
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
                    <span key={`${word}:${i}`} className="text-[color:var(--color-accent-bright)]">
                      {word}
                    </span>
                  ) : (
                    <span key={`${word}:${i}`}>{word} </span>
                  )
                )}
              </h1>
            </div>
          </div>
        </section>

        {filters}
        {children}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)] pt-6 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">
          <FooterCredit locale={locale} />
          <span className="tnum">
            <span className="text-[color:var(--color-text-muted)]">{commonCopy.lastSync}</span> · {formattedGeneratedAt}
          </span>
        </footer>
      </main>
    </div>
  );
}
