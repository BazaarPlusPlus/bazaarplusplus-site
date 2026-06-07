export type SortDirection = 'asc' | 'desc';

export type SortState<Key extends string> = {
  key: Key;
  direction: SortDirection;
};

export type SortPrimitive = string | number | null | undefined;

type SortAccessor<Row> = (row: Row) => SortPrimitive;
type SortAccessorMap<Row, Key extends string> = Record<Key, SortAccessor<Row>> &
  Record<string, SortAccessor<Row> | undefined>;

function compareValues(left: SortPrimitive, right: SortPrimitive): number {
  if (typeof left === 'number' && typeof right === 'number') {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

export function toggleSort<Key extends string>(
  current: SortState<Key>,
  key: Key,
  initialDirection: SortDirection = 'desc'
): SortState<Key> {
  if (current.key !== key) {
    return { key, direction: initialDirection };
  }

  return {
    key,
    direction: current.direction === 'desc' ? 'asc' : 'desc',
  };
}

export function sortRows<Row, Key extends string>(
  rows: Row[],
  sort: SortState<Key>,
  accessors: SortAccessorMap<Row, Key>
): Row[] {
  return [...rows].sort((left, right) => {
    const leftValue = accessors[sort.key](left);
    const rightValue = accessors[sort.key](right);

    // Nulls sink to the bottom in both sort directions; never let the
    // direction flip float a zero-denominator row to the top.
    if (leftValue == null || rightValue == null) {
      if (leftValue == null && rightValue == null) {
        return 0;
      }

      return leftValue == null ? 1 : -1;
    }

    const result = compareValues(leftValue, rightValue);
    return sort.direction === 'asc' ? result : -result;
  });
}
