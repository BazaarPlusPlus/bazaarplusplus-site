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
      '/cards?t=high&lang=zh'
    );
    expect(screen.getByRole('link', { name: 'All players' })).toHaveAttribute(
      'href',
      '/cards?w=3d&lang=zh'
    );
    expect(screen.getByRole('link', { name: 'High rank' }).className).toContain(
      'text-[color:#130f08]'
    );
  });
});
