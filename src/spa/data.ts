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
} from '../lib/metrics';
import type { RuntimeMetricsClient } from '../lib/metrics-client';

type ViewPayload<T> = {
  rowCount: number;
  rows: T[];
};

type WindowTierMap<T> = Partial<Record<MetricWindow, Partial<Record<RatingTier, T>>>>;
type ViewWindowTierMap<T> = WindowTierMap<ViewPayload<T>>;

type PageDataBase = {
  manifest: ManifestPayload;
  source: MetricsSource;
};

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

async function loadWindowTierMap<T>(
  manifest: ManifestPayload,
  metric: string,
  loadPayload: (window: MetricWindow, tier: RatingTier) => Promise<T>
): Promise<WindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getAvailableTiers(manifest, window, metric).map(async (tier) => [
            tier,
            await loadPayload(window, tier),
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
  loadRows: (window: MetricWindow, tier: RatingTier) => Promise<ViewPayload<T>>
): Promise<ViewWindowTierMap<T>> {
  const availableWindows = getAvailableWindows(manifest);
  const entries = await Promise.all(
    availableWindows.map(async (window) => [
      window,
      Object.fromEntries(
        await Promise.all(
          getCommonAvailableTiers(manifest, window, metrics).map(async (tier) => [
            tier,
            await loadRows(window, tier),
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
  loadPayload: (window: MetricWindow, tier: RatingTier) => Promise<TPayload>,
  mapRows: (payload: TPayload) => TRow[]
): Promise<ViewWindowTierMap<TRow>> {
  return loadCommonWindowTierViewMap(manifest, [metric], async (window, tier) => {
    const payload = await loadPayload(window, tier);
    return {
      rowCount: payload.rowCount,
      rows: mapRows(payload),
    };
  });
}

export async function loadHeroOverviewPageData(
  client: RuntimeMetricsClient
): Promise<HeroOverviewPageData> {
  const manifest = await client.getManifest();
  const availableWindows = getAvailableWindows(manifest);
  const availableTiers = getAvailableTiersForWindowlessMetric(manifest, 'hero_winrate_daily');

  const [dailyEntries, overviewByWindow] = await Promise.all([
    Promise.all(
      availableTiers.map(async (tier) => [tier, await client.getHeroWinrateDaily(tier)] as const)
    ),
    loadWindowTierMap(manifest, 'hero_overview', client.getHeroOverview),
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
  locale: Locale
): Promise<CardsPageData> {
  const [manifest, cardDictionary] = await Promise.all([
    client.getManifest(),
    client.getCardDictionary(),
  ]);

  const [
    winrateByWindow,
    upliftByWindow,
    inclusionByWindow,
  ] = await Promise.all([
    loadMetricViewMap(manifest, 'item_winrate', client.getCardWinrate, (payload) =>
      buildCardWinrateViewRows(payload, cardDictionary, locale)
    ),
    loadMetricViewMap(manifest, 'item_uplift', client.getItemUplift, (payload) =>
      buildItemUpliftViewRows(payload, cardDictionary, locale)
    ),
    loadMetricViewMap(manifest, 'item_inclusion', client.getItemInclusion, (payload) =>
      buildItemInclusionViewRows(payload, cardDictionary, locale)
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
  locale: Locale
): Promise<BuildsPageData> {
  const [manifest, cardDictionary] = await Promise.all([
    client.getManifest(),
    client.getCardDictionary(),
  ]);
  const rowsByWindow = await loadMetricViewMap(manifest, 'final_builds', client.getFinalBuilds, (payload) =>
    buildFinalBuildViewRows(payload, cardDictionary, locale)
  );

  return {
    manifest,
    source: client.getSource(),
    rowsByWindow,
  };
}
