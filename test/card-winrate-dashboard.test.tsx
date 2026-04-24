import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import CardWinrateDashboard from '../src/components/CardWinrateDashboard';
import type {
  CardWinrateViewRow,
  EnchantUpliftViewRow,
  ItemInclusionViewRow,
  ItemUpliftViewRow,
  ManifestPayload,
  PhaseInclusionViewRow,
  PhaseValueViewRow,
} from '../src/lib/metrics';

describe('CardWinrateDashboard', () => {
  test('switches card workspace views and phase subview from live browser state', async () => {
    window.history.replaceState({}, '', '/cards?w=3d&t=high&m=phase&pm=inclusion&lang=zh');

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
          path: 'item_winrate/3d/all.json',
          metric: 'item_winrate',
          window: '3d',
          rating_tier: 'all',
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
        {
          path: 'item_phase_value/3d/high.json',
          metric: 'item_phase_value',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'item_phase_inclusion/3d/high.json',
          metric: 'item_phase_inclusion',
          window: '3d',
          rating_tier: 'high',
          rowCount: 1,
        },
        {
          path: 'enchant_uplift/3d/high.json',
          metric: 'enchant_uplift',
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

    const phaseValueRows: PhaseValueViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card-phase-value',
        phase: 'early',
        appearances: 63,
        wins: 32,
        win_rate: 0.5079365079,
        win_rate_wilson_lower: 0.3876267711,
        display_name: 'Flashpoint',
        image_url: 'https://img.example/flashpoint.png',
        card_size: 'small',
      },
    ];

    const phaseInclusionRows: PhaseInclusionViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card-phase-inclusion',
        phase: 'early',
        hero_battles_in_phase: 44512,
        battles_with_card: 11203,
        inclusion_rate: 0.2516831416,
        display_name: 'Stabilizer',
        image_url: 'https://img.example/stabilizer.png',
        card_size: 'large',
      },
    ];

    const enchantRows: EnchantUpliftViewRow[] = [
      {
        hero: 'Mak',
        template_id: 'card-enchant',
        enchant: 'Toxic',
        appearances: 53,
        wins: 47,
        win_rate: 0.8867924528,
        win_rate_wilson_lower: 0.774232297,
        uplift_vs_unenchanted: 0.1132,
        display_name: 'Amber Core',
        image_url: 'https://img.example/amber-core-toxic.png',
        card_size: 'large',
      },
    ];

    render(
      <CardWinrateDashboard
        locale="zh"
        manifest={manifest}
        initialSelectedMetric="winrate"
        initialSelectedPhaseMetric="value"
        initialSelectedTier="all"
        initialSelectedWindow="1d"
        source="local"
        winrateByWindow={{
          '1d': {
            all: { rowCount: 1, rows: winrateRows },
          },
          '3d': {
            all: { rowCount: 1, rows: winrateRows },
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
        phaseValueByWindow={{
          '3d': {
            high: { rowCount: 1, rows: phaseValueRows },
          },
        }}
        phaseInclusionByWindow={{
          '3d': {
            high: { rowCount: 1, rows: phaseInclusionRows },
          },
        }}
        enchantByWindow={{
          '3d': {
            high: { rowCount: 1, rows: enchantRows },
          },
        }}
      />
    );

    expect(screen.getAllByRole('button', { name: 'Phase' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Inclusion' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: '3D' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'High rank' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('25.2%')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Value' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Value' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('50.8%')).toBeInTheDocument();
    expect(window.location.search).not.toContain('pm=');

    fireEvent.click(screen.getByRole('button', { name: 'Enchants' }));
    expect(screen.getByRole('button', { name: 'Enchants' })).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('Toxic')).toBeInTheDocument();
    expect(screen.getByText('11.3%')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: 'Win rate' })[0]!);
    expect(screen.getAllByRole('button', { name: 'Win rate' })[0]).toHaveAttribute('aria-pressed', 'true');
    expect(await screen.findByText('62.8%')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Eagle Talisman' })).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Win rate' })[1]!);
    const cardRows = screen
      .getAllByRole('row')
      .filter((row) => row.textContent?.includes('Eagle Talisman') || row.textContent?.includes('Brass Bug'));
    expect(cardRows[0]?.textContent).toContain('Brass Bug');
    expect(window.location.search).toContain('lang=zh');
    expect(window.location.search).not.toContain('m=phase');
    expect(window.location.search).not.toContain('pm=');
  });
});
