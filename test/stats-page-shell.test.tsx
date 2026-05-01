import { render, screen, within } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import StatsPageShell from '../src/shared/components/StatsPageShell';

describe('StatsPageShell', () => {
  test('renders shared navigation and highlights the active section', () => {
    render(
      <StatsPageShell
        activeSection="cards"
        locale="zh"
        eyebrow="BazaarPlusPlus analytics"
        title="Card winrate"
        source="remote"
        generatedAt="2026-04-18T18:57:46Z"
        filters={<div>Filters slot</div>}
      >
        <div>Table slot</div>
      </StatsPageShell>
    );

    const cardsLink = screen.getByRole('link', { name: '卡牌数据' });
    expect(cardsLink).toHaveAttribute('href', '/cards');
    expect(screen.getByRole('link', { name: '英雄数据' })).toHaveAttribute(
      'href',
      '/heroes'
    );
    expect(screen.getByRole('link', { name: '终局构筑' })).toHaveAttribute(
      'href',
      '/builds'
    );
    expect(
      within(screen.getByRole('navigation', { name: '主要导航' })).queryByText('Analytics')
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Archetypes' })).not.toBeInTheDocument();
    expect(cardsLink.className).toContain('text-[color:var(--color-accent-bright)]');
    expect(screen.getByText('实时数据')).toBeInTheDocument();
    expect(screen.getByText('BazaarPlusPlus analytics')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Card winrate' }).className).not.toContain(
      'sr-only'
    );
    expect(screen.getByText('Filters slot')).toBeInTheDocument();
    expect(screen.getByText('Table slot')).toBeInTheDocument();
  });
});
