import { describe, expect, test } from 'vitest';

import { getPageTitle, getSiteCopy } from '../src/content/site-copy';

describe('site copy', () => {
  test('builds localized browser tab titles for routed pages', () => {
    expect(getPageTitle('heroes', 'en')).toBe('Hero Stats | BazaarPlusPlus');
    expect(getPageTitle('cards', 'zh')).toBe('卡牌数据 | BazaarPlusPlus');
    expect(getPageTitle('builds', 'zh')).toBe('终局构筑 | BazaarPlusPlus');
    expect(getPageTitle('download', 'en')).toBe('Download | BazaarPlusPlus');
    expect(getPageTitle('support', 'zh')).toBe('赞助 | BazaarPlusPlus');
    expect(getPageTitle('not-found', 'en')).toBe('Page Not Found | BazaarPlusPlus');
  });

  test('provides localized shared dashboard copy', () => {
    const zhCopy = getSiteCopy('zh');
    const enCopy = getSiteCopy('en');

    expect(zhCopy.common.liveFeed).toBe('实时数据');
    expect(zhCopy.common.footer.madeWith).toBe('用');
    expect(zhCopy.common.loading.title).toBe('正在统计集市…');
    expect(zhCopy.common.scope.tierLabels.high).toBe('高');
    expect(zhCopy.stats.cards.metricTabs.uplift.label).toBe('提升');
    expect(zhCopy.stats.builds.tableHeaders.contributor).toBe('贡献者');

    expect(enCopy.common.liveFeed).toBe('Live feed');
    expect(enCopy.common.scope.tierLabels.high).toBe('High');
    expect(enCopy.stats.heroes.tableHeaders.winRate).toBe('Win rate');
  });
});
