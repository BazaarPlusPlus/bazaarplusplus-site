import { DEFAULT_LOCALE, type CardMetric, type Locale, type MetricWindow, type RatingTier } from './metrics';

export const WINDOW_LABELS: Record<MetricWindow, string> = {
  '1d': '1D',
  '3d': '3D',
  '7d': '7D',
};

function getIntlLocale(locale: Locale): string {
  return locale === 'zh' ? 'zh-CN' : 'en-US';
}

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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
    m?: CardMetric;
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

  if (params.m && params.m !== 'winrate') {
    search.set('m', params.m);
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
