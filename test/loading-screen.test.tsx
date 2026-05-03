import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { LoadingScreen } from '../src/app/screens';

describe('LoadingScreen', () => {
  test('shows determinate data download progress when available', () => {
    render(
      <LoadingScreen
        locale="zh"
        progress={{ completed: 4, total: 16, label: 'Loaded hero_overview/1d/all' }}
      />
    );

    expect(screen.getByText('正在加载 BazaarPlusPlus 数据…')).toBeInTheDocument();
    expect(screen.getByText('正在加载数据')).toBeInTheDocument();
    expect(screen.getByText('4 / 16')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '数据加载进度' })).toHaveAttribute(
      'aria-valuenow',
      '25'
    );
    expect(screen.getByText('已加载 hero_overview/1d/all')).toBeInTheDocument();
  });
});
