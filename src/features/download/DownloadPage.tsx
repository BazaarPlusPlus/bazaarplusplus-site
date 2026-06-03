import { useQuery } from '@tanstack/react-query';

import InfoPageShell from '../../shared/components/InfoPageShell';
import {
  buildDownloadUrl,
  fetchLatestVersion,
  GITHUB_RELEASE_URL,
} from './installer';
import type { Locale } from '../../shared/lib/metrics';
import { macIconDataUri, windowsIconDataUri } from './platform-icons';
import { getSiteCopy, type DownloadPageCopy } from '../../content/site-copy';

type PlatformCopy = DownloadPageCopy['windows'];

const PREVIEW_DOWNLOADS = {
  version: '4.0.0',
  windowsUrl:
    'https://bppinstaller.bazaarplusplus.com/preview/4.0.0/windows-x86_64/BazaarPlusPlus_4.0.0_x64-setup.exe',
  macUrl:
    'https://bppinstaller.bazaarplusplus.com/preview/4.0.0/darwin-aarch64/BazaarPlusPlus_4.0.0_aarch64.dmg',
} as const;

type DownloadCardProps = {
  iconSrc: string;
  copy: PlatformCopy;
  version: string | undefined;
  downloadUrl: string | undefined;
  isLoading: boolean;
  versionLabel: string;
  versionPending: string;
};

function DownloadCard({
  iconSrc,
  copy,
  version,
  downloadUrl,
  isLoading,
  versionLabel,
  versionPending,
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

function FailureFallback({ copy }: { copy: DownloadPageCopy }) {
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

export default function DownloadPage({ locale, variant = 'latest' }: DownloadPageContentProps) {
  const copy = getSiteCopy(locale).download;
  const isPreview = variant === 'preview';
  const { data, isLoading, isError } = useQuery({
    queryKey: ['latest-version'],
    queryFn: ({ signal }) => fetchLatestVersion(signal),
    enabled: !isPreview,
    staleTime: 5 * 60_000,
  });

  const version = isPreview ? PREVIEW_DOWNLOADS.version : data?.version;
  const windowsUrl = isPreview
    ? PREVIEW_DOWNLOADS.windowsUrl
    : version
      ? buildDownloadUrl('windows', version)
      : undefined;
  const macUrl = isPreview
    ? PREVIEW_DOWNLOADS.macUrl
    : version
      ? buildDownloadUrl('mac', version)
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
            className="surface relative overflow-hidden py-5 pl-7 pr-6"
          >
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 w-[3px] bg-[color:var(--color-warn)]"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-[radial-gradient(circle,rgba(230,182,74,0.12),transparent_70%)] blur-2xl"
            />
            <div className="relative flex items-start gap-4">
              <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(230,182,74,0.4)] bg-[rgba(230,182,74,0.1)] text-[color:var(--color-warn)]">
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
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="eyebrow text-[color:var(--color-warn)]">
                    {copy.preview.cautionTitle}
                  </h2>
                  {version ? (
                    <span className="tnum rounded-full border border-[rgba(230,182,74,0.4)] px-2.5 py-0.5 text-[0.7rem] font-medium tracking-[0.02em] text-[color:var(--color-warn)]">
                      v{version}
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-sm leading-7 text-[color:var(--color-text-muted)]">
                  {copy.preview.cautionBody}
                </p>
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
            isLoading={!isPreview && isLoading}
            versionLabel={isPreview ? copy.preview.versionLabel : copy.versionLabel}
            versionPending={copy.versionPending}
          />
          <DownloadCard
            iconSrc={macIconDataUri}
            copy={copy.mac}
            version={version}
            downloadUrl={macUrl}
            isLoading={!isPreview && isLoading}
            versionLabel={isPreview ? copy.preview.versionLabel : copy.versionLabel}
            versionPending={copy.versionPending}
          />
        </div>
        {!isPreview && isError ? <FailureFallback copy={copy} /> : null}
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
