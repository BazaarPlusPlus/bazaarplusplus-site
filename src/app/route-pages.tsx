import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import FinalBuildDashboard from '../features/builds/FinalBuildDashboard';
import CardAnalysisDashboard from '../features/cards/CardAnalysisDashboard';
import DailyHeroDashboard from '../features/heroes/DailyHeroDashboard';
import {
  type CardDictionary,
  getAvailableTiers,
  getAvailableWindows,
  parseCardMetric,
  parseMetricWindow,
  parseRatingTier,
  type CardMetric,
  type Locale,
  type ManifestPayload,
  type MetricWindow,
  type RatingTier,
} from '../shared/lib/metrics';
import type { RuntimeMetricsClient } from '../shared/lib/metrics-client';
import {
  loadHeroOverviewPageData,
  type HeroOverviewPageData,
  type PageLoadProgress,
} from './page-data';
import { ErrorScreen, LoadingScreen } from './screens';

type RoutePageProps = {
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
};

type CardsPageData = {
  manifest: ManifestPayload;
  source: ReturnType<RuntimeMetricsClient['getSource']>;
  cardDictionary: CardDictionary;
};

type BuildsPageData = CardsPageData;

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

function usePageQuery<T>(
  queryKey: readonly unknown[],
  queryFn: (signal: AbortSignal) => Promise<T>
): { data: T | undefined; error: unknown; isLoading: boolean } {
  return useQuery({
    queryKey,
    queryFn: ({ signal }) => queryFn(signal),
  });
}

function getCombinedProgress(
  manifestLoaded: boolean,
  dictionaryLoaded: boolean
): PageLoadProgress {
  const completed = Number(manifestLoaded) + Number(dictionaryLoaded);
  const label = !manifestLoaded
    ? 'Loading manifest'
    : !dictionaryLoaded
      ? 'Loading card dictionary'
      : 'Loaded card dictionary';

  return { completed, total: 2, label };
}

export function HeroOverviewPage({ client, locale, search }: RoutePageProps) {
  const [progress, setProgress] = useState<PageLoadProgress | undefined>();
  const { data, error, isLoading } = usePageQuery(
    ['hero-overview'],
    (signal) => loadHeroOverviewPageData(client, { onProgress: setProgress, signal })
  );

  if (isLoading) {
    return <LoadingScreen locale={locale} progress={progress} />;
  }

  if (!data) {
    return <ErrorScreen locale={locale} error={error} />;
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

export function CardsPage({ client, locale, search }: RoutePageProps) {
  const manifestQuery = usePageQuery(
    ['metrics-manifest'],
    (signal) => client.getManifest({ signal })
  );
  const dictionaryQuery = usePageQuery(
    ['card-dictionary'],
    (signal) => client.getCardDictionary({ signal })
  );
  const progress = getCombinedProgress(Boolean(manifestQuery.data), Boolean(dictionaryQuery.data));

  if (manifestQuery.isLoading || dictionaryQuery.isLoading) {
    return <LoadingScreen locale={locale} progress={progress} />;
  }

  if (!manifestQuery.data || !dictionaryQuery.data) {
    return <ErrorScreen locale={locale} error={manifestQuery.error ?? dictionaryQuery.error} />;
  }

  return (
    <CardsDashboard
      data={{
        manifest: manifestQuery.data,
        source: client.getSource(),
        cardDictionary: dictionaryQuery.data,
      }}
      client={client}
      locale={locale}
      search={search}
    />
  );
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
  client,
  locale,
  search,
}: {
  data: CardsPageData;
  client: RuntimeMetricsClient;
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
    <CardAnalysisDashboard
      locale={locale}
      manifest={data.manifest}
      initialSelectedMetric={requestedMetric}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
      source={data.source}
      client={client}
      cardDictionary={data.cardDictionary}
    />
  );
}

export function BuildsPage({ client, locale, search }: RoutePageProps) {
  const manifestQuery = usePageQuery(
    ['metrics-manifest'],
    (signal) => client.getManifest({ signal })
  );
  const dictionaryQuery = usePageQuery(
    ['card-dictionary'],
    (signal) => client.getCardDictionary({ signal })
  );
  const progress = getCombinedProgress(Boolean(manifestQuery.data), Boolean(dictionaryQuery.data));

  if (manifestQuery.isLoading || dictionaryQuery.isLoading) {
    return <LoadingScreen locale={locale} progress={progress} />;
  }

  if (!manifestQuery.data || !dictionaryQuery.data) {
    return <ErrorScreen locale={locale} error={manifestQuery.error ?? dictionaryQuery.error} />;
  }

  return (
    <BuildsDashboard
      data={{
        manifest: manifestQuery.data,
        source: client.getSource(),
        cardDictionary: dictionaryQuery.data,
      }}
      client={client}
      locale={locale}
      search={search}
    />
  );
}

function BuildsDashboard({
  data,
  client,
  locale,
  search,
}: {
  data: BuildsPageData;
  client: RuntimeMetricsClient;
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
      client={client}
      cardDictionary={data.cardDictionary}
    />
  );
}
