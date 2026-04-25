import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import SiteHeader from '../src/shared/components/SiteHeader';

describe('SiteHeader', () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
  });

  test('renders localized primary and secondary nav with stats live feed pill', () => {
    const { container } = render(<SiteHeader activeSection="cards" locale="zh" liveFeedSource="remote" />);

    expect(screen.getByRole('link', { name: '英雄数据' })).toHaveAttribute('href', '/heroes');
    expect(screen.getByRole('link', { name: '卡牌数据' })).toHaveAttribute('href', '/cards');
    expect(screen.getByRole('link', { name: '终局构筑' })).toHaveAttribute('href', '/builds');

    expect(screen.getByRole('link', { name: '下载' })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: '赞助' })).toHaveAttribute('href', '/support');
    expect(screen.queryByRole('link', { name: '支持者' })).not.toBeInTheDocument();

    expect(container.querySelector('source')).not.toBeInTheDocument();
    expect(container.querySelector('img[src="/bazaarplusplus-icon.webp"]')).toBeInTheDocument();
    expect(container.querySelector('img[src="/bazaarplusplus-icon.png"]')).not.toBeInTheDocument();
    expect(screen.getByText('Live feed')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '卡牌数据' })).toHaveAttribute('aria-current', 'page');
  });

  test('hides live feed pill on info pages and uses english labels when explicitly selected', () => {
    render(<SiteHeader activeSection="download" locale="en" />);

    expect(screen.queryByText('Live feed')).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: 'Hero Stats' })).toHaveAttribute('href', '/heroes?lang=en');
    expect(screen.getByRole('link', { name: 'Card Stats' })).toHaveAttribute('href', '/cards?lang=en');
    expect(screen.getByRole('link', { name: 'Final Builds' })).toHaveAttribute('href', '/builds?lang=en');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/download?lang=en');
    expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Support' })).toHaveAttribute('href', '/support?lang=en');
    expect(screen.queryByRole('link', { name: 'Supporters' })).not.toBeInTheDocument();
  });

  test('language toggle highlights current locale and links to other locale preserving path + query', () => {
    window.history.replaceState({}, '', '/cards?w=3d&t=high&lang=en');

    render(<SiteHeader activeSection="cards" locale="en" />);

    const group = screen.getByRole('group', { name: 'Language' });

    const enSegment = group.querySelector('span[aria-current="true"]');
    expect(enSegment).toHaveTextContent('EN');

    const zhLink = screen.getByRole('link', { name: '中' });
    expect(zhLink).toHaveAttribute('href', '/cards?w=3d&t=high');
    expect(zhLink).toHaveAttribute('hrefLang', 'zh');
  });

  test('language toggle adds lang param when switching to english', () => {
    window.history.replaceState({}, '', '/builds?w=7d');

    render(<SiteHeader activeSection="builds" locale="zh" />);

    const enLink = screen.getByRole('link', { name: 'EN' });
    expect(enLink).toHaveAttribute('href', '/builds?w=7d&lang=en');
    expect(enLink).toHaveAttribute('hrefLang', 'en');

    const zhSegment = screen
      .getByRole('group', { name: 'Language' })
      .querySelector('span[aria-current="true"]');
    expect(zhSegment).toHaveTextContent('中');
  });
});
