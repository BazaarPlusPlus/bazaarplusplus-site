export type RatingTier = 'all' | 'low' | 'mid' | 'high';

export const RATING_TIER_ORDER: RatingTier[] = ['all', 'low', 'mid', 'high'];

export const GAME_DAY_BUCKETS = [
  'day_1',
  'day_2',
  'day_3',
  'day_4',
  'day_5',
  'day_6',
  'day_7',
  'day_8',
  'day_9',
  'day_10',
  'day_11',
  'day_12',
  'day_13_plus',
] as const;

export type GameDayBucket = (typeof GAME_DAY_BUCKETS)[number];

export type HeroMetricsPublishedDay = {
  day: string;
  path: string;
  row_count: number;
};

export type HeroBattleCounts = {
  decided: number;
  wins: number;
  losses: number;
};

export type HeroMetricsMatchup = HeroBattleCounts & {
  opponent_hero: string;
};

export type HeroMetricsRow = {
  hero: string;
  rating_tier: RatingTier;
  runs: {
    completed: number;
    scored: number;
    ten_win: number;
  };
  outcomes: {
    perfect: number;
    gold: number;
    silver: number;
    bronze: number;
  };
  ten_win_days: {
    known_count: number;
    sum_days: number;
  };
  battle_days: Partial<Record<GameDayBucket, HeroBattleCounts>>;
  matchups: HeroMetricsMatchup[];
};

export type HeroMetricsDay = {
  schema_version: '2';
  kind: 'hero_web_daily';
  day: string;
  generated_at: string;
  rows: HeroMetricsRow[];
};

export type DatasetCoverage = {
  requestedDates: string[];
  usableDates: string[];
  failedDates: string[];
};

export type HeroMetricsDataset = {
  generatedAt: string;
  latestCompleteDay: string;
  publishedDays: HeroMetricsPublishedDay[];
  days: HeroMetricsDay[];
  coverage: DatasetCoverage;
};

export type HeroMetricsLoadProgress = {
  completed: number;
  total: number;
  status: 'loading' | 'loaded' | 'failed';
  resource: { kind: 'manifest' } | { kind: 'daily'; date: string };
};

export type HeroMetricsTransport = {
  load(path: string, options?: { signal?: AbortSignal }): Promise<unknown>;
};

export class HeroMetricsTransportError extends Error {
  readonly kind: 'http' | 'network' | 'timeout';
  readonly status?: number;

  constructor(
    message: string,
    options: {
      kind?: 'http' | 'network' | 'timeout';
      status?: number;
      cause?: unknown;
    } = {}
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = 'HeroMetricsTransportError';
    this.kind = options.kind ?? (options.status == null ? 'network' : 'http');
    this.status = options.status;
  }
}

type HttpTransportOptions = {
  metricsBaseUrl?: string;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
  requestRetries?: number;
  requestRetryDelayMs?: number;
};

type LoadDatasetOptions = {
  onProgress?: (progress: HeroMetricsLoadProgress) => void;
  signal?: AbortSignal;
  concurrency?: number;
};

type DecodedManifest = {
  generatedAt: string;
  latestCompleteDay: string;
  publishedDays: HeroMetricsPublishedDay[];
};

const DEFAULT_METRICS_BASE_URL =
  import.meta.env.VITE_METRICS_BASE ?? 'https://bpp-metrics.bazaarplusplus.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_REQUEST_RETRIES = 2;
const DEFAULT_REQUEST_RETRY_DELAY_MS = 250;
const DEFAULT_PAYLOAD_CONCURRENCY = 6;
const MANIFEST_PATH = 'analyzer-v4/manifest.json';
const RATING_TIERS = new Set<string>(['all', 'low', 'mid', 'high']);

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function getAbortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('aborted', 'AbortError');
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isRetryableFailure(error: HeroMetricsTransportError): boolean {
  return error.kind !== 'http' || (error.status != null && isRetryableStatus(error.status));
}

