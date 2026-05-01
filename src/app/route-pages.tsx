import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import FinalBuildDashboard from '../features/builds/FinalBuildDashboard';
import CardAnalysisDashboard from '../features/cards/CardAnalysisDashboard';
import HeroOverviewDashboard from '../features/heroes/HeroOverviewDashboard';
import {
  type CardDictionary,
  getAvailableTiers,
  getAvailableWindows,
  getCardMetricPayloadMetric,
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

type ManifestDictionaryPageData = {
  manifest: ManifestPayload;
  source: ReturnType<RuntimeMetricsClient['getSource']>;
  cardDictionary: CardDictionary;
};

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

export function getManifestDictionaryProgress(
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

function useManifestDictionaryPageData(client: RuntimeMetricsClient): {
  data: ManifestDictionaryPageData | undefined;
  error: unknown;
  isLoading: boolean;
  progress: PageLoadProgress;
} {
  const manifestQuery = usePageQuery(
    ['metrics-manifest'],
    (signal) => client.getManifest({ signal })
  );
  const dictionaryQuery = usePageQuery(
    ['card-dictionary'],
    (signal) => client.getCardDictionary({ signal })
  );
  const progress = getManifestDictionaryProgress(
    Boolean(manifestQuery.data),
    Boolean(dictionaryQuery.data)
  );
  const data = manifestQuery.data && dictionaryQuery.data
    ? {
        manifest: manifestQuery.data,
        source: client.getSource(),
        cardDictionary: dictionaryQuery.data,
      }
    : undefined;

  return {
    data,
    error: manifestQuery.error ?? dictionaryQuery.error,
    isLoading: manifestQuery.isLoading || dictionaryQuery.isLoading,
    progress,
  };
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

  return <HeroOverviewRouteContent data={data} locale={locale} search={search} />;
}

function HeroOverviewRouteContent({
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
    <HeroOverviewDashboard
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
  const { data, error, isLoading, progress } = useManifestDictionaryPageData(client);

  if (isLoading) {
    return <LoadingScreen locale={locale} progress={progress} />;
  }

  if (!data) {
    return <ErrorScreen locale={locale} error={error} />;
  }

  return (
    <CardsDashboard
      data={data}
      client={client}
      locale={locale}
      search={search}
    />
  );
}

function CardsDashboard({
  data,
  client,
  locale,
  search,
}: {
  data: ManifestDictionaryPageData;
  client: RuntimeMetricsClient;
  locale: Locale;
  search: string;
}) {
  const params = new URLSearchParams(search);
  const requestedMetric = parseCardMetric(params.get('m'));
  const initialSelectedWindow = getInitialWindow(data.manifest, search);
  const initialMetricKey = getCardMetricPayloadMetric(requestedMetric);
  const initialTierOptions = getAvailableTiers(
    data.manifest,
    initialSelectedWindow,
    initialMetricKey
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
  const { data, error, isLoading, progress } = useManifestDictionaryPageData(client);

  if (isLoading) {
    return <LoadingScreen locale={locale} progress={progress} />;
  }

  if (!data) {
    return <ErrorScreen locale={locale} error={error} />;
  }

  return (
    <BuildsDashboard
      data={data}
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
  data: ManifestDictionaryPageData;
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
