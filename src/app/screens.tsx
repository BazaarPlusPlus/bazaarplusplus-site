import type { PageLoadProgress } from './page-data';

type LoadingScreenProps = {
  progress?: PageLoadProgress;
};

export function LoadingScreen({ progress }: LoadingScreenProps) {
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
          tallying the bazaar…
        </span>
      </div>
      <div className="grid w-64 gap-2">
        <div className="flex items-center justify-between gap-3 text-[0.68rem] font-medium uppercase tracking-[0.16em] text-[color:var(--color-text-faint)]">
          <span>{progress ? 'Loading data' : 'Connecting'}</span>
          {progress ? <span className="tnum">{progress.completed} / {progress.total}</span> : null}
        </div>
        <div
          role="progressbar"
          aria-label="Data loading progress"
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
            {progress.label}
          </p>
        ) : null}
      </div>
    </main>
  );
}

export function ErrorScreen({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unknown error';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-10">
      <p className="eyebrow eyebrow-rule">A hush falls over the bazaar</p>
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        The ledger is{' '}
        <span className="font-display-italic text-[color:var(--color-neg)]">silent</span>
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-[color:var(--color-text-muted)]">
        {message}
      </p>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)]"
        href="/heroes"
      >
        ← Back to hero overview
      </a>
    </main>
  );
}

export function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-10">
      <p className="eyebrow eyebrow-rule">Off the bazaar map</p>
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        This page is{' '}
        <span className="font-display-italic text-[color:var(--color-accent-bright)]">unwritten</span>
      </h1>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)]"
        href="/heroes"
      >
        ← Back to hero overview
      </a>
    </main>
  );
}
