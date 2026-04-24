import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import ArchetypeDashboard from '../src/components/ArchetypeDashboard';
import type { ArchetypeViewRow, ManifestPayload } from '../src/lib/metrics';

describe('ArchetypeDashboard', () => {
  test('switches the visible archetype dataset when filters change', () => {
    window.history.replaceState({}, '', '/archetypes?w=3d&t=high');

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
          path: 'archetype_winrate/1d/all.json',
          metric: 'archetype_winrate',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'archetypes/1d/all.json',
          metric: 'archetypes',
          window: '1d',
          rating_tier: 'all',
          rowCount: 1,
        },
        {
          path: 'archetype_winrate/3d/high.json',
          metric: 'archetype_winrate',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'archetypes/3d/high.json',
          metric: 'archetypes',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
      ],
    };

    const allRows: ArchetypeViewRow[] = [
      {
        hero: 'Dooley',
        archetype_id: 'arch-1',
        runs: 55,
        wins_10w: 54,
        win_rate: 0.9818181818,
        win_rate_wilson_lower: 0.9039399953,
        p75_run_days: 13.75,
        hero_total_10w: 782,
        defining_card_names: ['Amber Core'],
        thumb_cards: [{ id: 'card-a', name: 'Amber Core', imageUrl: 'https://img.example/a.png', cardSize: 'medium' }],
      },
      {
        hero: 'Vanessa',
        archetype_id: 'arch-3',
        runs: 88,
        wins_10w: 40,
        win_rate: 0.4545,
        win_rate_wilson_lower: 0.39,
        p75_run_days: 15,
        hero_total_10w: 490,
        defining_card_names: ['Stove'],
        thumb_cards: [{ id: 'card-s', name: 'Stove', imageUrl: 'https://img.example/s.png', cardSize: 'small' }],
      },
    ];

    const highRows: ArchetypeViewRow[] = [
      {
        hero: 'Mak',
        archetype_id: 'arch-2',
        runs: 12,
        wins_10w: 9,
        win_rate: 0.75,
        win_rate_wilson_lower: 0.5,
        p75_run_days: 11,
        hero_total_10w: 50,
        defining_card_names: ['Chronobarrier'],
        thumb_cards: [{ id: 'card-c', name: 'Chronobarrier', imageUrl: 'https://img.example/c.png', cardSize: 'large' }],
      },
    ];

    render(
      <ArchetypeDashboard
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
    expect(screen.getByRole('button', { name: 'High rank' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('cell', { name: 'Mak' })).toBeInTheDocument();
    const makBadge = screen.getAllByText('MAK')[0]?.closest('[data-hero-badge="Mak"]');
    expect(makBadge).not.toBeNull();
    expect(makBadge?.querySelector('[data-hero-color-dot="Mak"]')).toHaveStyle({
      backgroundColor: '#bee65b',
    });

    fireEvent.click(screen.getByRole('button', { name: '1D' }));
    expect(screen.getByRole('cell', { name: 'Dooley' })).toBeInTheDocument();
    expect(screen.getAllByText('DOO')[0]?.closest('[data-hero-badge="Dooley"]')).not.toBeNull();
    expect(screen.getAllByTestId('card-thumb-group')[0]).toHaveAttribute('title', 'Amber Core');
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
    fireEvent.click(screen.getByRole('button', { name: 'Hero' }));
    const dataRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Dooley') || row.textContent?.includes('Vanessa'));
    expect(dataRows[0]?.textContent).toContain('Vanessa');
  });
});
