import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import MetricFilterBar from '../src/components/MetricFilterBar';

describe('MetricFilterBar', () => {
  test('renders shared window and tier filter links for the current route', () => {
    render(
      <MetricFilterBar
        locale="zh"
        title="Card winrate"
        metricLabel="item_winrate"
        routeBase="/cards"
        windowOptions={['1d', '3d']}
        tierOptions={['all', 'high']}
        selectedWindow="3d"
        selectedTier="high"
      />
    );

    expect(screen.getAllByText('Card winrate')).toHaveLength(1);
    expect(screen.getByRole('link', { name: '1D' })).toHaveAttribute(
      'href',
      '/cards?t=high'
    );
    expect(screen.getByRole('link', { name: 'All players' })).toHaveAttribute(
      'href',
      '/cards?w=3d'
    );
    expect(screen.getByRole('link', { name: 'High rank' }).className).toContain(
      'text-[color:#130f08]'
    );
  });

  test('renders hero choices as color-dot short labels in compact and full layouts', () => {
    const { rerender } = render(
      <MetricFilterBar
        compact
        locale="zh"
        title="Scope"
        metricLabel="item_winrate"
        routeBase="/cards"
        windowOptions={['1d']}
        tierOptions={['all']}
        selectedWindow="1d"
        selectedTier="all"
        heroOptions={['all', 'Mak']}
        selectedHero="Mak"
        onHeroSelect={() => {}}
      />
    );

    const compactHeroButton = screen.getByRole('button', { name: 'Mak' });
    expect(compactHeroButton).toHaveAttribute('aria-pressed', 'true');
    expect(compactHeroButton.querySelector('[data-hero-short-label="MAK"]')).not.toBeNull();
    expect(compactHeroButton.querySelector('[data-hero-color-dot="Mak"]')).not.toBeNull();
    expect(screen.getByRole('button', { name: 'All heroes' })).toBeInTheDocument();

    rerender(
      <MetricFilterBar
        locale="en"
        title="Final builds"
        metricLabel="final_builds"
        routeBase="/builds"
        windowOptions={['3d']}
        tierOptions={['high']}
        selectedWindow="3d"
        selectedTier="high"
        heroOptions={['all', 'Jules']}
        selectedHero="Jules"
        onHeroSelect={() => {}}
      />
    );

    const fullHeroButton = screen.getByRole('button', { name: 'Jules' });
    expect(fullHeroButton).toHaveAttribute('aria-pressed', 'true');
    expect(fullHeroButton.querySelector('[data-hero-short-label="JUL"]')).not.toBeNull();
    expect(fullHeroButton.querySelector('[data-hero-color-dot="Jules"]')).not.toBeNull();
  });
});
