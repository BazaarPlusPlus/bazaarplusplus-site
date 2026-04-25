import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import InfoPageShell from '../src/components/InfoPageShell';
import StatsPageShell from '../src/components/StatsPageShell';

describe('page shell footer', () => {
  test('renders the author credit link in info pages', () => {
    render(
      <InfoPageShell
        activeSection="download"
        locale="en"
        eyebrow="Download"
        title="Download BazaarPlusPlus"
      >
        <div>Download content</div>
      </InfoPageShell>
    );

    expect(screen.getByText('Made with')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'love' })).toBeInTheDocument();
    expect(screen.getByText('by')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xinyu YANG' })).toHaveAttribute(
      'href',
      'https://github.com/cauyxy'
    );
  });

  test('renders the author credit link in stats pages', () => {
    render(
      <StatsPageShell
        activeSection="cards"
        locale="en"
        eyebrow="Analytics"
        title="Card winrate"
        source="remote"
        generatedAt="2026-04-18T18:57:46Z"
        filters={<div>Filters</div>}
      >
        <div>Stats content</div>
      </StatsPageShell>
    );

    expect(screen.getByText('Made with')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'love' })).toBeInTheDocument();
    expect(screen.getByText('by')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Xinyu YANG' })).toHaveAttribute(
      'href',
      'https://github.com/cauyxy'
    );
  });
});
