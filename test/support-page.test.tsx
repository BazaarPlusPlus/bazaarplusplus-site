import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import SupportPage from '../src/features/support/SupportPage';
import type { Supporter } from '../src/features/support/supporters-data';

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

function stubSupporterFetch(supporters: Supporter[]): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(JSON.stringify(supporters), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    )
  );
}

const seededSupporters: Supporter[] = [
  { name: 'FeiMary', tier: 4 },
  { name: 'EcitsujNT', tier: 4 },
  { name: '小和尚济海', tier: 4 },
  { name: '麦麦在逃脆薯饼', tier: 3 },
];

describe('SupportPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders WeChat and Ko-fi cards with the right links', () => {
    stubSupporterFetch(seededSupporters);
    renderWithClient(<SupportPage locale="en" />);

    expect(screen.getByText('Your support helps keep BazaarPlusPlus going.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'WeChat Pay' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Ko-fi' })).toBeInTheDocument();

    const kofiLink = screen.getByRole('link', { name: /Open Ko-fi/ });
    expect(kofiLink).toHaveAttribute('href', 'https://ko-fi.com/cauyxy');
    expect(kofiLink).toHaveAttribute('target', '_blank');
    expect(kofiLink).toHaveAttribute('rel', 'noreferrer');
  });

  test('opens and closes the WeChat modal', () => {
    stubSupporterFetch(seededSupporters);
    renderWithClient(<SupportPage locale="en" />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Show QR code/ }));

    const dialog = screen.getByRole('dialog', { name: /Buy Bazaar\+\+ a drink/ });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByLabelText('WeChat Pay QR code')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('renders fetched supporters below the support CTAs', async () => {
    stubSupporterFetch(seededSupporters);
    renderWithClient(<SupportPage locale="zh" />);

    expect(screen.getByText('致谢')).toBeInTheDocument();
    expect(screen.getByText('有你的支持,让 Bazaar++ 走得更远')).toBeInTheDocument();

    expect(await screen.findByText('FeiMary')).toBeInTheDocument();
    expect(screen.getByText('EcitsujNT')).toBeInTheDocument();
    expect(screen.getByText('小和尚济海')).toBeInTheDocument();
    expect(screen.getByText('麦麦在逃脆薯饼')).toBeInTheDocument();
    expect(screen.getByText('也感谢所有未署名的支持者')).toBeInTheDocument();

    expect(fetch).toHaveBeenCalledWith(
      'https://bpp-static.bazaarplusplus.com/supporter-list.json',
      expect.objectContaining({ headers: { Accept: 'application/json' } })
    );
  });

  test('uses english copy for the supporters section', async () => {
    stubSupporterFetch(seededSupporters);
    renderWithClient(<SupportPage locale="en" />);

    expect(screen.getByText('Roll call')).toBeInTheDocument();
    expect(
      screen.getByText('Thanks for backing Bazaar++. Your support keeps the project moving further')
    ).toBeInTheDocument();
    expect(
      screen.getByText('And thanks to everyone who supported Bazaar++ without leaving a name')
    ).toBeInTheDocument();

    expect(await screen.findByText('FeiMary')).toBeInTheDocument();
  });

  test('shows the error note when the supporter list fetch fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 503 })));
    renderWithClient(<SupportPage locale="zh" />);

    await waitFor(() =>
      expect(screen.getByText('名单暂时拉不下来,稍后再试')).toBeInTheDocument()
    );
  });

  test('shows the empty note when the supporter list is empty', async () => {
    stubSupporterFetch([]);
    renderWithClient(<SupportPage locale="zh" />);

    await waitFor(() =>
      expect(screen.getByText('名单还在收集中,稍后再来看看')).toBeInTheDocument()
    );
  });
});
