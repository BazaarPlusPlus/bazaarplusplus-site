import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import App from '../src/app/App';

describe('Tutorial route', () => {
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.href;
  });

  afterEach(() => {
    window.history.replaceState({}, '', originalUrl);
  });

  test('renders the English mod overview and installation guide at /tutorial', async () => {
    window.history.replaceState({}, '', '/tutorial?lang=en');

    render(<App />);

    expect(
      screen.getByRole('heading', { level: 1, name: /Bazaar\+\+ Tutorial/ })
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'What the mod adds' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Run history and replays' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: 'Background upload and ghost battles' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Installation guide' })).toBeInTheDocument();
    expect(screen.queryByText('Before you install')).not.toBeInTheDocument();
    expect(screen.getByText('Download latest installer')).toBeInTheDocument();
    expect(screen.getByText(/BepInEx 5 and The Bazaar/)).toBeInTheDocument();
    expect(screen.getByText('BepInEx 5 is installed in the game directory.')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: 'Data and network behavior' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open downloads' })).toHaveAttribute(
      'href',
      '/download?lang=en'
    );
    expect(screen.getByRole('link', { name: 'Support Bazaar++' })).toHaveAttribute(
      'href',
      '/support?lang=en'
    );
    expect(document.title).toBe('Tutorial | BazaarPlusPlus');
  });

  test('renders localized Chinese tutorial copy', () => {
    window.history.replaceState({}, '', '/tutorial');

    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /Bazaar\+\+ 使用教程/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '模组主要功能' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '历史记录与回放' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 3, name: '后台上传与 Ghost Battles' })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '安装指南' })).toBeInTheDocument();
    expect(screen.queryByText('安装前确认')).not.toBeInTheDocument();
    expect(screen.getByText('下载最新安装器')).toBeInTheDocument();
    expect(screen.getByText('游戏目录中已经安装 BepInEx 5。')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 2, name: '数据与网络行为' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '打开下载页' })).toHaveAttribute('href', '/download');
    expect(screen.getByRole('link', { name: '前往打赏' })).toHaveAttribute('href', '/support');
  });
});
