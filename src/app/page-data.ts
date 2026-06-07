import {
  isAnalyzerV4Manifest,
  validateWebDailyPayload,
  type AnalyzerV4Manifest,
  type MetricsSource,
  type MetricWindow,
  type RatingTier,
  type WebDayRef,
  type WebHeroDailyPayload,
} from '../shared/lib/metrics';
import type { MetricsRequestOptions, RuntimeMetricsClient } from '../shared/lib/metrics-client';
import {
  deriveAvailableTiers,
  deriveAvailableWindows,
  selectDays,
} from '../shared/lib/web-daily';

export type PageLoadProgress = {
  completed: number;
  total: number;
  label: string;
};

type PageLoadOptions = {
  onProgress?: (progress: PageLoadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
};

type ProgressTracker = {
  track<T>(label: string, task: () => Promise<T>): Promise<T>;
};

type TaskQueue = {
  run<T>(task: () => Promise<T>): Promise<T>;
};

type PageLoadContext = {
  progress: ProgressTracker;
  queue: TaskQueue;
  requestOptions: MetricsRequestOptions;
};

const DEFAULT_PAYLOAD_CONCURRENCY = 6;

export type HeroOverviewCoverage = {
  requested: string[];
  loaded: string[];
  failedDays: string[];
};

export type HeroOverviewPageData = {
  manifest: AnalyzerV4Manifest;
  source: MetricsSource;
  days: WebHeroDailyPayload[];
  availableWindows: MetricWindow[];
  availableTiers: RatingTier[];
  latestCompleteDay: string;
  coverage: HeroOverviewCoverage;
};

function createProgressTracker(
  onProgress: PageLoadOptions['onProgress'],
  total: number,
  completed: number,
  label: string
): ProgressTracker {
  let completedCount = completed;
  onProgress?.({ completed: completedCount, total, label });

  return {
    async track<T>(nextLabel: string, task: () => Promise<T>): Promise<T> {
      onProgress?.({ completed: completedCount, total, label: `Loading ${nextLabel}` });

      try {
        const value = await task();
        completedCount += 1;
        onProgress?.({ completed: completedCount, total, label: `Loaded ${nextLabel}` });
        return value;
      } catch (error) {
        onProgress?.({ completed: completedCount, total, label: `Failed ${nextLabel}` });
        throw error;
      }
    },
  };
}

function reportManifestStart(onProgress: PageLoadOptions['onProgress']) {
  onProgress?.({ completed: 0, total: 1, label: 'Loading manifest' });
}

function getAbortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('aborted', 'AbortError');
}

function normalizeConcurrency(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_PAYLOAD_CONCURRENCY;
  }

  return Math.max(1, Math.floor(value));
}

function createTaskQueue(concurrency: number, signal?: AbortSignal): TaskQueue {
  const maxConcurrency = normalizeConcurrency(concurrency);
  let activeCount = 0;
  const pending: Array<{
    start: () => void;
    reject: (error: unknown) => void;
  }> = [];

  function drain() {
    if (signal?.aborted) {
      return;
    }

    while (activeCount < maxConcurrency) {
      const next = pending.shift();
      if (!next) {
        return;
      }

      next.start();
    }
  }

  signal?.addEventListener(
    'abort',
    () => {
      const error = getAbortError(signal);
      while (pending.length > 0) {
        pending.shift()?.reject(error);
      }
    },
    { once: true }
  );

  return {
    run<T>(task: () => Promise<T>): Promise<T> {
      if (signal?.aborted) {
        return Promise.reject(getAbortError(signal));
      }

      return new Promise((resolve, reject) => {
        pending.push({
          reject,
          start: () => {
            if (signal?.aborted) {
              reject(getAbortError(signal));
              return;
            }

            activeCount += 1;
            task()
              .then(resolve, reject)
              .finally(() => {
                activeCount -= 1;
                drain();
              });
          },
        });
        drain();
      });
    },
  };
}

function createPageLoadContext(
  options: PageLoadOptions,
  total: number,
  completed: number,
  label: string
): PageLoadContext {
  return {
    progress: createProgressTracker(options.onProgress, total, completed, label),
    queue: createTaskQueue(options.concurrency ?? DEFAULT_PAYLOAD_CONCURRENCY, options.signal),
    requestOptions: { signal: options.signal },
  };
}

function loadTracked<T>(
  context: PageLoadContext,
  label: string,
  task: () => Promise<T>
): Promise<T> {
  return context.queue.run(() => context.progress.track(label, task));
}

function isNotFoundError(error: unknown): boolean {
  return error instanceof Error && /: 404\b/.test(error.message);
}

async function loadWebDay(
  client: RuntimeMetricsClient,
  ref: WebDayRef,
  requestOptions: MetricsRequestOptions
): Promise<WebHeroDailyPayload> {
  async function fetchOnce(): Promise<WebHeroDailyPayload> {
    const payload = await client.getWebDaily(ref.path, requestOptions);
    if (!validateWebDailyPayload(payload, ref.day)) {
      throw new Error(`Unexpected web daily payload for ${ref.day}`);
    }

    return payload;
  }

  try {
    return await fetchOnce();
  } catch (error) {
    // The client never retries a 404; allow exactly one explicit refetch in case the
    // daily file publish lagged the manifest.
    if (isNotFoundError(error) && !requestOptions.signal?.aborted) {
      return fetchOnce();
    }

    throw error;
  }
}

export async function loadHeroOverviewPageData(
  client: RuntimeMetricsClient,
  options: PageLoadOptions = {}
): Promise<HeroOverviewPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest({ signal: options.signal });
  if (!isAnalyzerV4Manifest(manifest)) {
    throw new Error('Unexpected metrics manifest format');
  }

  // Load the superset (latest 7 days); the UI re-slices per selected window client-side.
  const requestedDays = selectDays(manifest.web.days, '7d', manifest.latest_complete_day);
  const context = createPageLoadContext(
    options,
    1 + requestedDays.length,
    1,
    'Loaded manifest'
  );

  // Per-file isolation: one failed day degrades coverage instead of failing the page.
  const results = await Promise.allSettled(
    requestedDays.map((ref) =>
      loadTracked(context, `web_daily/${ref.day}`, () =>
        loadWebDay(client, ref, context.requestOptions)
      )
    )
  );

  if (options.signal?.aborted) {
    throw getAbortError(options.signal);
  }

  const days: WebHeroDailyPayload[] = [];
  const failedDays: string[] = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      days.push(result.value);
    } else {
      failedDays.push(requestedDays[index]!.day);
    }
  });
  days.sort((a, b) => a.day.localeCompare(b.day));

  const loadedDayRefs = requestedDays.filter((ref) =>
    days.some((payload) => payload.day === ref.day)
  );

  return {
    manifest,
    source: client.getSource(),
    days,
    availableWindows: deriveAvailableWindows(loadedDayRefs),
    availableTiers: deriveAvailableTiers(days),
    latestCompleteDay: manifest.latest_complete_day,
    coverage: {
      requested: requestedDays.map((ref) => ref.day),
      loaded: days.map((payload) => payload.day),
      failedDays,
    },
  };
}
