import { describe, expect, test } from 'vitest';

import { getPageTitle } from '../src/lib/site-copy';

describe('site copy', () => {
  test('builds localized browser tab titles for routed pages', () => {
    expect(getPageTitle('heroes', 'en')).toBe('Hero Stats | BazaarPlusPlus');
    expect(getPageTitle('cards', 'zh')).toBe('卡牌数据 | BazaarPlusPlus');
    expect(getPageTitle('builds', 'zh')).toBe('终局构筑 | BazaarPlusPlus');
    expect(getPageTitle('download', 'en')).toBe('Download | BazaarPlusPlus');
    expect(getPageTitle('support', 'zh')).toBe('赞助 | BazaarPlusPlus');
    expect(getPageTitle('not-found', 'en')).toBe('Page Not Found | BazaarPlusPlus');
  });
});
