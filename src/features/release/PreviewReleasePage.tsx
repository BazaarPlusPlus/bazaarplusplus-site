import type { ReactElement } from 'react';

import { getSiteCopy, type PreviewReleasePageCopy } from '../../content/site-copy';
import FooterCredit from '../../shared/components/FooterCredit';
import SiteHeader from '../../shared/components/SiteHeader';
import { buildLocalizedHref } from '../../shared/lib/dashboard';
import type { Locale } from '../../shared/lib/metrics';

type FeatureIconName = PreviewReleasePageCopy['features'][number]['icon'];

const iconPaths: Record<FeatureIconName, ReactElement> = {
  almanac: (
    <>
      <path d="M7 4.5h8.6a2.4 2.4 0 0 1 2.4 2.4v13.6H8.4A2.4 2.4 0 0 1 6 18.1V6.5a2 2 0 0 1 2-2Z" />
      <path d="M10 8h5" />
      <path d="M10 11h6" />
      <path d="M10 15.5h4" />
      <path d="M6 18.1c0-1.2 1-2.1 2.4-2.1H18" />
    </>
  ),
  enchant: (
    <>
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="m6 17 .8 2.2L9 20l-2.2.8L6 23l-.8-2.2L3 20l2.2-.8L6 17Z" />
      <path d="M18 16.5 19 19l2.5 1-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1 1-2.5Z" />
    </>
  ),
  compact: (
    <>
      <path d="M4 8.5h16" />
      <path d="M7 6v5" />
      <path d="M12 6v5" />
      <path d="M17 6v5" />
      <path d="M6 15h8" />
      <path d="M17 15h1" />
      <path d="M6 19h3" />
      <path d="M12 19h6" />
    </>
  ),
  icons: (
    <>
      <path d="M8.5 4.5h7l4 4v7l-4 4h-7l-4-4v-7l4-4Z" />
      <path d="M12 7.4v5.2l3.5 2" />
      <path d="M7.8 12h2" />
      <path d="M14.2 12h2" />
    </>
  ),
  record: (
    <>
      <path d="M4.5 7.5A2.5 2.5 0 0 1 7 5h7a2.5 2.5 0 0 1 2.5 2.5v9A2.5 2.5 0 0 1 14 19H7a2.5 2.5 0 0 1-2.5-2.5v-9Z" />
      <path d="m16.5 10 4-2.2v8.4l-4-2.2" />
      <path d="M9.2 9.2h.1" />
      <path d="M10.5 14.3a2.4 2.4 0 1 0 0-4.8 2.4 2.4 0 0 0 0 4.8Z" />
    </>
  ),
  installer: (
    <>
      <path d="M5.5 4.5h13A1.5 1.5 0 0 1 20 6v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V6a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M4 8h16" />
      <path d="M8 12h8" />
      <path d="M8 15h5" />
      <path d="M7 6.2h.1" />
      <path d="M10 6.2h.1" />
    </>
  ),
};

function ReleaseIcon({ name }: { name: FeatureIconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
    >
      {iconPaths[name]}
    </svg>
  );
}

