import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test, vi } from 'vitest';

import { BuildsPage, CardsPage, getManifestDictionaryProgress } from '../src/app/route-pages';
import type {
  CardDictionary,
  CardWinratePayload,
  FinalBuildsPayload,
  ItemInclusionPayload,
  ItemUpliftPayload,
  ManifestPayload,
} from '../src/shared/lib/metrics';
import type { RuntimeMetricsClient } from '../src/shared/lib/metrics-client';

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
        gcTime: Number.POSITIVE_INFINITY,
      },
    },
  });
}

function renderWithQueryClient(ui: ReactNode, queryClient = makeQueryClient()) {
  return {
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}

describe('route page data queries', () => {
  test('reports shared manifest and card dictionary loading progress', () => {
    expect(getManifestDictionaryProgress(false, false)).toEqual({
      completed: 0,
      total: 2,
      label: 'Loading manifest',
    });
    expect(getManifestDictionaryProgress(true, false)).toEqual({
      completed: 1,
      total: 2,
      label: 'Loading card dictionary',
    });
    expect(getManifestDictionaryProgress(true, true)).toEqual({
      completed: 2,
      total: 2,
      label: 'Loaded card dictionary',
    });
  });

  test('CardsPage loads only the selected card metric payload and reuses raw data across locale changes', async () => {
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:46:33Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: [
        {
          path: 'item_winrate/1d/all.json',
          metric: 'item_winrate',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'item_uplift/1d/all.json',
          metric: 'item_uplift',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'item_inclusion/1d/all.json',
          metric: 'item_inclusion',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
      ],
    };
    const dictionary: CardDictionary = {
      'card-a': {
        name: { en: 'Amber Core', zh: '琥珀核心' },
        image_url: 'https://img.example/card-a.webp',
        size: 'medium',
      },
    };
    const winratePayload: CardWinratePayload = {
      metric: 'item_winrate',
      generatedAt: manifest.generatedAt,
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          template_id: 'card-a',
          appearances: 12,
          wins: 9,
          win_rate: 0.75,
          win_rate_wilson_lower: 0.7,
        },
      ],
    };
    const upliftPayload: ItemUpliftPayload = {
      metric: 'item_uplift',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const inclusionPayload: ItemInclusionPayload = {
      metric: 'item_inclusion',
      generatedAt: manifest.generatedAt,
      rowCount: 0,
      rows: [],
    };
    const client = {
      getSource: () => 'remote',
      getManifest: vi.fn(async () => manifest),
      getCardDictionary: vi.fn(async () => dictionary),
      getCardWinrate: vi.fn(async () => winratePayload),
      getItemUplift: vi.fn(async () => upliftPayload),
      getItemInclusion: vi.fn(async () => inclusionPayload),
      getHeroWinrateDaily: vi.fn(),
      getHeroOverview: vi.fn(),
      getFinalBuilds: vi.fn(),
    } satisfies RuntimeMetricsClient;
    const queryClient = makeQueryClient();
    const { rerender } = renderWithQueryClient(
      <CardsPage client={client} locale="en" search="?w=1d&t=all&m=winrate&lang=en" />,
      queryClient
    );

    expect(await screen.findByText('Amber Core')).toBeInTheDocument();
    expect(client.getCardWinrate).toHaveBeenCalledTimes(1);
    expect(client.getItemUplift).not.toHaveBeenCalled();
    expect(client.getItemInclusion).not.toHaveBeenCalled();

    rerender(
      <QueryClientProvider client={queryClient}>
        <CardsPage client={client} locale="zh" search="?w=1d&t=all&m=winrate" />
      </QueryClientProvider>
    );

    expect(await screen.findByText('琥珀核心')).toBeInTheDocument();
    await waitFor(() => {
      expect(client.getManifest).toHaveBeenCalledTimes(1);
      expect(client.getCardDictionary).toHaveBeenCalledTimes(1);
      expect(client.getCardWinrate).toHaveBeenCalledTimes(1);
    });
  });

  test('BuildsPage loads only the selected final builds payload and reuses raw data across locale changes', async () => {
    const manifest: ManifestPayload = {
      generatedAt: '2026-04-25T14:46:33Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-24T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
        '3d': {
          start: '2026-04-22T00:00:00Z',
          end: '2026-04-25T00:00:00Z',
          patch_transition: false,
        },
      },
      files: [
        {
          path: 'final_builds/1d/all.json',
          metric: 'final_builds',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'final_builds/3d/all.json',
          metric: 'final_builds',
          window: '3d',
          rating_tier: 'all',
          rowCount: 1,
        },
      ],
    };
    const dictionary: CardDictionary = {
      'card-a': {
        name: { en: 'Amber Core', zh: '琥珀核心' },
        image_url: 'https://img.example/card-a.webp',
        size: 'medium',
      },
    };
    const buildsPayload: FinalBuildsPayload = {
      metric: 'final_builds',
      generatedAt: manifest.generatedAt,
      rowCount: 1,
      rows: [
        {
          hero: 'Mak',
          sig: 'card-a',
          run_count: 5,
          p75_run_days: null,
          gold_score: 0.5,
          rank: 1,
          items: [
            {
              slot_index: 0,
              socket: 0,
              size: 2,
              template_id: 'card-a',
              tier: 'Gold',
              name: 'Amber Core',
            },
          ],
        },
      ],
    };
    const client = {
      getSource: () => 'remote',
      getManifest: vi.fn(async () => manifest),
      getCardDictionary: vi.fn(async () => dictionary),
      getFinalBuilds: vi.fn(async () => buildsPayload),
      getCardWinrate: vi.fn(),
      getItemUplift: vi.fn(),
      getItemInclusion: vi.fn(),
      getHeroWinrateDaily: vi.fn(),
      getHeroOverview: vi.fn(),
    } satisfies RuntimeMetricsClient;
    const queryClient = makeQueryClient();
    const { rerender } = renderWithQueryClient(
      <BuildsPage client={client} locale="en" search="?w=1d&t=all&lang=en" />,
      queryClient
    );

    expect(await screen.findByRole('img', { name: 'Amber Core' })).toBeInTheDocument();
    expect(client.getFinalBuilds).toHaveBeenCalledTimes(1);
    expect(client.getFinalBuilds).toHaveBeenCalledWith('1d', 'all', expect.any(Object));

    rerender(
      <QueryClientProvider client={queryClient}>
        <BuildsPage client={client} locale="zh" search="?w=1d&t=all" />
      </QueryClientProvider>
    );

    expect(await screen.findByRole('img', { name: '琥珀核心' })).toBeInTheDocument();
    await waitFor(() => {
      expect(client.getManifest).toHaveBeenCalledTimes(1);
      expect(client.getCardDictionary).toHaveBeenCalledTimes(1);
      expect(client.getFinalBuilds).toHaveBeenCalledTimes(1);
    });
  });
});
