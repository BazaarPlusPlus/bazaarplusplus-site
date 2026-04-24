import { describe, expect, test } from 'vitest';

import { isSpaRoutePath, resolveSpaRoute } from '../src/lib/spa-router';

describe('spa router', () => {
  test('resolves top-level stats routes', () => {
    expect(resolveSpaRoute('/')).toEqual({ page: 'heroes' });
    expect(resolveSpaRoute('/cards')).toEqual({ page: 'cards' });
    expect(resolveSpaRoute('/builds')).toEqual({ page: 'builds' });
  });

  test('resolves valid hero detail routes', () => {
    expect(resolveSpaRoute('/heroes/Mak')).toEqual({ page: 'hero-detail', hero: 'Mak' });
    expect(resolveSpaRoute('/heroes/Pygmalien')).toEqual({
      page: 'hero-detail',
      hero: 'Pygmalien',
    });
  });

  test('rejects unknown routes and unknown heroes', () => {
    expect(resolveSpaRoute('/heroes/Unknown')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/archetypes')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/unknown')).toEqual({ page: 'not-found' });
    expect(isSpaRoutePath('/cards')).toBe(true);
    expect(isSpaRoutePath('/archetypes')).toBe(false);
    expect(isSpaRoutePath('/unknown')).toBe(false);
  });
});
