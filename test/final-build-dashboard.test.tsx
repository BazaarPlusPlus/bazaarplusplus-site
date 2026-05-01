import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, test } from 'vitest';

import FinalBuildDashboard from '../src/features/builds/FinalBuildDashboard';
import type { FinalBuildViewRow, ManifestPayload } from '../src/shared/lib/metrics';

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('FinalBuildDashboard', () => {
  test('switches build datasets when the active filters change', () => {
    window.history.replaceState({}, '', '/builds?w=3d&t=high');

    const manifest: ManifestPayload = {
      generatedAt: '2026-04-18T18:57:46Z',
      current_patch_id: null,
      windows: {
        '1d': {
          start: '2026-04-17T00:00:00Z',
          end: '2026-04-18T00:00:00Z',
          patch_transition: false,
        },
        '3d': {
          start: '2026-04-15T00:00:00Z',
          end: '2026-04-18T00:00:00Z',
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
          path: 'final_builds/3d/high.json',
          metric: 'final_builds',
          window: '3d',
          rating_tier: 'high',
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

    const allRows: FinalBuildViewRow[] = [
      {
        hero: 'Dooley',
        sig: 'card-a|card-b',
        run_count: 11,
        p75_run_days: 14.5,
        gold_score: 0.1713728724,
        rank: 1,
        representative_user_account_id: 'acct-dooley',
        representative_user_display_name: 'Dooley Builder',
        representative_user_run_count: 4,
        item_count: 2,
        slot_count: 5,
        is_complete_build: false,
        buildCards: [
          {
            id: 'card-a',
            name: 'Amber Core',
            imageUrl: 'https://img.example/a.png',
            socket: 0,
            slotSize: 2,
            tier: 'Gold',
          },
          {
            id: 'card-b',
            name: 'Eagle Talisman',
            imageUrl: 'https://img.example/b.png',
            socket: 2,
            slotSize: 3,
            tier: 'Diamond',
          },
        ],
        cardNames: ['Amber Core', 'Eagle Talisman'],
      },
      {
        hero: 'Vanessa',
        sig: 'card-c|card-d',
        run_count: 22,
        p75_run_days: 10,
        gold_score: 0.431,
        rank: 2,
        representative_user_account_id: null,
        representative_user_display_name: null,
        representative_user_run_count: null,
        item_count: 2,
        slot_count: 10,
        is_complete_build: true,
        buildCards: [
          { id: 'card-c', name: 'Caltrops', imageUrl: 'https://img.example/c.png' },
          { id: 'card-d', name: 'Crow\'s Nest', imageUrl: 'https://img.example/d.png' },
        ],
        cardNames: ['Caltrops', "Crow's Nest"],
      },
    ];

    const highRows: FinalBuildViewRow[] = [
      {
        hero: 'Mak',
        sig: 'card-x|card-y',
        run_count: 3,
        p75_run_days: 8,
        gold_score: 0.998,
        rank: 1,
        representative_user_account_id: null,
        representative_user_display_name: null,
        representative_user_run_count: null,
        item_count: 2,
        slot_count: 10,
        is_complete_build: true,
        buildCards: [
          { id: 'card-x', name: 'Chronobarrier', imageUrl: 'https://img.example/x.png' },
          { id: 'card-y', name: 'Stove', imageUrl: 'https://img.example/y.png' },
        ],
        cardNames: ['Chronobarrier', 'Stove'],
      },
    ];

    renderWithQueryClient(
      <FinalBuildDashboard
        locale="en"
        manifest={manifest}
        initialSelectedTier="all"
        initialSelectedWindow="3d"
        source="remote"
        rowsByWindow={{
          '1d': {
            all: { rowCount: 1, rows: allRows },
          },
          '3d': {
            all: { rowCount: 1, rows: allRows },
            high: { rowCount: 1, rows: highRows },
          },
        }}
      />
    );

    expect(screen.queryByText('Top build hero')).not.toBeInTheDocument();
    expect(screen.queryByText('Tracked builds')).not.toBeInTheDocument();
    expect(screen.queryByText('Coverage window')).not.toBeInTheDocument();
    expect(screen.queryByText('Metric:')).not.toBeInTheDocument();
    expect(screen.queryByText('final_builds')).not.toBeInTheDocument();
    const scopeFilters = screen.getByRole('region', { name: 'Build scope filters' });
    expect(within(scopeFilters).getByText('Window')).toBeInTheDocument();
    expect(within(scopeFilters).queryByText('Time window')).not.toBeInTheDocument();
    const tierGroup = within(scopeFilters).getByRole('group', { name: 'Tier' });
    expect(within(tierGroup).queryByRole('button', { name: 'High rank' })).not.toBeInTheDocument();
    expect(within(tierGroup).getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(within(tierGroup).getByRole('button', { name: 'High' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('cell', { name: 'Mak' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'P75 days' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(screen.getByRole('cell', { name: 'Dooley' })).toBeInTheDocument();
    const amberCoreImage = screen.getByRole('img', { name: 'Amber Core' });
    expect(amberCoreImage.closest('[title="Amber Core"]')).not.toBeNull();
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent);
    expect(headers.at(-1)).toContain('Contributor');
    expect(screen.getByText('Dooley Builder')).toBeInTheDocument();
    expect(screen.queryByText('4 runs')).not.toBeInTheDocument();
    expect(screen.queryByText('5/10 slots')).not.toBeInTheDocument();
    expect(screen.queryByText(/Turbo/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vanessa' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Vanessa' }));
    expect(screen.queryByRole('cell', { name: 'Dooley' })).not.toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Vanessa' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'All heroes' })).not.toBeInTheDocument();
    const heroGroup = within(scopeFilters).getByRole('group', { name: 'Hero' });
    fireEvent.click(within(heroGroup).getByRole('button', { name: 'All' }));
    fireEvent.click(screen.getByRole('button', { name: 'Runs' }));
    const dataRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Dooley') || row.textContent?.includes('Vanessa'));
    expect(dataRows[0]?.textContent).toContain('Vanessa');
    expect(window.location.search).toBe('?lang=en');
  });
});
