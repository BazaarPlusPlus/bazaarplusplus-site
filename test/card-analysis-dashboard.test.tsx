import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import CardAnalysisDashboard from '../src/features/cards/CardAnalysisDashboard';
import type {
  CardWinrateViewRow,
  ItemInclusionViewRow,
  ItemUpliftViewRow,
  ManifestPayload,
} from '../src/shared/lib/metrics';

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('CardAnalysisDashboard', () => {
  test('switches card workspace views and ignores removed phase state from the URL', async () => {
    window.history.replaceState({}, '', '/cards?w=3d&t=high&m=phase&pm=inclusion&hero=Mak');

    const manifest: ManifestPayload = {
      generatedAt: '2026-04-18T18:57:46Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-17T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
          patch_transition: false,
        },
        '3d': {
          start: '2026-04-15T18:57:46Z',
          end: '2026-04-18T18:57:46Z',
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
          path: 'item_winrate/1d/high.json',
          metric: 'item_winrate',
          window: '1d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'item_winrate/3d/all.json',
          metric: 'item_winrate',
          window: '3d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'item_winrate/3d/high.json',
          metric: 'item_winrate',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'item_uplift/3d/high.json',
          metric: 'item_uplift',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'item_inclusion/1d/all.json',
          metric: 'item_inclusion',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'item_inclusion/3d/high.json',
          metric: 'item_inclusion',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
      ],
    };

    const winrateRows: CardWinrateViewRow[] = [
      {
        hero: 'Jules',
        template_id: 'card-winrate',
        appearances: 25352,
        wins: 15932,
        win_rate: 0.6284316819,
        win_rate_wilson_lower: 0.6224642674,
        display_name: 'Eagle Talisman',
        image_url: 'https://img.example/eagle-talisman.png',
        card_size: 'medium',
      },
      {
        hero: 'Mak',
        template_id: 'card-winrate-2',
        appearances: 12000,
        wins: 9000,
        win_rate: 0.75,
        win_rate_wilson_lower: 0.741,
        display_name: 'Brass Bug',
        image_url: 'https://img.example/brass-bug.png',
        card_size: 'small',
      },
    ];

    const upliftRows: ItemUpliftViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card-uplift',
        runs_with: 130,
        runs_without: 162,
        win_rate_with: 0.8153,
        win_rate_without: 0.5308,
        uplift: 0.2845,
        uplift_ci_95_lower: 0.1827,
        uplift_ci_95_upper: 0.3862,
        display_name: 'Amber Core',
        image_url: 'https://img.example/amber-core.png',
        card_size: 'large',
      },
    ];

    const inclusionRows: ItemInclusionViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card-inclusion',
        runs_total_10w: 4609,
        runs_with_card: 3007,
        inclusion_rate: 0.6524191799,
        display_name: 'Fiery Conduit',
        image_url: 'https://img.example/fiery-conduit.png',
        card_size: 'medium',
      },
    ];

    renderWithQueryClient(
      <CardAnalysisDashboard
        locale="zh"
        manifest={manifest}
        initialSelectedMetric="winrate"
        initialSelectedTier="all"
        initialSelectedWindow="1d"
        source="remote"
        winrateByWindow={{
          '1d': {
            all: { rowCount: 1, rows: winrateRows },
          },
          '3d': {
            all: { rowCount: 1, rows: winrateRows },
            high: { rowCount: 1, rows: winrateRows },
          },
        }}
        upliftByWindow={{
          '3d': {
            high: { rowCount: 1, rows: upliftRows },
          },
        }}
        inclusionByWindow={{
          '1d': {
            all: { rowCount: 1, rows: inclusionRows },
          },
          '3d': {
            high: { rowCount: 1, rows: inclusionRows },
          },
        }}
      />
    );

    expect(screen.queryByText(/Single workspace for card win rate/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Top phase inclusion')).not.toBeInTheDocument();
    expect(screen.queryByText('Tracked rows')).not.toBeInTheDocument();
    expect(screen.queryByText('Coverage window')).not.toBeInTheDocument();
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { name: 'Card analysis' })).toHaveLength(1);
    expect(screen.getByText('Window')).toBeInTheDocument();
    expect(screen.queryByText('Time window')).not.toBeInTheDocument();
    expect(screen.queryByText('Scope')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Metric' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Phase' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Value' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Win rate' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    const scopeFilters = screen.getByRole('region', { name: 'Card scope filters' });
    const tierGroup = within(scopeFilters).getByRole('group', { name: 'Tier' });
    expect(tierGroup.parentElement?.className).toContain('gap-x-10');
    expect(within(tierGroup).getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(within(tierGroup).queryByRole('button', { name: 'Low' })).not.toBeInTheDocument();
    expect(within(tierGroup).queryByRole('button', { name: 'Mid' })).not.toBeInTheDocument();
    expect(within(tierGroup).getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'All players' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Low rank' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mid rank' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'High rank' })).not.toBeInTheDocument();
    const heroGroup = within(scopeFilters).getByRole('group', { name: 'Hero' });
    expect(within(heroGroup).getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mak' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'All heroes' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Enchants' })).not.toBeInTheDocument();
    expect(screen.queryByText('Wilson lower')).not.toBeInTheDocument();
    expect(await screen.findByText('75.0%')).toBeInTheDocument();
    expect(window.location.search).not.toContain('pm=');

    fireEvent.click(screen.getAllByRole('button', { name: 'Win rate' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Win rate' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('75.0%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Brass Bug' })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: 'Eagle Talisman' })).not.toBeInTheDocument();
    expect(window.location.search).toContain('hero=Mak');
    fireEvent.click(within(heroGroup).getByRole('button', { name: 'All' }));
    expect(await screen.findByText('62.8%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Eagle Talisman' })).toBeInTheDocument();
    expect(window.location.search).not.toContain('hero=');
    fireEvent.click(screen.getAllByRole('button', { name: 'Win rate' })[1]!);
    const cardRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Eagle Talisman') || row.textContent?.includes('Brass Bug'));
    expect(cardRows[0]?.textContent).toContain('Brass Bug');

    fireEvent.click(screen.getAllByRole('button', { name: 'Uplift' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Uplift' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('+28.4%')).toBeInTheDocument();
    expect(window.location.search).toContain('m=uplift');
    expect(window.location.search).not.toContain('lang=');
    expect(window.location.search).not.toContain('pm=');
  });
});
