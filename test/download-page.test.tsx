import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import DownloadPage from '../src/features/download/DownloadPage';

function makeTestClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0 },
    },
  });
}

function renderWithClient(ui: ReactNode): QueryClient {
  const client = makeTestClient();
  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
  return client;
}

describe('DownloadPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders both platform cards and shows version + download urls when fetch succeeds', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ version: '3.1.1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      )
    );

    renderWithClient(<DownloadPage locale="en" />);

    expect(screen.getByRole('heading', { level: 2, name: 'Windows' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'macOS' })).toBeInTheDocument();

    const winLink = await screen.findByRole('link', { name: /Download \.exe/ });
    const macLink = await screen.findByRole('link', { name: /Download \.dmg/ });

    expect(winLink).toHaveAttribute(
      'href',
      'https://bppinstaller.bazaarplusplus.com/3.1.1/windows-x86_64/installer/BazaarPlusPlus_3.1.1_x64-setup.exe'
    );
    expect(macLink).toHaveAttribute(
      'href',
      'https://bppinstaller.bazaarplusplus.com/3.1.1/darwin-aarch64/installer/BazaarPlusPlus_3.1.1_aarch64.dmg'
    );

    expect(screen.getAllByText(/v3\.1\.1/)).toHaveLength(2);
    expect(screen.getByText(/check the troubleshooting notes or reinstall the game and BazaarPlusPlus/)).toBeInTheDocument();
    expect(screen.queryByText(/deleting the entire The Bazaar directory/)).not.toBeInTheDocument();
  });

  test('shows fallback message and GitHub release link when fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 503 }))
    );

    renderWithClient(<DownloadPage locale="en" />);

    await waitFor(() =>
      expect(screen.getByText(/Cannot reach the latest version right now/)).toBeInTheDocument()
    );

    const releaseLink = screen.getByRole('link', { name: 'GitHub Release' });
    expect(releaseLink).toHaveAttribute(
      'href',
      'https://github.com/cauyxy/BazaarPlusPlus/releases/latest'
    );

    const winButton = screen.getByRole('link', { name: /Download \.exe/ });
    expect(winButton).toHaveAttribute('aria-disabled', 'true');
  });

  test('renders preview download links from preview manifest', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ version: '4.0.1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    );
    vi.stubGlobal('fetch', fetchMock);

    renderWithClient(<DownloadPage locale="en" variant="preview" />);

    expect(screen.getByRole('heading', { level: 1, name: 'Download BazaarPlusPlus Preview' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Caution' })).toBeInTheDocument();
    expect(await screen.findAllByText(/v4\.0\.1/)).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://bppinstaller.bazaarplusplus.com/preview.json',
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      })
    );

    expect(screen.getByRole('link', { name: /Download \.exe/ })).toHaveAttribute(
      'href',
      'https://bppinstaller.bazaarplusplus.com/preview/4.0.1/windows-x86_64/BazaarPlusPlus_4.0.1_x64-setup.exe'
    );
    expect(screen.getByRole('link', { name: /Download \.dmg/ })).toHaveAttribute(
      'href',
      'https://bppinstaller.bazaarplusplus.com/preview/4.0.1/darwin-aarch64/BazaarPlusPlus_4.0.1_aarch64.dmg'
    );
  });

  test('shows preview manifest failure without linking to stable releases', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('boom', { status: 503 }))
    );

    renderWithClient(<DownloadPage locale="en" variant="preview" />);

    await waitFor(() =>
      expect(screen.getByText(/Cannot reach the Preview version right now/)).toBeInTheDocument()
    );

    expect(screen.queryByRole('link', { name: 'GitHub Release' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Download \.exe/ })).toHaveAttribute('aria-disabled', 'true');
  });
});
