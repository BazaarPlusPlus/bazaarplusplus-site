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
  if (left == null && right == null) {
    return 0;
  }

  if (left == null) {
    return 1;
  }

  if (right == null) {
    return -1;
  }

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
    const result = compareValues(accessors[sort.key](left), accessors[sort.key](right));
    return sort.direction === 'asc' ? result : -result;
  });
}
