import { useQuery } from '@tanstack/react-query';

import InfoPageShell from '../../shared/components/InfoPageShell';
import {
  buildPreviewDownloadUrl,
  buildDownloadUrl,
  fetchLatestVersion,
  fetchPreviewVersion,
  GITHUB_RELEASE_URL,
} from './installer';
import type { Locale } from '../../shared/lib/metrics';
import { buildLocalizedHref } from '../../shared/lib/dashboard';
import { macIconDataUri, windowsIconDataUri } from './platform-icons';
import { getSiteCopy, type DownloadPageCopy } from '../../content/site-copy';

type PlatformCopy = DownloadPageCopy['windows'];

type DownloadCardProps = {
  iconSrc: string;
  copy: PlatformCopy;
  version: string | undefined;
  downloadUrl: string | undefined;
  isLoading: boolean;
  isError: boolean;
  versionLabel: string;
  versionPending: string;
  versionUnavailable: string;
};

function DownloadCard({
  iconSrc,
  copy,
  version,
  downloadUrl,
  isLoading,
  isError,
  versionLabel,
  versionPending,
  versionUnavailable,
}: DownloadCardProps) {
  const disabled = !downloadUrl;

  return (
    <article className="surface relative flex flex-col gap-6 p-7">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--color-border-soft)] bg-[rgba(232,185,74,0.04)]">
            <img src={iconSrc} alt="" aria-hidden="true" className="h-9 w-9 opacity-90" />
          </span>
          <div>
            <h2 className="font-display text-[1.55rem] font-semibold leading-tight text-[color:var(--color-text-base)]">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[color:var(--color-text-muted)]">
              {copy.arch}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[0.7rem] uppercase tracking-[0.18em] text-[color:var(--color-text-faint)]">
          {versionLabel}
        </span>
        {isLoading ? (
          <span className="inline-block h-5 w-24 overflow-hidden rounded-full bg-[color:var(--color-border-soft)]">
            <span className="shimmer block h-full w-full" />
          </span>
        ) : version ? (
          <span className="tnum text-xl font-medium text-[color:var(--color-accent-bright)]">
            v{version}
          </span>
        ) : isError ? (
          <span className="text-sm text-[color:var(--color-text-muted)]">{versionUnavailable}</span>
        ) : (
          <span className="text-sm text-[color:var(--color-text-muted)]">{versionPending}</span>
        )}
      </div>

      <a
        href={downloadUrl ?? '#'}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : undefined}
        onClick={disabled ? (event) => event.preventDefault() : undefined}
        className={`group inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-medium tracking-[0.04em] transition ${
          disabled
            ? 'pointer-events-none cursor-not-allowed bg-[color:var(--color-border-soft)] text-[color:var(--color-text-faint)]'
            : 'bg-[color:var(--color-accent)] text-[#1a1306] shadow-[0_18px_36px_-12px_rgba(232,185,74,0.5)] hover:bg-[color:var(--color-accent-bright)]'
        }`}
      >
        <span>{copy.actionLabel}</span>
        <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
      </a>

    </article>
  );
}

type DownloadPageContentProps = {
  locale: Locale;
  variant?: 'latest' | 'preview';
};

function FailureFallback({ copy, variant }: { copy: DownloadPageCopy; variant: 'latest' | 'preview' }) {
  if (variant === 'preview') {
    return (
      <p className="-mt-4 text-sm leading-6 text-[color:var(--color-text-muted)]">
        {copy.preview.versionFailed}
      </p>
    );
  }

  return (
    <p className="-mt-4 text-sm leading-6 text-[color:var(--color-text-muted)]">
      {copy.versionFailed}
      {' · '}
      {copy.releaseFallbackPrefix}
      <a
        href={GITHUB_RELEASE_URL}
        target="_blank"
        rel="noreferrer"
        className="text-[color:var(--color-accent-bright)] underline-offset-4 hover:underline"
      >
        {copy.releaseFallbackLink}
      </a>
    </p>
  );
}