export default function PreviewReleasePage({ locale }: { locale: Locale }) {
  const copy = getSiteCopy(locale).releasePreview;
  const downloadHref = buildLocalizedHref('/download/preview', { lang: locale });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#0a0d11_0%,#07090c_46%,#100b07_100%)]">
      <SiteHeader activeSection="download" locale={locale} />

      <main>
        <section className="relative mx-auto grid w-full max-w-[1440px] items-center gap-10 px-6 py-10 sm:px-10 lg:min-h-[560px] lg:grid-cols-[0.92fr_1.08fr] lg:py-12">
          <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[42rem] bg-[radial-gradient(circle_at_22%_12%,rgba(232,185,74,0.12),transparent_34%),radial-gradient(circle_at_84%_18%,rgba(90,138,134,0.14),transparent_36%)]" />
          <div className="max-w-2xl">
            <h1 className="font-display text-[3.05rem] font-semibold leading-[0.98] text-[color:var(--color-text-base)] sm:text-[4.35rem] lg:text-[5.2rem]">
              <span className="block">{copy.hero.titleLead}</span>
              <span className="block text-[color:var(--color-accent-bright)]">
                {copy.hero.titleAccent}
              </span>
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[color:var(--color-text-muted)]">
              <span className="tnum text-[color:var(--color-accent-bright)]">
                {copy.hero.date}
              </span>
              <span aria-hidden="true" className="h-px w-16 bg-[color:var(--color-border-bright)]" />
              <span>{copy.hero.releaseType}</span>
            </div>
            <p className="mt-6 max-w-xl text-base leading-8 text-[color:var(--color-text-muted)] sm:text-lg">
              {copy.hero.deck}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href={downloadHref}
                className="group inline-flex items-center justify-center gap-3 rounded-lg border border-[rgba(232,185,74,0.55)] bg-[linear-gradient(180deg,#e8b94a,#bc8424)] px-6 py-3.5 text-sm font-semibold text-[#170f05] shadow-[0_20px_44px_-18px_rgba(232,185,74,0.7)] transition hover:border-[color:var(--color-accent-bright)] hover:bg-[linear-gradient(180deg,#ffd47a,#d2992e)]"
              >
                <span>{copy.hero.primaryActionLabel}</span>
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="h-5 w-5 transition group-hover:translate-y-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                >
                  <path d="M12 4v10" />
                  <path d="m7 10 5 5 5-5" />
                  <path d="M5 20h14" />
                </svg>
              </a>
              <a
                href="#release-notes"
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--color-border-soft)] bg-[rgba(255,245,220,0.035)] px-5 py-3 text-sm font-medium text-[color:var(--color-text-base)] transition hover:border-[color:var(--color-border-bright)] hover:text-[color:var(--color-accent-bright)]"
              >
                {copy.hero.secondaryActionLabel}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-2 rounded-xl border border-[rgba(232,185,74,0.16)] bg-[radial-gradient(circle_at_54%_44%,rgba(232,185,74,0.10),transparent_58%)] shadow-[0_40px_90px_-48px_rgba(0,0,0,0.9)] sm:-inset-5" />
            <img
              src="/preview-release-hero.png"
              alt=""
              aria-hidden="true"
              decoding="async"
              className="relative aspect-[16/9] w-full rounded-lg border border-[rgba(232,185,74,0.25)] object-cover shadow-[0_34px_80px_-40px_rgba(0,0,0,0.95)]"
            />
          </div>
        </section>

        <section
          id="release-notes"
          className="mx-auto flex w-full max-w-[1320px] flex-col gap-8 px-6 pb-16 pt-4 sm:px-10 lg:pb-20"
        >
          <header className="flex flex-col justify-between gap-4 border-y border-[color:var(--color-border-soft)] py-6 sm:flex-row sm:items-end">
            <div>
              <p className="font-display-italic text-sm uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
                {copy.notes.kicker}
              </p>
              <h2 className="mt-2 font-display text-[2.35rem] font-semibold leading-tight text-[color:var(--color-text-base)] sm:text-[3rem]">
                {copy.notes.title}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-[color:var(--color-text-muted)]">
              {copy.notes.intro}
            </p>
          </header>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
            <section className="rounded-lg border border-[color:var(--color-border-soft)] bg-[rgba(10,13,17,0.78)] p-5 shadow-[0_26px_70px_-44px_rgba(0,0,0,0.85)] sm:p-7">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(232,185,74,0.34)] text-[color:var(--color-accent)]">
                  1
                </span>
                <h3 className="font-display text-2xl font-semibold text-[color:var(--color-accent-bright)]">
                  {copy.featureSectionTitle}
                </h3>
              </div>
              <div className="mt-6 grid gap-3">
                {copy.features.map((feature, index) => (
                  <article
                    key={feature.title}
                    className="grid gap-4 rounded-lg border border-[rgba(232,185,74,0.16)] bg-[linear-gradient(180deg,rgba(255,245,220,0.035),rgba(255,245,220,0.012))] p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:p-5"
                  >
                    <div className="flex items-center gap-3 sm:block">
                      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(232,185,74,0.26)] bg-[rgba(232,185,74,0.07)] text-[color:var(--color-accent-bright)]">
                        <ReleaseIcon name={feature.icon} />
                      </span>
                      <span className="tnum text-sm uppercase tracking-[0.22em] text-[color:var(--color-text-faint)] sm:mt-3 sm:block">
                        {String.fromCharCode(97 + index)}
                      </span>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold leading-tight text-[color:var(--color-text-base)]">
                        {feature.title}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-muted)]">
                        {feature.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="grid gap-6">
              <section className="rounded-lg border border-[color:var(--color-border-soft)] bg-[rgba(18,15,12,0.76)] p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(232,185,74,0.34)] text-[color:var(--color-accent)]">
                    2
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-[color:var(--color-accent-bright)]">
                    {copy.interfaceSection.title}
                  </h3>
                </div>
                <article className="mt-6 rounded-lg border border-[rgba(232,185,74,0.16)] bg-[rgba(255,245,220,0.03)] p-5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[rgba(90,138,134,0.38)] bg-[rgba(90,138,134,0.12)] text-[color:var(--color-cool)]">
                    <ReleaseIcon name="installer" />
                  </span>
                  <h4 className="mt-4 text-lg font-semibold text-[color:var(--color-text-base)]">
                    {copy.interfaceSection.itemTitle}
                  </h4>
                  <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-muted)]">
                    {copy.interfaceSection.itemDescription}
                  </p>
                </article>
              </section>

              <section className="rounded-lg border border-[rgba(208,90,74,0.38)] bg-[linear-gradient(180deg,rgba(96,35,28,0.33),rgba(20,12,10,0.78))] p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-md border border-[rgba(208,90,74,0.48)] text-[color:var(--color-neg)]">
                    3
                  </span>
                  <h3 className="font-display text-2xl font-semibold text-[color:var(--color-text-base)]">
                    {copy.previewSection.title}
                  </h3>
                </div>
                <div className="mt-5 grid gap-4">
                  {copy.previewSection.items.map((item) => (
                    <article
                      key={item.title}
                      className="rounded-lg border border-[rgba(255,245,220,0.09)] bg-[rgba(5,7,10,0.38)] p-4"
                    >
                      <h4 className="font-semibold text-[color:var(--color-accent-bright)]">
                        {item.title}
                      </h4>
                      <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-muted)]">
                        {item.body}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </div>

          <section className="rounded-lg border border-[rgba(232,185,74,0.24)] bg-[rgba(255,245,220,0.035)] p-5 sm:p-7">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div className="min-w-0">
                <h2 className="font-display text-2xl font-semibold text-[color:var(--color-text-base)]">
                  {copy.downloadCallout.title}
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--color-text-muted)]">
                  {copy.downloadCallout.body}
                </p>
                <p className="tnum mt-3 break-all text-sm text-[color:var(--color-accent-bright)]">
                  {copy.downloadCallout.urlText}
                </p>
              </div>
              <a
                href={downloadHref}
                className="inline-flex items-center justify-center rounded-lg border border-[color:var(--color-border-bright)] px-5 py-3 text-sm font-semibold text-[color:var(--color-accent-bright)] transition hover:bg-[rgba(232,185,74,0.08)]"
              >
                {copy.downloadCallout.actionLabel}
              </a>
            </div>
          </section>
        </section>
      </main>

      <footer className="mx-auto flex w-full max-w-[1320px] flex-wrap items-center justify-between gap-3 border-t border-[color:var(--color-border-soft)] px-6 py-8 text-[0.72rem] uppercase tracking-[0.18em] text-[color:var(--color-text-faint)] sm:px-10">
        <FooterCredit locale={locale} />
      </footer>
    </div>
  );
}
