// @vitest-environment node

import { describe, expect, test } from 'vitest';

import { sortRows, toggleSort } from '../src/shared/lib/table-sorting';

type Row = { hero: string; rate: number | null };

const rows: Row[] = [
  { hero: 'Vanessa', rate: 0.4 },
  { hero: 'Stelle', rate: null },
  { hero: 'Mak', rate: 0.6 },
  { hero: 'Common', rate: null },
];

const accessors = {
  hero: (row: Row) => row.hero,
  rate: (row: Row) => row.rate,
};

describe('sortRows', () => {
  test('null values sink to the bottom in both sort directions', () => {
    const desc = sortRows(rows, { key: 'rate', direction: 'desc' }, accessors);
    expect(desc.map((row) => row.hero)).toEqual(['Mak', 'Vanessa', 'Stelle', 'Common']);

    const asc = sortRows(rows, { key: 'rate', direction: 'asc' }, accessors);
    expect(asc.map((row) => row.hero)).toEqual(['Vanessa', 'Mak', 'Stelle', 'Common']);
  });

  test('string sorting still honors direction', () => {
    const asc = sortRows(rows, { key: 'hero', direction: 'asc' }, accessors);
    expect(asc.map((row) => row.hero)).toEqual(['Common', 'Mak', 'Stelle', 'Vanessa']);

    const desc = sortRows(rows, { key: 'hero', direction: 'desc' }, accessors);
    expect(desc.map((row) => row.hero)).toEqual(['Vanessa', 'Stelle', 'Mak', 'Common']);
  });
});

describe('toggleSort', () => {
  test('switches key with the initial direction, then flips direction', () => {
    const initial = { key: 'rate', direction: 'desc' } as const;
    expect(toggleSort(initial, 'hero', 'asc')).toEqual({ key: 'hero', direction: 'asc' });
    expect(toggleSort(initial, 'rate')).toEqual({ key: 'rate', direction: 'asc' });
  });
});
