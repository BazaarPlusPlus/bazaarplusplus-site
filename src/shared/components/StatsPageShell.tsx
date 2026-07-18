import type { ReactNode } from 'react';

import { getSiteCopy } from '../../content/site-copy';
import type { Locale, ResolvedSpaLocation } from '../../app/router';
import { formatDateTime } from '../lib/dashboard';
import FooterCredit from './FooterCredit';
import SiteHeader from './SiteHeader';

type StatsPageShellProps = {
  locale: Locale;
  location: ResolvedSpaLocation;
  eyebrow: string;
  title: string;
  generatedAt: string;
  actions?: ReactNode;
  filters: ReactNode;
  children: ReactNode;
};

export default function StatsPageShell({
  locale,
  location,
  eyebrow,
  title,
  generatedAt,
  actions,
  filters,
  children,
}: StatsPageShellProps) {
  const commonCopy = getSiteCopy(locale).common;
  const formattedGeneratedAt = formatDateTime(generatedAt, locale);

  return (
    <div className="relative min-h-screen">
      <SiteHeader location={location} />

      <main className="relative mx-auto flex min-w-0 w-full max-w-[1440px] flex-col gap-10 px-6 py-8 sm:w-[calc(100%-5rem)] sm:px-10 sm:py-10 2xl:px-12">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-12 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.14),transparent_70%)] blur-3xl" />
            <div className="absolute right-0 top-0 h-48 w-48 rounded-full bg-[radial-gradient(circle,rgba(208,90,74,0.06),transparent_70%)] blur-3xl" />
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-3xl">
              <p className="eyebrow eyebrow-rule">{eyebrow}</p>
              <h1 className="mt-3 font-display text-[2.2rem] font-semibold leading-[1.05] tracking-[-0.025em] text-[color:var(--color-text-base)] sm:text-[2.7rem]">
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

            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center gap-3">
                {actions}
              </div>
            ) : null}
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
