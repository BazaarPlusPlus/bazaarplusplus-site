import { describe, expect, test } from 'vitest';

import { getCanonicalPath, isSpaRoutePath, resolveSpaRoute } from '../src/app/router';

describe('spa router', () => {
  test('resolves top-level stats routes', () => {
    expect(resolveSpaRoute('/heroes')).toEqual({ page: 'heroes' });
  });

  test('resolves info pages', () => {
    expect(resolveSpaRoute('/')).toEqual({ page: 'support' });
    expect(resolveSpaRoute('/tutorial')).toEqual({ page: 'tutorial' });
    expect(resolveSpaRoute('/download')).toEqual({ page: 'download' });
    expect(resolveSpaRoute('/download/preview')).toEqual({ page: 'download-preview' });
    expect(resolveSpaRoute('/support')).toEqual({ page: 'support' });
    expect(resolveSpaRoute('/tutorial/')).toEqual({ page: 'tutorial' });
    expect(resolveSpaRoute('/download/')).toEqual({ page: 'download' });
    expect(resolveSpaRoute('/download/preview/')).toEqual({ page: 'download-preview' });
  });

  test('treats /supporters as an alias of /support', () => {
    expect(resolveSpaRoute('/supporters')).toEqual({ page: 'support' });
    expect(resolveSpaRoute('/supporters/')).toEqual({ page: 'support' });
    expect(isSpaRoutePath('/supporters')).toBe(true);
  });

  test('getCanonicalPath returns the canonical alias target', () => {
    expect(getCanonicalPath('/supporters')).toBe('/support');
    expect(getCanonicalPath('/supporters/')).toBe('/support');
    expect(getCanonicalPath('/support')).toBeNull();
    expect(getCanonicalPath('/download')).toBeNull();
    expect(getCanonicalPath('/unknown')).toBeNull();
  });

  test('rejects unknown routes and unknown heroes', () => {
    expect(resolveSpaRoute('/heroes/Mak')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/heroes/Pygmalien')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/heroes/Unknown')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/archetypes')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/unknown')).toEqual({ page: 'not-found' });
    expect(isSpaRoutePath('/heroes')).toBe(true);
    expect(isSpaRoutePath('/tutorial')).toBe(true);
    expect(isSpaRoutePath('/download')).toBe(true);
    expect(isSpaRoutePath('/download/preview')).toBe(true);
    expect(isSpaRoutePath('/support')).toBe(true);
    expect(isSpaRoutePath('/archetypes')).toBe(false);
    expect(isSpaRoutePath('/unknown')).toBe(false);
  });

  test('treats removed card and build routes as not found', () => {
    expect(resolveSpaRoute('/cards')).toEqual({ page: 'not-found' });
    expect(resolveSpaRoute('/builds')).toEqual({ page: 'not-found' });
    expect(isSpaRoutePath('/cards')).toBe(false);
    expect(isSpaRoutePath('/builds')).toBe(false);
  });
});
