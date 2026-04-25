import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import SiteHeader from '../src/components/SiteHeader';

describe('SiteHeader', () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
  });

  test('renders primary and secondary nav with stats live feed pill', () => {
    render(<SiteHeader activeSection="cards" locale="zh" liveFeedSource="remote" />);

    expect(screen.getByRole('link', { name: 'Heroes' })).toHaveAttribute('href', '/?lang=zh');
    expect(screen.getByRole('link', { name: 'Cards' })).toHaveAttribute('href', '/cards?lang=zh');
    expect(screen.getByRole('link', { name: 'Builds' })).toHaveAttribute('href', '/builds?lang=zh');

    expect(screen.getByRole('link', { name: '下载' })).toHaveAttribute('href', '/download?lang=zh');
    expect(screen.getByRole('link', { name: '赞助' })).toHaveAttribute('href', '/support?lang=zh');
    expect(screen.queryByRole('link', { name: '支持者' })).not.toBeInTheDocument();

    expect(screen.getByText('Live feed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Cards' })).toHaveAttribute('aria-current', 'page');
  });

  test('hides live feed pill on info pages and uses english labels by default', () => {
    render(<SiteHeader activeSection="download" locale="en" />);

    expect(screen.queryByText('Live feed')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support');
    expect(screen.queryByRole('link', { name: 'Supporters' })).not.toBeInTheDocument();
  });

  test('language toggle highlights current locale and links to other locale preserving path + query', () => {
    window.history.replaceState({}, '', '/cards?w=3d&t=high');

    render(<SiteHeader activeSection="cards" locale="en" />);

    const group = screen.getByRole('group', { name: 'Language' });

    const enSegment = group.querySelector('span[aria-current="true"]');
    expect(enSegment).toHaveTextContent('EN');

    const zhLink = screen.getByRole('link', { name: '中' });
    expect(zhLink).toHaveAttribute('href', '/cards?w=3d&t=high&lang=zh');
    expect(zhLink).toHaveAttribute('hrefLang', 'zh');
  });

  test('language toggle removes lang param when switching back to english', () => {
    window.history.replaceState({}, '', '/builds?lang=zh&w=7d');

    render(<SiteHeader activeSection="builds" locale="zh" />);

    const enLink = screen.getByRole('link', { name: 'EN' });
    expect(enLink).toHaveAttribute('href', '/builds?w=7d');
    expect(enLink).toHaveAttribute('hrefLang', 'en');

    const zhSegment = screen
      .getByRole('group', { name: 'Language' })
      .querySelector('span[aria-current="true"]');
    expect(zhSegment).toHaveTextContent('中');
  });
});
