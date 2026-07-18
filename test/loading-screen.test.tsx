import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { LoadingScreen } from '../src/app/screens';

describe('LoadingScreen', () => {
  test('shows determinate data download progress when available', () => {
    render(
      <LoadingScreen
        locale="zh"
        progress={{
          completed: 4,
          total: 16,
          status: 'loaded',
          resource: { kind: 'daily', date: '2026-06-07' },
        }}
      />
    );

    expect(screen.getByText('正在加载 BazaarPlusPlus 数据…')).toBeInTheDocument();
    expect(screen.getByText('正在加载数据')).toBeInTheDocument();
    expect(screen.getByText('4 / 16')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '数据加载进度' })).toHaveAttribute(
      'aria-valuenow',
      '25'
    );
    expect(screen.getByText('已加载 web_daily/2026-06-07')).toBeInTheDocument();
  });

  test('renders manifest failure semantics in English', () => {
    render(
      <LoadingScreen
        locale="en"
        progress={{
          completed: 0,
          total: 1,
          status: 'failed',
          resource: { kind: 'manifest' },
        }}
      />
    );

    expect(screen.getByText('Failed manifest')).toBeInTheDocument();
  });
});
