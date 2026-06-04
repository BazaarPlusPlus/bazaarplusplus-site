import type {
  HeroOverviewPayload,
  HeroWinrateDailyPayload,
  ManifestPayload,
  MetricsSource,
  MetricWindow,
  RatingTier,
} from './metrics';

type RuntimeMetricsClientOptions = {
  metricsBaseUrl?: string;
  fetchImpl?: typeof fetch;
  requestTimeoutMs?: number;
  requestRetries?: number;
  requestRetryDelayMs?: number;
};

export type MetricsRequestOptions = {
  signal?: AbortSignal;
  timeoutMs?: number;
  retries?: number;
  retryDelayMs?: number;
};

const DEFAULT_METRICS_BASE_URL =
  import.meta.env.VITE_METRICS_BASE ?? 'https://bpp-metrics.bazaarplusplus.com';
const DEFAULT_REQUEST_TIMEOUT_MS = 15_000;
const DEFAULT_REQUEST_RETRIES = 2;
const DEFAULT_REQUEST_RETRY_DELAY_MS = 250;

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function resolveSource(): MetricsSource {
  return 'remote';
}

function getAbortError(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException('aborted', 'AbortError');
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === 'AbortError'
  ) || (
    error instanceof Error && error.name === 'AbortError'
  );
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function waitForRetry(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0) {
    return Promise.resolve();
  }

  if (signal?.aborted) {
    return Promise.reject(getAbortError(signal));
  }

  return new Promise((resolve, reject) => {
    function cleanup() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', handleAbort);
    }

    const timer = setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    function handleAbort() {
      cleanup();
      reject(signal ? getAbortError(signal) : new DOMException('aborted', 'AbortError'));
    }

    signal?.addEventListener('abort', handleAbort, { once: true });
  });
}

function createRequestSignal(
  timeoutMs: number,
  callerSignal?: AbortSignal
): {
  signal: AbortSignal;
  didTimeout: () => boolean;
  cleanup: () => void;
} {
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

export function createRuntimeMetricsClient(options: RuntimeMetricsClientOptions = {}) {
  const metricsBaseUrl = normalizeBaseUrl(options.metricsBaseUrl ?? DEFAULT_METRICS_BASE_URL);
  const fetchImpl = options.fetchImpl ?? fetch;
  const defaultTimeoutMs = options.requestTimeoutMs ?? DEFAULT_REQUEST_TIMEOUT_MS;
  const defaultRetries = options.requestRetries ?? DEFAULT_REQUEST_RETRIES;
  const defaultRetryDelayMs = options.requestRetryDelayMs ?? DEFAULT_REQUEST_RETRY_DELAY_MS;

  async function loadJson<T>(url: string, requestOptions: MetricsRequestOptions = {}): Promise<T> {
    const timeoutMs = requestOptions.timeoutMs ?? defaultTimeoutMs;
    const retries = requestOptions.retries ?? defaultRetries;
    const retryDelayMs = requestOptions.retryDelayMs ?? defaultRetryDelayMs;
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      if (requestOptions.signal?.aborted) {
        throw getAbortError(requestOptions.signal);
      }

      const requestSignal = createRequestSignal(timeoutMs, requestOptions.signal);

      try {
        const response = await fetchImpl(url, { signal: requestSignal.signal });

        if (!response.ok) {
          const statusError = new Error(`Failed to fetch ${url}: ${response.status}`);
          if (attempt < retries && isRetryableStatus(response.status)) {
            lastError = statusError;
            await waitForRetry(retryDelayMs, requestOptions.signal);
            continue;
          }

          throw statusError;
        }

        return (await response.json()) as T;
      } catch (error) {
        if (requestOptions.signal?.aborted) {
          throw isAbortError(error) ? error : getAbortError(requestOptions.signal);
        }

        lastError = requestSignal.didTimeout()
          ? new Error(`Timed out fetching ${url} after ${timeoutMs}ms`)
          : error;

        if (attempt >= retries) {
          throw lastError instanceof Error
            ? lastError
            : new Error(`Failed to fetch ${url}: ${String(lastError)}`);
        }

        await waitForRetry(retryDelayMs, requestOptions.signal);
      } finally {
        requestSignal.cleanup();
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error(`Failed to fetch ${url}: ${String(lastError)}`);
  }

  function loadMetric<T>(relativePath: string, requestOptions?: MetricsRequestOptions): Promise<T> {
    return loadJson<T>(`${metricsBaseUrl}${relativePath}`, requestOptions);
  }

  return {
    getSource: resolveSource,
    getManifest: (requestOptions?: MetricsRequestOptions) =>
      loadMetric<ManifestPayload>('manifest.json', requestOptions),
    getHeroOverview: (window: MetricWindow, tier: RatingTier, requestOptions?: MetricsRequestOptions) =>
      loadMetric<HeroOverviewPayload>(`hero_overview/${window}/${tier}.json`, requestOptions),
    getHeroWinrateDaily: (tier: RatingTier, requestOptions?: MetricsRequestOptions) =>
      loadMetric<HeroWinrateDailyPayload>(`hero_winrate_daily/${tier}.json`, requestOptions),
  };
}

export type RuntimeMetricsClient = ReturnType<typeof createRuntimeMetricsClient>;
