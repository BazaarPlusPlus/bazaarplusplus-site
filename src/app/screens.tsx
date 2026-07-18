import { getSiteCopy } from '../content/site-copy';
import type { HeroMetricsLoadProgress } from '../features/heroes/hero-metrics-dataset';
import type { Locale, ResolvedSpaLocation } from './router';

type LoadingScreenProps = {
  locale?: Locale;
  progress?: HeroMetricsLoadProgress;
};

function renderProgressLabel(progress: HeroMetricsLoadProgress, locale: Locale): string {
  const copy = getSiteCopy(locale).common.loading;
  const resource =
    progress.resource.kind === 'manifest'
      ? copy.resources.manifest
      : `${copy.resources.dailyPrefix}${progress.resource.date}`;
  return `${copy.statusLabels[progress.status]} ${resource}`;
}

export function LoadingScreen({ locale = 'en', progress }: LoadingScreenProps) {
  const copy = getSiteCopy(locale).common.loading;
  const progressPercent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.completed / progress.total) * 100))
      : undefined;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="flex items-center gap-3">
        <span className="relative flex h-10 w-10 items-center justify-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--color-accent)] opacity-30" />
          <span className="relative h-3 w-3 rounded-full bg-[color:var(--color-accent)] shadow-[0_0_18px_rgba(232,185,74,0.7)]" />
        </span>
        <span className="font-display-italic text-lg tracking-[0.18em] text-[color:var(--color-text-muted)]">
          {copy.title}
        </span>
      </div>
      <div className="grid w-64 gap-2">
        <div className="flex items-center justify-between gap-3 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-faint)]">
          <span>{progress ? copy.dataLabel : copy.connectingLabel}</span>
          {progress ? <span className="tnum">{progress.completed} / {progress.total}</span> : null}
        </div>
        <div
          role="progressbar"
          aria-label={copy.progressAriaLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progressPercent}
          className="h-[3px] overflow-hidden rounded-full bg-[color:var(--color-border-soft)]"
        >
          <div
            className={progress ? 'h-full rounded-full bg-[color:var(--color-accent)] transition-[width] duration-300' : 'shimmer h-full w-full'}
            style={progressPercent != null ? { width: `${progressPercent}%` } : undefined}
          />
        </div>
        {progress ? (
          <p className="truncate text-center text-xs text-[color:var(--color-text-muted)]">
            {renderProgressLabel(progress, locale)}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export function ErrorScreen({
  error,
  location,
}: {
  error: unknown;
  location: ResolvedSpaLocation;
}) {
  const { locale } = location;
  const copy = getSiteCopy(locale).common.error;
  const message = error instanceof Error ? error.message : copy.unknownMessage;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-10">
      <p className="eyebrow eyebrow-rule">{copy.eyebrow}</p>
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        {copy.titlePrefix}{' '}
        <span className="text-[color:var(--color-neg)]">{copy.titleHighlight}</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--color-text-muted)]">
        {message}
      </p>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)]"
        href={location.navigation.heroesHref}
      >
        {copy.backToHeroes}
      </a>
    </main>
  );
}

export function NotFoundScreen({ location }: { location: ResolvedSpaLocation }) {
  const { locale } = location;
  const copy = getSiteCopy(locale).common.notFound;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-10">
      <p className="eyebrow eyebrow-rule">{copy.eyebrow}</p>
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        {copy.titlePrefix}{' '}
        <span className="text-[color:var(--color-accent-bright)]">{copy.titleHighlight}</span>
      </h1>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)]"
        href={location.navigation.heroesHref}
      >
        {copy.backToHeroes}
      </a>
    </main>
  );
}
