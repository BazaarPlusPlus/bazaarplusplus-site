import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FinalBuildDashboard from '../src/components/FinalBuildDashboard';
import type { FinalBuildViewRow, ManifestPayload } from '../src/lib/metrics';

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
        build_cards: [
          { id: 'card-a', name: 'Amber Core', imageUrl: 'https://img.example/a.png' },
          { id: 'card-b', name: 'Eagle Talisman', imageUrl: 'https://img.example/b.png' },
        ],
        card_names: ['Amber Core', 'Eagle Talisman'],
      },
      {
        hero: 'Vanessa',
        sig: 'card-c|card-d',
        run_count: 22,
        p75_run_days: 10,
        gold_score: 0.431,
        rank: 2,
        build_cards: [
          { id: 'card-c', name: 'Caltrops', imageUrl: 'https://img.example/c.png' },
          { id: 'card-d', name: 'Crow\'s Nest', imageUrl: 'https://img.example/d.png' },
        ],
        card_names: ['Caltrops', "Crow's Nest"],
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
        build_cards: [
          { id: 'card-x', name: 'Chronobarrier', imageUrl: 'https://img.example/x.png' },
          { id: 'card-y', name: 'Stove', imageUrl: 'https://img.example/y.png' },
        ],
        card_names: ['Chronobarrier', 'Stove'],
      },
    ];

    render(
      <FinalBuildDashboard
        locale="en"
        manifest={manifest}
        initialSelectedTier="all"
        initialSelectedWindow="1d"
        source="local"
        rowsByWindow={{
          '1d': {
            all: { rowCount: 1, rows: allRows },
          },
          '3d': {
            high: { rowCount: 1, rows: highRows },
          },
        }}
      />
    );

    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('cell', { name: 'Mak' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(screen.getByRole('cell', { name: 'Dooley' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Amber Core' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Runs' }));
    const dataRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Dooley') || row.textContent?.includes('Vanessa'));
    expect(dataRows[0]?.textContent).toContain('Vanessa');
    expect(window.location.search).toBe('');
  });
});
