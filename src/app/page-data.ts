import {
  buildCardWinrateViewRows,
  buildFinalBuildViewRows,
  buildItemInclusionViewRows,
  buildItemUpliftViewRows,
  getAvailableTiers,
  getAvailableTiersForWindowlessMetric,
  getAvailableWindows,
  getCommonAvailableTiers,
  type CardWinrateViewRow,
  type FinalBuildViewRow,
  type HeroOverviewPayload,
  type HeroWinrateDailyPayload,
  type ItemInclusionViewRow,
  type ItemUpliftViewRow,
  type Locale,
  type ManifestPayload,
  type MetricsSource,
  type MetricWindow,
  type RatingTier,
} from '../shared/lib/metrics';
import type { MetricsRequestOptions, RuntimeMetricsClient } from '../shared/lib/metrics-client';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

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

type WindowTierMap<T> = Partial<Record<MetricWindow, Partial<Record<RatingTier, T>>>>;
type ViewWindowTierMap<T> = WindowTierMap<ViewPayload<T>>;

type PageDataBase = {
  manifest: ManifestPayload;
  source: MetricsSource;
};

const DEFAULT_PAYLOAD_CONCURRENCY = 6;

export type HeroOverviewPageData = PageDataBase & {
  availableWindows: MetricWindow[];
  availableTiers: RatingTier[];
  dailyByTier: Partial<Record<RatingTier, HeroWinrateDailyPayload>>;
  overviewByWindow: WindowTierMap<HeroOverviewPayload>;
};

export type CardsPageData = PageDataBase & {
  winrateByWindow: ViewWindowTierMap<CardWinrateViewRow>;
  upliftByWindow: ViewWindowTierMap<ItemUpliftViewRow>;
  inclusionByWindow: ViewWindowTierMap<ItemInclusionViewRow>;
};

export type BuildsPageData = PageDataBase & {
  rowsByWindow: ViewWindowTierMap<FinalBuildViewRow>;
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

function countWindowTierPayloads(manifest: ManifestPayload, metric: string): number {
  return getAvailableWindows(manifest).reduce(
    (count, window) => count + getAvailableTiers(manifest, window, metric).length,
    0
  );
}

function countCommonWindowTierPayloads(manifest: ManifestPayload, metrics: string[]): number {
  return getAvailableWindows(manifest).reduce(
    (count, window) => count + getCommonAvailableTiers(manifest, window, metrics).length,
    0
  );
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

async function loadWindowTierMap<T>(
  manifest: ManifestPayload,
  metric: string,
  loadPayload: (
    window: MetricWindow,
    tier: RatingTier,
    requestOptions?: MetricsRequestOptions
  ) => Promise<T>,
  context: PageLoadContext
): Promise<WindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getAvailableTiers(manifest, window, metric).map(async (tier) => [
            tier,
            await loadTracked(context, `${metric}/${window}/${tier}`, () =>
              loadPayload(window, tier, context.requestOptions)
            ),
          ] as const)
        )
      ),
    ] as const)
  );

  return Object.fromEntries(entries);
}

async function loadCommonWindowTierViewMap<T>(
  manifest: ManifestPayload,
  metrics: string[],
  loadRows: (
    window: MetricWindow,
    tier: RatingTier,
    requestOptions?: MetricsRequestOptions
  ) => Promise<ViewPayload<T>>,
  context: PageLoadContext
): Promise<ViewWindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getCommonAvailableTiers(manifest, window, metrics).map(async (tier) => [
            tier,
            await loadTracked(context, `${metrics.join('+')}/${window}/${tier}`, () =>
              loadRows(window, tier, context.requestOptions)
            ),
          ] as const)
        )
      ),
    ] as const)
  );

  return Object.fromEntries(entries);
}

