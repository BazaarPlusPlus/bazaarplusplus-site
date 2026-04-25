import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { LoadingScreen } from '../src/app/screens';

describe('LoadingScreen', () => {
  test('shows determinate data download progress when available', () => {
    render(<LoadingScreen progress={{ completed: 4, total: 16, label: 'Loaded hero_overview/1d/all' }} />);

    expect(screen.getByText('tallying the bazaar…')).toBeInTheDocument();
    expect(screen.getByText('Loading data')).toBeInTheDocument();
    expect(screen.getByText('4 / 16')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '25');
  });
});
