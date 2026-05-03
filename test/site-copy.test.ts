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
    expect(getPageTitle('cards', 'zh')).toBe('卡牌统计 | BazaarPlusPlus');
    expect(getPageTitle('builds', 'zh')).toBe('终局构筑 | BazaarPlusPlus');
    expect(getPageTitle('tutorial', 'en')).toBe('Tutorial | BazaarPlusPlus');
    expect(getPageTitle('download', 'en')).toBe('Download | BazaarPlusPlus');
    expect(getPageTitle('support', 'zh')).toBe('支持 | BazaarPlusPlus');
    expect(getPageTitle('not-found', 'en')).toBe('Page Not Found | BazaarPlusPlus');
  });

  test('provides localized shared dashboard copy', () => {
    const zhCopy = getSiteCopy('zh');
    const enCopy = getSiteCopy('en');

    expect(zhCopy.common.liveFeed).toBe('实时数据');
    expect(zhCopy.common.footer).toEqual(enCopy.common.footer);
    expect(zhCopy.common.loading.title).toBe('正在加载 BazaarPlusPlus 数据…');
    expect(zhCopy.common.scope.tierLabels.high).toBe('高');
    expect(zhCopy.stats.cards.metricTabs.uplift.label).toBe('提升');
    expect(zhCopy.stats.builds.tableHeaders.contributor).toBe('贡献者');
    expect(zhCopy.secondaryNav.tutorial).toBe('教程');
    expect(zhCopy.tutorial.installation.steps[0]?.title).toBe('下载最新安装器');

    expect(enCopy.common.liveFeed).toBe('Live feed');
    expect(enCopy.common.scope.tierLabels.high).toBe('High');
    expect(enCopy.stats.heroes.tableHeaders.winRate).toBe('Win rate');
    expect(enCopy.secondaryNav.tutorial).toBe('Tutorial');
    expect(enCopy.tutorial.features.map((feature) => feature.title)).toContain('Run history and replays');
  });

  test('uses Chinese punctuation in Chinese copy', () => {
    const strings = collectStrings(getSiteCopy('zh'));
    const stringsWithAsciiCommas = strings.filter((value) => value.includes(','));

    expect(stringsWithAsciiCommas).toEqual([]);
  });

  test('keeps the intended buy-a-drink support phrasing in Chinese copy', () => {
    const zhCopy = getSiteCopy('zh');

    expect(zhCopy.support.wechat.description).toBe('微信扫码，请 BazaarPlusPlus 喝一杯。');
    expect(zhCopy.support.wechat.modalTitle).toBe('请喝一杯');
    expect(zhCopy.support.kofi.description).toBe('在 Ko-fi 上请 BazaarPlusPlus 喝一杯。');
  });
});
