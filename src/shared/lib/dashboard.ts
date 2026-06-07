import { DEFAULT_LOCALE, type Locale, type MetricWindow, type RatingTier } from './metrics';

export const WINDOW_LABELS: Record<MetricWindow, string> = {
  '1d': '1D',
  '3d': '3D',
  '7d': '7D',
};

// Nominal day counts per window; loaded coverage may be smaller and is never zero-filled.
export const WEB_DAILY_NOMINAL: Record<MetricWindow, number> = {
  '1d': 1,
  '3d': 3,
  '7d': 7,
};
export const DQ_BUNDLE_FAIL_WARN = 0.05;
export const DQ_DECODE_FAIL_WARN = 0.02;
export const MATCHUP_MIN_SAMPLE = 20;

function getIntlLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// Null/zero-denominator rates render as an em dash; never let NaN reach formatPercent.
export function formatNullablePercent(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : formatPercent(value);
}

// 95% Wilson lower bound, z=1.96 — copied verbatim from web-analysis-logic.md to keep parity
// with the analyzer's z=1.96 formula. null when attempts<=0.
export function wilsonLower95(successes: number, attempts: number): number | null {
  if (attempts <= 0) {
    return null;
  }

  const z = 1.96;
  const phat = successes / attempts;
  const z2 = z * z;
  const denominator = 1 + z2 / attempts;
  const centre = phat + z2 / (2 * attempts);
  const margin = z * Math.sqrt((phat * (1 - phat) + z2 / (4 * attempts)) / attempts);
  return (centre - margin) / denominator;
}

export function formatInteger(value: number, locale: Locale = 'en'): string {
  return new Intl.NumberFormat(getIntlLocale(locale)).format(value);
}

export function formatDateTime(value: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(new Date(value));
}

export function formatShortDate(value: string, locale: Locale = 'en'): string {
  return new Intl.DateTimeFormat(getIntlLocale(locale), {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

export function buildLocalizedHref(
  pathname: string,
  params: {
    w?: MetricWindow;
    t?: RatingTier;
    hero?: string;
    lang?: Locale;
  }
): string {
  const search = new URLSearchParams();

  if (params.w && params.w !== '1d') {
    search.set('w', params.w);
  }

  if (params.t && params.t !== 'all') {
    search.set('t', params.t);
  }

  if (params.hero && params.hero !== 'all') {
    search.set('hero', params.hero);
  }

  if (params.lang && params.lang !== DEFAULT_LOCALE) {
    search.set('lang', params.lang);
  }

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