function PreviewDownloadCta({ copy, locale }: { copy: DownloadPageCopy['previewCta']; locale: Locale }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[color:var(--color-border-bright)] bg-[linear-gradient(135deg,rgba(255,245,220,0.045),rgba(232,185,74,0.025)_48%,rgba(90,138,134,0.055))] px-5 py-5 shadow-[0_22px_70px_-54px_rgba(232,185,74,0.9)] sm:px-6">
      <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(232,185,74,0.12),transparent_68%)] blur-2xl" />
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[rgba(232,185,74,0.28)] bg-[rgba(232,185,74,0.08)] text-[color:var(--color-accent-bright)]"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.7"
            >
              <path d="M12 3v10" />
              <path d="m7.5 9.5 4.5 4.5 4.5-4.5" />
              <path d="M5 19h14" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-accent-bright)]">
              {copy.eyebrow}
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold leading-tight text-[color:var(--color-text-base)]">
              {copy.title}
            </h2>
          </div>
        </div>
        <a
          href={buildLocalizedHref('/download/preview', { lang: locale })}
          className="group inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[color:var(--color-border-bright)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)] hover:bg-[rgba(232,185,74,0.08)] hover:text-[color:var(--color-text-base)]"
        >
          <span>{copy.actionLabel}</span>
          <span aria-hidden="true" className="transition group-hover:translate-x-0.5">→</span>
        </a>
      </div>
    </section>
  );
}

