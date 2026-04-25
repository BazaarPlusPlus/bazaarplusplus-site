import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import CardWinrateDashboard from './components/CardWinrateDashboard';
import DailyHeroDashboard from './components/DailyHeroDashboard';
import FinalBuildDashboard from './components/FinalBuildDashboard';
import {
  getAvailableTiers,
  getAvailableWindows,
  parseCardMetric,
  parseLocale,
  parseMetricWindow,
  parseRatingTier,
  type CardMetric,
  type Locale,
  type ManifestPayload,
  type MetricWindow,
  type RatingTier,
} from './lib/metrics';
import { createRuntimeMetricsClient, type RuntimeMetricsClient } from './lib/metrics-client';
import { isSpaRoutePath, resolveSpaRoute } from './lib/spa-router';
import {
  loadBuildsPageData,
  loadCardsPageData,
  loadHeroOverviewPageData,
  type BuildsPageData,
  type CardsPageData,
  type HeroOverviewPageData,
} from './spa/data';

type BrowserLocation = {
  pathname: string;
  search: string;
};

function readBrowserLocation(): BrowserLocation {
  return {
    pathname: window.location.pathname,
    search: window.location.search,
  };
}

function readLocale(search: string): Locale {
  return parseLocale(new URLSearchParams(search).get('lang'));
}

function getInitialWindow(manifest: ManifestPayload, search: string): MetricWindow {
  const requestedWindow = parseMetricWindow(new URLSearchParams(search).get('w'));
  const availableWindows = getAvailableWindows(manifest);
  return availableWindows.includes(requestedWindow)
    ? requestedWindow
    : availableWindows[0] ?? '1d';
}

function getInitialTier(options: RatingTier[], search: string): RatingTier {
  const requestedTier = parseRatingTier(new URLSearchParams(search).get('t'));
  return options.includes(requestedTier) ? requestedTier : options[0] ?? 'all';
}

function LoadingScreen() {
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
      <div className="h-[2px] w-48 overflow-hidden rounded-full bg-[color:var(--color-border-soft)]">
        <div className="shimmer h-full w-full" />
      </div>
    </main>
  );
}

function ErrorScreen({ error }: { error: unknown }) {
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
        href="/"
      >
        ← Back to hero overview
      </a>
    </main>
  );
}

function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-4 px-6 py-10">
      <p className="eyebrow eyebrow-rule">Off the bazaar map</p>
      <h1 className="font-display text-5xl font-semibold tracking-tight text-[color:var(--color-text-base)]">
        This page is{' '}
        <span className="font-display-italic text-[color:var(--color-accent-bright)]">unwritten</span>
      </h1>
      <a
        className="mt-4 inline-flex w-fit items-center gap-2 rounded-full border border-[color:var(--color-border-soft)] px-4 py-2 text-sm font-medium text-[color:var(--color-accent-bright)] transition hover:border-[color:var(--color-accent)]"
        href="/"
      >
        ← Back to hero overview
      </a>
    </main>
  );
}

function usePageQuery<T>(
  queryKey: readonly unknown[],
  queryFn: () => Promise<T>
): { data: T | undefined; error: unknown; isLoading: boolean } {
  return useQuery({
    queryKey,
    queryFn,
  });
}

function HeroOverviewPage({
  client,
  locale,
  search,
}: {
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
}) {
  const { data, error, isLoading } = usePageQuery(
    ['hero-overview'],
    () => loadHeroOverviewPageData(client)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <ErrorScreen error={error} />;
  }

  return <HeroOverviewDashboard data={data} locale={locale} search={search} />;
}

function HeroOverviewDashboard({
  data,
  locale,
  search,
}: {
  data: HeroOverviewPageData;
  locale: Locale;
  search: string;
}) {
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialSelectedTier = getInitialTier(data.availableTiers, search);

  return (
    <DailyHeroDashboard
      locale={locale}
      source={data.source}
      availableWindows={data.availableWindows}
      availableTiers={data.availableTiers}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      dailyByTier={data.dailyByTier}
      overviewByWindow={data.overviewByWindow}
    />
  );
}

function CardsPage({
  client,
  locale,
  search,
}: {
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
}) {
  const { data, error, isLoading } = usePageQuery(
    ['cards', locale],
    () => loadCardsPageData(client, locale)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <ErrorScreen error={error} />;
  }

  return <CardsDashboard data={data} locale={locale} search={search} />;
}

function getCardMetricLabels(metric: CardMetric): string[] {
  if (metric === 'uplift') {
    return ['item_uplift'];
  }

  if (metric === 'inclusion') {
    return ['item_inclusion'];
  }

  return ['item_winrate'];
}

function CardsDashboard({
  data,
  locale,
  search,
}: {
  data: CardsPageData;
  locale: Locale;
  search: string;
}) {
  const params = new URLSearchParams(search);
  const requestedMetric = parseCardMetric(params.get('m'));
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialMetricLabel = getCardMetricLabels(requestedMetric)[0] ?? 'item_winrate';
  const initialTierOptions = getAvailableTiers(
    data.manifest,
    initialSelectedWindow,
    initialMetricLabel
  );
  const initialSelectedTier = getInitialTier(initialTierOptions, search);

  return (
    <CardWinrateDashboard
      locale={locale}
      manifest={data.manifest}
      initialSelectedMetric={requestedMetric}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      source={data.source}
      winrateByWindow={data.winrateByWindow}
      upliftByWindow={data.upliftByWindow}
      inclusionByWindow={data.inclusionByWindow}
    />
  );
}

function BuildsPage({
  client,
  locale,
  search,
}: {
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
}) {
  const { data, error, isLoading } = usePageQuery(
    ['builds', locale],
    () => loadBuildsPageData(client, locale)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <ErrorScreen error={error} />;
  }

  return <BuildsDashboard data={data} locale={locale} search={search} />;
}

function BuildsDashboard({
  data,
  locale,
  search,
}: {
  data: BuildsPageData;
  locale: Locale;
  search: string;
}) {
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialTierOptions = getAvailableTiers(data.manifest, initialSelectedWindow, 'final_builds');
  const initialSelectedTier = getInitialTier(initialTierOptions, search);

  return (
    <FinalBuildDashboard
      locale={locale}
      manifest={data.manifest}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      source={data.source}
      rowsByWindow={data.rowsByWindow}
    />
  );
}

export default function App() {
  const client = useMemo(() => createRuntimeMetricsClient(), []);
  const [location, setLocation] = useState<BrowserLocation>(() => readBrowserLocation());
  const route = resolveSpaRoute(location.pathname);
  const locale = readLocale(location.search);

  useEffect(() => {
    function handlePopState() {
      setLocation(readBrowserLocation());
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (!(target instanceof HTMLAnchorElement) || target.target || target.hasAttribute('download')) {
        return;
      }

      const nextUrl = new URL(target.href);
      if (nextUrl.origin !== window.location.origin || !isSpaRoutePath(nextUrl.pathname)) {
        return;
      }

      event.preventDefault();
      window.history.pushState({}, '', nextUrl);
      setLocation(readBrowserLocation());
    }

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('click', handleClick);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('click', handleClick);
    };
  }, []);

  if (route.page === 'heroes') {
    return <HeroOverviewPage client={client} locale={locale} search={location.search} />;
  }

  if (route.page === 'cards') {
    return <CardsPage client={client} locale={locale} search={location.search} />;
  }

  if (route.page === 'builds') {
    return <BuildsPage client={client} locale={locale} search={location.search} />;
  }

  return <NotFoundScreen />;
}