function waitForRetry(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }
  if (signal?.aborted) {
    return Promise.reject(getAbortError(signal));
  }

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
    }
    function handleAbort() {
      cleanup();
      reject(signal ? getAbortError(signal) : new DOMException('aborted', 'AbortError'));
    }
    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function createRequestSignal(timeoutMs: number, callerSignal?: AbortSignal) {
  const controller = new AbortController();
  let timedOut = false;

  function abortFromCaller() {
    controller.abort(callerSignal ? getAbortError(callerSignal) : undefined);
  }
  if (callerSignal?.aborted) {
    abortFromCaller();
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException(`Timed out after ${timeoutMs}ms`, 'TimeoutError'));
  }, timeoutMs);

  return {
    signal: controller.signal,
    didTimeout: () => timedOut,
    cleanup: () => {
      clearTimeout(timer);
      callerSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

function toTransportFailure(error: unknown, url: string): HeroMetricsTransportError {
  if (error instanceof HeroMetricsTransportError) {
    return error;
  }
  return new HeroMetricsTransportError(`Failed to fetch ${url}: ${String(error)}`, {
    kind: 'network',
    cause: error,
  });
}

export function createHeroMetricsHttpTransport(
  options: HttpTransportOptions = {}
): HeroMetricsTransport {
  const baseUrl = normalizeBaseUrl(options.metricsBaseUrl ?? DEFAULT_METRICS_BASE_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const defaultRetries = options.requestRetries ?? DEFAULT_REQUEST_RETRIES;
  const defaultRetryDelayMs = options.requestRetryDelayMs ?? DEFAULT_REQUEST_RETRY_DELAY_MS;

  return {
    async load(path, requestOptions = {}) {
      const url = `${baseUrl}${path}`;
      let lastFailure: HeroMetricsTransportError | undefined;

      for (let attempt = 0; attempt <= defaultRetries; attempt += 1) {
        if (requestOptions.signal?.aborted) {
          throw getAbortError(requestOptions.signal);
        }

        const requestSignal = createRequestSignal(defaultTimeoutMs, requestOptions.signal);
        try {
          const response = await fetchImpl(url, { signal: requestSignal.signal });
          if (!response.ok) {
            throw new HeroMetricsTransportError(`Failed to fetch ${url}: ${response.status}`, {
              kind: 'http',
              status: response.status,
            });
          }
          return await response.json();
        } catch (error) {
          if (requestOptions.signal?.aborted) {
            throw getAbortError(requestOptions.signal);
          }
          lastFailure = requestSignal.didTimeout()
            ? new HeroMetricsTransportError(
                `Timed out fetching ${url} after ${defaultTimeoutMs}ms`,
                { kind: 'timeout', cause: error }
              )
            : toTransportFailure(error, url);
        } finally {
          requestSignal.cleanup();
        }

        if (attempt >= defaultRetries || !isRetryableFailure(lastFailure)) {
          throw lastFailure;
        }
        await waitForRetry(defaultRetryDelayMs, requestOptions.signal);
      }

      throw lastFailure ?? new HeroMetricsTransportError(`Failed to fetch ${url}`);
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asCounter(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Number.isInteger(value) && value >= 0
    ? value
    : null;
}

function decodeManifest(value: unknown): DecodedManifest | null {
  const manifest = asRecord(value);
  const web = asRecord(manifest?.web);
  const generatedAt = asNonEmptyString(manifest?.generated_at);
  const latestCompleteDay = asNonEmptyString(manifest?.latest_complete_day);
  if (
    manifest?.schema_version !== '2' ||
    manifest.namespace !== 'analyzer-v4' ||
    generatedAt == null ||
    latestCompleteDay == null ||
    web?.schema_version !== '2' ||
    !Array.isArray(web.days)
  ) {
    return null;
  }

  const publishedDays: HeroMetricsPublishedDay[] = [];
  for (const valueDay of web.days) {
    const day = asRecord(valueDay);
    const dayValue = asNonEmptyString(day?.day);
    const path = asNonEmptyString(day?.path);
    const rowCount = asCounter(day?.row_count);
    if (dayValue == null || path == null || rowCount == null) {
      return null;
    }
    publishedDays.push({ day: dayValue, path, row_count: rowCount });
  }

  return { generatedAt, latestCompleteDay, publishedDays };
}

function decodeBattleCounts(value: unknown): HeroBattleCounts | null {
  const counts = asRecord(value);
  const decided = asCounter(counts?.decided);
  const wins = asCounter(counts?.wins);
  const losses = asCounter(counts?.losses);
  return decided == null || wins == null || losses == null
    ? null
    : { decided, wins, losses };
}

function decodeRow(value: unknown): HeroMetricsRow | null {
  const row = asRecord(value);
  const runs = asRecord(row?.runs);
  const outcomes = asRecord(row?.outcomes);
  const tenWinDays = asRecord(row?.ten_win_days);
  const battleDaysValue = asRecord(row?.battle_days);
  const hero = asNonEmptyString(row?.hero);
  const tier = row?.rating_tier;
  if (
    hero == null ||
    typeof tier !== 'string' ||
    !RATING_TIERS.has(tier) ||
    runs == null ||
    outcomes == null ||
    tenWinDays == null ||
    battleDaysValue == null ||
    !Array.isArray(row?.matchups)
  ) {
    return null;
  }

  const completed = asCounter(runs.completed);
  const scored = asCounter(runs.scored);
  const tenWin = asCounter(runs.ten_win);
  const perfect = asCounter(outcomes.perfect);
  const gold = asCounter(outcomes.gold);
  const silver = asCounter(outcomes.silver);
  const bronze = asCounter(outcomes.bronze);
  const knownCount = asCounter(tenWinDays.known_count);
  const sumDays = asCounter(tenWinDays.sum_days);
  if (
    completed == null ||
    scored == null ||
    tenWin == null ||
    perfect == null ||
    gold == null ||
    silver == null ||
    bronze == null ||
    knownCount == null ||
    sumDays == null
  ) {
    return null;
  }

  const battleDays: Partial<Record<GameDayBucket, HeroBattleCounts>> = {};
  for (const bucket of GAME_DAY_BUCKETS) {
    if (!(bucket in battleDaysValue)) {
      continue;
    }
    const counts = decodeBattleCounts(battleDaysValue[bucket]);
    if (counts == null) {
      return null;
    }
    battleDays[bucket] = counts;
  }

  const matchups: HeroMetricsMatchup[] = [];
  for (const valueMatchup of row.matchups) {
    const matchup = asRecord(valueMatchup);
    const opponentHero = asNonEmptyString(matchup?.opponent_hero);
    const counts = decodeBattleCounts(matchup);
    if (opponentHero == null || counts == null) {
      return null;
    }
    matchups.push({ opponent_hero: opponentHero, ...counts });
  }

  return {
    hero,
    rating_tier: tier as RatingTier,
    runs: { completed, scored, ten_win: tenWin },
    outcomes: { perfect, gold, silver, bronze },
    ten_win_days: { known_count: knownCount, sum_days: sumDays },
    battle_days: battleDays,
    matchups,
  };
}

function decodeDay(value: unknown, expectedDay: string): HeroMetricsDay | null {
  const payload = asRecord(value);
  const day = asNonEmptyString(payload?.day);
  const generatedAt = asNonEmptyString(payload?.generated_at);
  if (
    payload?.schema_version !== '2' ||
    payload.kind !== 'hero_web_daily' ||
    day !== expectedDay ||
    generatedAt == null ||
    !Array.isArray(payload.rows)
  ) {
    return null;
  }

  const rows: HeroMetricsRow[] = [];
  for (const valueRow of payload.rows) {
    const row = decodeRow(valueRow);
    if (row == null) {
      return null;
    }
    rows.push(row);
  }
  return {
    schema_version: '2',
    kind: 'hero_web_daily',
    day,
    generated_at: generatedAt,
    rows,
  };
}

function selectRequestedDays(manifest: DecodedManifest): HeroMetricsPublishedDay[] {
  return [...manifest.publishedDays]
    .filter((ref) => ref.day <= manifest.latestCompleteDay)
    .sort((left, right) => left.day.localeCompare(right.day))
    .slice(-7);
}

function normalizeConcurrency(value: number | undefined): number {
  if (!value || !Number.isFinite(value)) {
    return DEFAULT_PAYLOAD_CONCURRENCY;
  }
  return Math.max(1, Math.floor(value));
}

async function loadDaily(
  transport: HeroMetricsTransport,
  ref: HeroMetricsPublishedDay,
  signal?: AbortSignal
): Promise<HeroMetricsDay> {
  async function fetchOnce() {
    const value = await transport.load(ref.path, { signal });
    const decoded = decodeDay(value, ref.day);
    if (decoded == null) {
      throw new Error(`Unexpected web daily payload for ${ref.day}`);
    }
    return decoded;
  }

  try {
    return await fetchOnce();
  } catch (error) {
    if (
      error instanceof HeroMetricsTransportError &&
      error.status === 404 &&
      !signal?.aborted
    ) {
      return fetchOnce();
    }
    throw error;
  }
}

export async function loadHeroMetricsDataset(
  transport: HeroMetricsTransport,
  options: LoadDatasetOptions = {}
): Promise<HeroMetricsDataset> {
  const report = options.onProgress;
  report?.({
    completed: 0,
    total: 1,
    status: 'loading',
    resource: { kind: 'manifest' },
  });

  let manifest: DecodedManifest | null;
  try {
    manifest = decodeManifest(await transport.load(MANIFEST_PATH, { signal: options.signal }));
    if (manifest == null) {
      throw new Error('Unexpected metrics manifest format');
    }
  } catch (error) {
    report?.({
      completed: 0,
      total: 1,
      status: 'failed',
      resource: { kind: 'manifest' },
    });
    throw error;
  }

  const requestedDays = selectRequestedDays(manifest);
  const total = requestedDays.length + 1;
  let completed = 1;
  report?.({
    completed,
    total,
    status: 'loaded',
    resource: { kind: 'manifest' },
  });

  const results: Array<HeroMetricsDay | Error | undefined> = new Array(requestedDays.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < requestedDays.length) {
      if (options.signal?.aborted) {
        throw getAbortError(options.signal);
      }
      const index = nextIndex;
      nextIndex += 1;
      const ref = requestedDays[index]!;
      report?.({
        completed,
        total,
        status: 'loading',
        resource: { kind: 'daily', date: ref.day },
      });
      try {
        const day = await loadDaily(transport, ref, options.signal);
        results[index] = day;
        completed += 1;
        report?.({
          completed,
          total,
          status: 'loaded',
          resource: { kind: 'daily', date: ref.day },
        });
      } catch (error) {
        if (options.signal?.aborted) {
          report?.({
            completed,
            total,
            status: 'failed',
            resource: { kind: 'daily', date: ref.day },
          });
          throw getAbortError(options.signal);
        }
        results[index] = error instanceof Error ? error : new Error(String(error));
        report?.({
          completed,
          total,
          status: 'failed',
          resource: { kind: 'daily', date: ref.day },
        });
      }
    }
  }

  const workerCount = Math.min(
    requestedDays.length,
    normalizeConcurrency(options.concurrency)
  );
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  if (options.signal?.aborted) {
    throw getAbortError(options.signal);
  }

  const days: HeroMetricsDay[] = [];
  const failedDates: string[] = [];
  results.forEach((result, index) => {
    if (result && !(result instanceof Error)) {
      days.push(result);
    } else {
      failedDates.push(requestedDays[index]!.day);
    }
  });
  days.sort((left, right) => left.day.localeCompare(right.day));

  return {
    generatedAt: manifest.generatedAt,
    latestCompleteDay: manifest.latestCompleteDay,
    publishedDays: manifest.publishedDays,
    days,
    coverage: {
      requestedDates: requestedDays.map((ref) => ref.day),
      usableDates: days.map((day) => day.day),
      failedDates,
    },
  };
}
