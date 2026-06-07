import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import HeroOverviewDashboard from '../features/heroes/HeroOverviewDashboard';
import {
  parseMetricWindow,
  parseRatingTier,
  type Locale,
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

function getInitialWindow(availableWindows: MetricWindow[], search: string): MetricWindow {
  const requestedWindow = parseMetricWindow(new URLSearchParams(search).get('w'));
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
  const initialSelectedWindow = getInitialWindow(data.availableWindows, search);
  const initialSelectedTier = getInitialTier(data.availableTiers, search);

  return (
    <HeroOverviewDashboard
      locale={locale}
      manifest={data.manifest}
      days={data.days}
      latestCompleteDay={data.latestCompleteDay}
      availableWindows={data.availableWindows}
      availableTiers={data.availableTiers}
      coverage={data.coverage}
      initialSelectedWindow={initialSelectedWindow}
      initialSelectedTier={initialSelectedTier}
    />
  );
}