export default function DownloadPage({ locale, variant = 'latest' }: DownloadPageContentProps) {
  const copy = getSiteCopy(locale).download;
  const isPreview = variant === 'preview';
  const { data, isLoading, isError } = useQuery({
    queryKey: [isPreview ? 'preview-version' : 'latest-version'],
    queryFn: ({ signal }) => isPreview ? fetchPreviewVersion(signal) : fetchLatestVersion(signal),
    staleTime: 5 * 60_000,
  });

  const version = data?.version;
  const windowsUrl = version
    ? isPreview
      ? buildPreviewDownloadUrl('windows', version)
      : buildDownloadUrl('windows', version)
    : undefined;
  const macUrl = version
    ? isPreview
      ? buildPreviewDownloadUrl('mac', version)
      : buildDownloadUrl('mac', version)
    : undefined;

  return (
    <InfoPageShell
      activeSection="download"
      locale={locale}
      eyebrow={isPreview ? copy.preview.eyebrow : copy.eyebrow}
      title={isPreview ? copy.preview.title : copy.title}
    >
      <section className="flex flex-col gap-6">
        {isPreview ? (
          <div
            role="note"
            className="relative overflow-hidden rounded-2xl border border-[rgba(208,90,74,0.58)] bg-[linear-gradient(135deg,rgba(96,35,28,0.48),rgba(26,14,12,0.92)_52%,rgba(20,12,10,0.88))] py-5 pl-7 pr-6 shadow-[0_24px_70px_-48px_rgba(208,90,74,0.95)]"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[5px] bg-[color:var(--color-neg)] shadow-[0_0_24px_rgba(208,90,74,0.9)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-12 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(208,90,74,0.24),transparent_68%)] blur-2xl"
            />
            <div className="relative grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[rgba(208,90,74,0.55)] bg-[rgba(208,90,74,0.16)] text-[color:var(--color-neg)] shadow-[0_0_28px_-14px_rgba(208,90,74,0.95)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M10.3 3.6 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.6a2 2 0 0 0-3.4 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13.5" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h2 className="eyebrow text-[color:var(--color-neg)]">
                    {copy.preview.cautionTitle}
                  </h2>
                  {version ? (
                    <span className="tnum rounded-full border border-[rgba(208,90,74,0.48)] bg-[rgba(208,90,74,0.12)] px-2.5 py-0.5 text-[0.7rem] font-medium tracking-[0.02em] text-[color:var(--color-neg)]">
                      v{version}
                    </span>
                  ) : null}
                </div>
                <p className="max-w-4xl text-sm leading-7 text-[color:var(--color-text-base)]/90">
                  {copy.preview.cautionLead}
                </p>
                <ul className="grid gap-2 text-sm leading-6 text-[color:var(--color-text-muted)] md:grid-cols-3">
                  {copy.preview.cautionItems.map((item) => (
                    <li
                      key={item}
                      className="flex gap-2 rounded-lg border border-[rgba(208,90,74,0.18)] bg-[rgba(5,7,10,0.2)] px-3 py-2"
                    >
                      <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--color-neg)]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-3 border-t border-[rgba(208,90,74,0.18)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[rgba(208,90,74,0.24)] bg-[rgba(208,90,74,0.08)] text-[color:var(--color-neg)]">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.7"
                        aria-hidden="true"
                      >
                        <path d="M5.5 5.5h13A2.5 2.5 0 0 1 21 8v7.2a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3v-3H5.5A2.5 2.5 0 0 1 3 15.2V8a2.5 2.5 0 0 1 2.5-2.5Z" />
                        <path d="M7.5 10h9" />
                        <path d="M7.5 13.5h5.5" />
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold tracking-[0.08em] text-[color:var(--color-neg)]">
                        {copy.preview.cautionFeedback.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[color:var(--color-text-muted)]">
                        {copy.preview.cautionFeedback.body}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 rounded-lg border border-[rgba(208,90,74,0.2)] bg-[rgba(5,7,10,0.22)] px-3 py-2">
                    <span className="text-[0.68rem] uppercase tracking-[0.12em] text-[color:var(--color-text-faint)]">
                      {copy.preview.cautionFeedback.groupLabel}
                    </span>
                    <span className="tnum text-sm font-semibold text-[color:var(--color-text-base)]">
                      {copy.preview.cautionFeedback.groupValue}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        <div className="grid gap-6 md:grid-cols-2">
          <DownloadCard
            iconSrc={windowsIconDataUri}
            copy={copy.windows}
            version={version}
            downloadUrl={windowsUrl}
            isLoading={isLoading}
            isError={isError}
            versionLabel={isPreview ? copy.preview.versionLabel : copy.versionLabel}
            versionPending={isPreview ? copy.preview.versionPending : copy.versionPending}
            versionUnavailable={isPreview ? copy.preview.versionUnavailable : copy.versionUnavailable}
          />
          <DownloadCard
            iconSrc={macIconDataUri}
            copy={copy.mac}
            version={version}
            downloadUrl={macUrl}
            isLoading={isLoading}
            isError={isError}
            versionLabel={isPreview ? copy.preview.versionLabel : copy.versionLabel}
            versionPending={isPreview ? copy.preview.versionPending : copy.versionPending}
            versionUnavailable={isPreview ? copy.preview.versionUnavailable : copy.versionUnavailable}
          />
        </div>
        {!isPreview ? <PreviewDownloadCta copy={copy.previewCta} locale={locale} /> : null}
        {isError ? <FailureFallback copy={copy} variant={variant} /> : null}
      </section>

      <section className="surface-flat flex flex-col gap-3 px-6 py-6">
        <h2 className="font-display text-lg font-semibold tracking-tight text-[color:var(--color-text-base)]">
          {copy.noteTitle}
        </h2>
        <ul className="flex flex-col gap-2 text-sm leading-6 text-[color:var(--color-text-muted)]">
          {copy.noteParagraphs.map((paragraph, index) => (
            <li key={index} className="flex items-start gap-3">
              <span aria-hidden="true" className="mt-2 inline-block h-1 w-1 rounded-full bg-[color:var(--color-accent)]" />
              <span>{paragraph}</span>
            </li>
          ))}
        </ul>
      </section>
    </InfoPageShell>
  );
}
