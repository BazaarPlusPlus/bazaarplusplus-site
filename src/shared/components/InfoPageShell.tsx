import type { ReactNode } from 'react';

import type { Locale, ResolvedSpaLocation } from '../../app/router';
import FooterCredit from './FooterCredit';
import SiteHeader from './SiteHeader';

type InfoPageShellProps = {
  locale: Locale;
  location: ResolvedSpaLocation;
  eyebrow: string;
  title: string;
  intro?: string;
  children: ReactNode;
};

export default function InfoPageShell({
  locale,
  location,
  eyebrow,
  title,
  intro,
  children,
}: InfoPageShellProps) {
  return (
    <div className="relative min-h-screen">
      <SiteHeader location={location} />

      <main className="relative mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 py-12 sm:px-10 sm:py-16">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -left-12 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.16),transparent_72%)] blur-3xl" />
            <div className="absolute right-0 top-4 h-52 w-52 rounded-full bg-[radial-gradient(circle,rgba(208,90,74,0.06),transparent_72%)] blur-3xl" />
          </div>

          <div className="grid gap-5">
            <div className="max-w-2xl">
              <p className="eyebrow eyebrow-rule">{eyebrow}</p>
              <h1 className="mt-3 font-display text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.025em] text-[color:var(--color-text-base)] sm:text-[2.85rem]">
                {title.split(' ').map((word, index, all) =>
                  index === all.length - 1 ? (
                    <span
                      key={`${word}:${index}`}
                      className="text-[color:var(--color-accent-bright)]"
                    >
                      {word}
                    </span>
                  ) : (
                    <span key={`${word}:${index}`}>{word} </span>
                  )
                )}
              </h1>
              {intro ? (
                <p className="mt-4 max-w-xl text-sm leading-7 text-[color:var(--color-text-muted)]">
                  {intro}
                </p>
              ) : null}
            </div>
          </div>
        </section>

        {children}

        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)] pt-6 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">
          <FooterCredit locale={locale} />
        </footer>
      </main>
    </div>
  );
}
