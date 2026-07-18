import { useQuery } from '@tanstack/react-query';

import InfoPageShell from '../../shared/components/InfoPageShell';
import type { ResolvedSpaLocation } from '../../app/router';
import {
  buildDownloadUrl,
  fetchLatestVersion,
  GITHUB_RELEASE_URL,
} from './installer';
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
  location: ResolvedSpaLocation;
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

export default function DownloadPage({ location }: DownloadPageContentProps) {
  const { locale } = location;
  const copy = getSiteCopy(locale).download;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['latest-version'],
    queryFn: ({ signal }) => fetchLatestVersion(signal),
    staleTime: 5 * 60_000,
  });

  const version = data?.version;
  const windowsUrl = version ? buildDownloadUrl('windows', version) : undefined;
  const macUrl = version ? buildDownloadUrl('mac', version) : undefined;

  return (
    <InfoPageShell
      locale={locale}
      location={location}
      eyebrow={copy.eyebrow}
      title={copy.title}
    >
      <section className="flex flex-col gap-6">
        <div className="grid gap-6 md:grid-cols-2">
          <DownloadCard
            iconSrc={windowsIconDataUri}
            copy={copy.windows}
            version={version}
            downloadUrl={windowsUrl}
            isLoading={isLoading}
            isError={isError}
            versionLabel={copy.versionLabel}
            versionPending={copy.versionPending}
            versionUnavailable={copy.versionUnavailable}
          />
          <DownloadCard
            iconSrc={macIconDataUri}
            copy={copy.mac}
            version={version}
            downloadUrl={macUrl}
            isLoading={isLoading}
            isError={isError}
            versionLabel={copy.versionLabel}
            versionPending={copy.versionPending}
            versionUnavailable={copy.versionUnavailable}
          />
        </div>
        {isError ? <FailureFallback copy={copy} /> : null}
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
