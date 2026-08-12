import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { LoadingScreen } from '../src/app/screens';

describe('LoadingScreen', () => {
  test('shows determinate data download progress when available', () => {
    render(
      <LoadingScreen
        locale="zh"
        progress={{
          completed: 1,
          total: 1,
          status: 'loaded',
          resource: { kind: 'snapshot' },
        }}
      />
    );

    expect(screen.getByText('正在加载 BazaarPlusPlus 数据…')).toBeInTheDocument();
    expect(screen.getByText('正在加载数据')).toBeInTheDocument();
    expect(screen.getByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: '数据加载进度' })).toHaveAttribute(
      'aria-valuenow',
      '100'
    );
    expect(screen.getByText('已加载 heroes/latest.json')).toBeInTheDocument();
  });

  test('renders snapshot failure semantics in English', () => {
    render(
      <LoadingScreen
        locale="en"
        progress={{
          completed: 0,
          total: 1,
          status: 'failed',
          resource: { kind: 'snapshot' },
        }}
      />
    );

    expect(screen.getByText('Failed heroes/latest.json')).toBeInTheDocument();
  });
});
