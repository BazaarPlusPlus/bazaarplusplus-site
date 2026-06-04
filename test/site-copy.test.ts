import { describe, expect, test } from 'vitest';

import { getPageTitle, getSiteCopy } from '../src/content/site-copy';

function collectStrings(value: unknown): string[] {
  if (typeof value === 'string') {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap(collectStrings);
  }

  if (value && typeof value === 'object') {
    return Object.values(value).flatMap(collectStrings);
  }

  return [];
}

describe('site copy', () => {
  test('builds localized browser tab titles for routed pages', () => {
    expect(getPageTitle('heroes', 'en')).toBe('Hero Stats | BazaarPlusPlus');
    expect(getPageTitle('tutorial', 'en')).toBe('Tutorial | BazaarPlusPlus');
    expect(getPageTitle('download', 'en')).toBe('Download | BazaarPlusPlus');
    expect(getPageTitle('download-preview', 'zh')).toBe('预览下载 | BazaarPlusPlus');
    expect(getPageTitle('support', 'zh')).toBe('支持 | BazaarPlusPlus');
    expect(getPageTitle('not-found', 'en')).toBe('Page Not Found | BazaarPlusPlus');
  });

  test('exposes header brand copy from localized site copy', () => {
    expect(getSiteCopy('zh').common.brand).toEqual({
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    });
    expect(getSiteCopy('en').common.brand).toEqual({
      name: 'BazaarPlusPlus',
      subtitle: 'Bazaar Almanac',
    });
  });

  test('provides localized shared dashboard copy', () => {
    const zhCopy = getSiteCopy('zh');
    const enCopy = getSiteCopy('en');

    expect(zhCopy.common.footer).toEqual(enCopy.common.footer);
    expect(zhCopy.common.loading.title).toBe('正在加载 BazaarPlusPlus 数据…');
    expect(zhCopy.common.scope.tierLabels.high).toBe('高');
    expect(zhCopy.secondaryNav.tutorial).toBe('教程');
    expect(zhCopy.tutorial.installation.steps[0]?.title).toBe('下载最新安装器');
    expect(zhCopy.tutorial.installation.steps[3]?.description).toBe(
      '主菜单设置按钮上方会出现 BazaarPlusPlus dock；下方游戏版本信息会显示 BPP version'
    );
    expect(zhCopy.tutorial.features.find((feature) => feature.title === '附魔与升级预览')?.details).toEqual([
      '附魔预览进行附魔后效果补进物品提示，方便比较不同选择',
      '升级预览适合在选择遭遇，调整构筑时，确认升级后的收益',
    ]);
    expect(zhCopy.tutorial.features.find((feature) => feature.title === '匿名模式')).toMatchObject({
      description: '本地玩家名显示为 Anonymous',
      details: ['截图和录制时隐藏本地名称', '直播或分享画面时保持匿名展示'],
    });
    expect(zhCopy.tutorial.quickStart.heading).toBe('常用键位');
    expect(zhCopy.tutorial.quickStart.groups.map((group) => group.title)).toEqual([
      '快捷入口',
      '按住预览',
    ]);
    expect(zhCopy.tutorial.quickStart.groups[0]?.items.map((item) => item.bindings)).toEqual([
      [{ key: 'F8' }],
      [
        { key: 'Caps Lock', action: '打开' },
        { key: 'A / D', action: '切换视图' },
        { key: 'W / S', action: '切换阵容' },
      ],
    ]);
    expect(zhCopy.tutorial.quickStart.groups[1]?.items.map((item) => item.bindings)).toEqual([
      [{ key: 'Ctrl' }],
      [{ key: 'Shift' }],
    ]);
    expect(zhCopy.tutorial.quickStart.groups[1]?.note).toBe('在游戏“设置” -> “游玩设置”中重绑 Ctrl / Shift 预览键位');

    expect(enCopy.common.scope.tierLabels.high).toBe('High');
    expect(zhCopy.stats.heroes.detailLinkLabel).toBe('在 BazaarDB 查看详细统计');
    expect(enCopy.stats.heroes.detailLinkLabel).toBe('View detailed stats on BazaarDB');
    expect(enCopy.stats.heroes.tableHeaders.winRate).toBe('Win rate');
    expect(enCopy.secondaryNav.tutorial).toBe('Tutorial');
    expect(enCopy.tutorial.installation.steps[3]?.description).toBe(
      'On the main menu, a BazaarPlusPlus dock appears above the Settings button, and the game version text below shows BPP version.'
    );
    expect(enCopy.tutorial.quickStart.heading).toBe('Common hotkeys');
    expect(enCopy.tutorial.quickStart.groups.map((group) => group.title)).toEqual([
      'Entry controls',
      'Preview holds',
    ]);
    expect(enCopy.tutorial.quickStart.groups[0]?.items.map((item) => item.bindings)).toEqual([
      [{ key: 'F8' }],
      [
        { key: 'Caps Lock', action: 'Open' },
        { key: 'A / D', action: 'Switch view' },
        { key: 'W / S', action: 'Switch build' },
      ],
    ]);
    expect(enCopy.tutorial.quickStart.groups[1]?.items.map((item) => item.bindings)).toEqual([
      [{ key: 'Ctrl' }],
      [{ key: 'Shift' }],
    ]);
    expect(enCopy.tutorial.quickStart.groups[1]?.note).toBe('Rebind Ctrl / Shift preview hotkeys in Settings -> Gameplay Settings.');
    expect(enCopy.tutorial.features.map((feature) => feature.title)).toEqual([
      'Run History',
      'Anonymous Mode',
      'Legendary Rank Display',
      'Enchant and upgrade previews',
      'Combat Controls',
      'Chinese Terminology',
    ]);
    expect(enCopy.tutorial.features.find((feature) => feature.title === 'Anonymous Mode')).toMatchObject({
      description: 'Show the local player name as Anonymous.',
      details: [
        'Hide your local name in screenshots and recordings.',
        'Stay anonymous while streaming or sharing footage.',
      ],
    });
  });

  test('uses Chinese punctuation in Chinese copy', () => {
    const strings = collectStrings(getSiteCopy('zh'));
    const stringsWithAsciiCommas = strings.filter((value) => value.includes(','));

    expect(stringsWithAsciiCommas).toEqual([]);
  });

  test('keeps WeChat localized and Ko-fi global in Chinese support copy', () => {
    const zhCopy = getSiteCopy('zh');

    expect(zhCopy.support.wechat.description).toBe('微信扫码，请 BazaarPlusPlus 喝一杯。');
    expect(zhCopy.support.wechat.modalTitle).toBe('请喝一杯');
    expect(zhCopy.support.kofi.description).toBe('Buy BazaarPlusPlus a drink on Ko-fi.');
    expect(zhCopy.support.kofi.actionLabel).toBe('Open Ko-fi');
    expect(zhCopy.support.kofi.regionLabel).toBe('Global');
  });
});
