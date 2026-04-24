import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import ArchetypeDashboard from './components/ArchetypeDashboard';
import CardWinrateDashboard from './components/CardWinrateDashboard';
import DailyHeroDashboard from './components/DailyHeroDashboard';
import FinalBuildDashboard from './components/FinalBuildDashboard';
import HeroDetailDashboard from './components/HeroDetailDashboard';
import {
  getAvailableTiers,
  getAvailableTiersForWindowlessMetric,
  getAvailableWindows,
  getCommonAvailableTiers,
  parseCardMetric,
  parseCardPhaseMetric,
  parseLocale,
  parseMetricWindow,
  parseRatingTier,
  type CardMetric,
  type CardPhaseMetric,
  type Locale,
  type ManifestPayload,
  type MetricWindow,
  type RatingTier,
} from './lib/metrics';
import { createRuntimeMetricsClient, type RuntimeMetricsClient } from './lib/metrics-client';
import { isSpaRoutePath, resolveSpaRoute, type SpaRoute } from './lib/spa-router';
import {
  loadArchetypesPageData,
  loadBuildsPageData,
  loadCardsPageData,
  loadHeroDetailPageData,
  loadHeroOverviewPageData,
  type ArchetypesPageData,
  type BuildsPageData,
  type CardsPageData,
  type HeroDetailPageData,
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

function getInitialCardMetric(search: string): CardMetric {
  return parseCardMetric(new URLSearchParams(search).get('m'));
}

function getInitialCardPhaseMetric(search: string): CardPhaseMetric {
  return parseCardPhaseMetric(new URLSearchParams(search).get('pm'));
}

function LoadingScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-10 text-[color:var(--color-text-muted)]">
      Loading metrics...
    </main>
  );
}

function ErrorScreen({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Unknown error';

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-3 px-6 py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
        Metrics unavailable
      </p>
      <h1 className="font-serif text-4xl text-[color:var(--color-accent-bright)]">
        Could not load stats data
      </h1>
      <p className="text-sm leading-6 text-[color:var(--color-text-muted)]">{message}</p>
    </main>
  );
}

function NotFoundScreen() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center gap-3 px-6 py-10">
      <p className="text-xs uppercase tracking-[0.24em] text-[color:var(--color-text-muted)]">
        Not found
      </p>
      <h1 className="font-serif text-4xl text-[color:var(--color-accent-bright)]">
        Page not found
      </h1>
      <a className="text-sm text-[color:var(--color-accent-bright)]" href="/">
        Back to hero overview
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

  if (metric === 'phase') {
    return ['item_phase_value', 'item_phase_inclusion'];
  }

  if (metric === 'enchants') {
    return ['enchant_uplift'];
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
  const requestedPhaseMetric = parseCardPhaseMetric(params.get('pm'));
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialMetricLabels = getCardMetricLabels(requestedMetric);
  const initialTierOptions =
    initialMetricLabels.length === 1
      ? getAvailableTiers(data.manifest, initialSelectedWindow, initialMetricLabels[0]!)
      : getCommonAvailableTiers(data.manifest, initialSelectedWindow, initialMetricLabels);
  const initialSelectedTier = getInitialTier(initialTierOptions, search);

  return (
    <CardWinrateDashboard
      locale={locale}
      manifest={data.manifest}
      initialSelectedMetric={requestedMetric}
      initialSelectedPhaseMetric={requestedPhaseMetric}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      source={data.source}
      winrateByWindow={data.winrateByWindow}
      upliftByWindow={data.upliftByWindow}
      inclusionByWindow={data.inclusionByWindow}
      phaseValueByWindow={data.phaseValueByWindow}
      phaseInclusionByWindow={data.phaseInclusionByWindow}
      enchantByWindow={data.enchantByWindow}
    />
  );
}

function ArchetypesPage({
  client,
  locale,
  search,
}: {
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
}) {
  const { data, error, isLoading } = usePageQuery(
    ['archetypes', locale],
    () => loadArchetypesPageData(client, locale)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <ErrorScreen error={error} />;
  }

  return <ArchetypesDashboard data={data} locale={locale} search={search} />;
}

function ArchetypesDashboard({
  data,
  locale,
  search,
}: {
  data: ArchetypesPageData;
  locale: Locale;
  search: string;
}) {
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialTierOptions = getCommonAvailableTiers(data.manifest, initialSelectedWindow, [
    'archetype_winrate',
    'archetypes',
  ]);
  const initialSelectedTier = getInitialTier(initialTierOptions, search);

  return (
    <ArchetypeDashboard
      locale={locale}
      manifest={data.manifest}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      source={data.source}
      rowsByWindow={data.rowsByWindow}
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

function HeroDetailPage({
  client,
  locale,
  route,
  search,
}: {
  client: RuntimeMetricsClient;
  locale: Locale;
  route: Extract<SpaRoute, { page: 'hero-detail' }>;
  search: string;
}) {
  const { data, error, isLoading } = usePageQuery(
    ['hero-detail', locale],
    () => loadHeroDetailPageData(client, locale)
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return <ErrorScreen error={error} />;
  }

  return <HeroDetailDashboardView data={data} locale={locale} route={route} search={search} />;
}

function HeroDetailDashboardView({
  data,
  locale,
  route,
  search,
}: {
  data: HeroDetailPageData;
  locale: Locale;
  route: Extract<SpaRoute, { page: 'hero-detail' }>;
  search: string;
}) {
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const dailyTiers = getAvailableTiersForWindowlessMetric(data.manifest, 'hero_winrate_daily');
  const initialSelectedTier = getInitialTier(dailyTiers, search);
  const initialSelectedMetric = getInitialCardMetric(search);

  return (
    <HeroDetailDashboard
      hero={route.hero}
      locale={locale}
      manifest={data.manifest}
      source={data.source}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      initialSelectedMetric={initialSelectedMetric}
      dailyByTier={data.dailyByTier}
      overviewByWindow={data.overviewByWindow}
      winrateByWindow={data.winrateByWindow}
      upliftByWindow={data.upliftByWindow}
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

  if (route.page === 'archetypes') {
    return <ArchetypesPage client={client} locale={locale} search={location.search} />;
  }

  if (route.page === 'builds') {
    return <BuildsPage client={client} locale={locale} search={location.search} />;
  }

  if (route.page === 'hero-detail') {
    return <HeroDetailPage client={client} locale={locale} route={route} search={location.search} />;
  }

  return <NotFoundScreen />;
}
