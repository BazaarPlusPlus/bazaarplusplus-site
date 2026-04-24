import { describe, expect, test } from 'vitest';

import { cardDictionaryHasSizeMetadata, selectPreferredCardDictionary } from '../src/lib/card-dictionary-source';
import type { CardDictionary } from '../src/lib/metrics';

describe('card dictionary source selection', () => {
  test('detects whether card dictionaries include size metadata', () => {
    expect(cardDictionaryHasSizeMetadata({ a: { name: { en: 'A' } } })).toBe(false);
    expect(cardDictionaryHasSizeMetadata({ a: { name: { en: 'A' }, size: 'Small' } })).toBe(true);
  });

  test('prefers the latest remote dictionary when local metadata is stale', () => {
    const staleLocal: CardDictionary = {
      card_a: {
        image_url: 'https://bpp-static.bazaarplusplus.com/webp/card_a.webp',
        name: { 'en-US': 'Flying Squirrel', 'zh-CN': '飞鼠' },
      },
    };
    const latestRemote: CardDictionary = {
      card_a: {
        image_url: 'https://bpp-static.bazaarplusplus.com/webp/card_a.webp',
        name: { 'en-US': 'Flying Squirrel', 'zh-CN': '飞鼠' },
        size: 'Small',
      },
    };

    expect(selectPreferredCardDictionary({ local: staleLocal, remote: latestRemote })).toEqual(latestRemote);
  });
});