async function loadMetricViewMap<TPayload extends { rowCount: number }, TRow>(
  manifest: ManifestPayload,
  metric: string,
  loadPayload: (
    window: MetricWindow,
    tier: RatingTier,
    requestOptions?: MetricsRequestOptions
  ) => Promise<TPayload>,
  mapRows: (payload: TPayload) => TRow[],
  context: PageLoadContext
): Promise<ViewWindowTierMap<TRow>> {
  return loadCommonWindowTierViewMap(manifest, [metric], async (window, tier, requestOptions) => {
    const payload = await loadPayload(window, tier, requestOptions);
    return {
      rowCount: payload.rowCount,
      rows: mapRows(payload),
    };
  }, context);
}

export async function loadHeroOverviewPageData(
  client: RuntimeMetricsClient,
  options: PageLoadOptions = {}
): Promise<HeroOverviewPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest({ signal: options.signal });
  const availableWindows = getAvailableWindows(manifest);
  const availableTiers = getAvailableTiersForWindowlessMetric(manifest, 'hero_winrate_daily');
  const context = createPageLoadContext(
    options,
    1 + availableTiers.length + countWindowTierPayloads(manifest, 'hero_overview'),
    1,
    'Loaded manifest'
  );

  const [dailyEntries, overviewByWindow] = await Promise.all([
    Promise.all(
      availableTiers.map(async (tier) => [
        tier,
        await loadTracked(context, `hero_winrate_daily/${tier}`, () =>
          client.getHeroWinrateDaily(tier, context.requestOptions)
        ),
      ] as const)
    ),
    loadWindowTierMap(manifest, 'hero_overview', client.getHeroOverview, context),
  ]);

  return {
    manifest,
    source: client.getSource(),
    availableWindows,
    availableTiers,
    dailyByTier: Object.fromEntries(dailyEntries),
    overviewByWindow,
  };
}

export async function loadCardsPageData(
  client: RuntimeMetricsClient,
  locale: Locale,
  options: PageLoadOptions = {}
): Promise<CardsPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest({ signal: options.signal });
  const context = createPageLoadContext(
    options,
    2 +
      countCommonWindowTierPayloads(manifest, ['item_winrate']) +
      countCommonWindowTierPayloads(manifest, ['item_uplift']) +
      countCommonWindowTierPayloads(manifest, ['item_inclusion']),
    1,
    'Loaded manifest'
  );

  const cardDictionary = await loadTracked(context, 'card dictionary', () =>
    client.getCardDictionary(context.requestOptions)
  );
  const [
    winrateByWindow,
    upliftByWindow,
    inclusionByWindow,
  ] = await Promise.all([
    loadMetricViewMap(
      manifest,
      'item_winrate',
      client.getCardWinrate,
      (payload) => buildCardWinrateViewRows(payload, cardDictionary, locale),
      context
    ),
    loadMetricViewMap(
      manifest,
      'item_uplift',
      client.getItemUplift,
      (payload) => buildItemUpliftViewRows(payload, cardDictionary, locale),
      context
    ),
    loadMetricViewMap(
      manifest,
      'item_inclusion',
      client.getItemInclusion,
      (payload) => buildItemInclusionViewRows(payload, cardDictionary, locale),
      context
    ),
  ]);

  return {
    manifest,
    source: client.getSource(),
    winrateByWindow,
    upliftByWindow,
    inclusionByWindow,
  };
}

export async function loadBuildsPageData(
  client: RuntimeMetricsClient,
  locale: Locale,
  options: PageLoadOptions = {}
): Promise<BuildsPageData> {
  reportManifestStart(options.onProgress);
  const manifest = await client.getManifest({ signal: options.signal });
  const context = createPageLoadContext(
    options,
    2 + countCommonWindowTierPayloads(manifest, ['final_builds']),
    1,
    'Loaded manifest'
  );
  const cardDictionary = await loadTracked(context, 'card dictionary', () =>
    client.getCardDictionary(context.requestOptions)
  );
  const rowsByWindow = await loadMetricViewMap(
    manifest,
    'final_builds',
    client.getFinalBuilds,
    (payload) => buildFinalBuildViewRows(payload, cardDictionary, locale),
    context
  );

  return {
    manifest,
    source: client.getSource(),
    rowsByWindow,
  };
}
