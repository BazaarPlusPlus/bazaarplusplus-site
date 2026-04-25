import type { HeroWinrateDailyRow } from './metrics';

export type HeroMovementRow = {
  hero: string;
  firstDay: string;
  latestDay: string;
  firstWinRate: number;
  latestWinRate: number;
  delta: number;
};

export function buildHeroMovementRows(
  rows: HeroWinrateDailyRow[],
  visibleDays: string[]
): HeroMovementRow[] {
  if (visibleDays.length < 2) {
    return [];
  }

  const visibleDaySet = new Set(visibleDays);
  const grouped = new Map<string, HeroWinrateDailyRow[]>();

  for (const row of rows) {
    if (!visibleDaySet.has(row.day)) {
      continue;
    }

    const heroRows = grouped.get(row.hero) ?? [];
    heroRows.push(row);
    grouped.set(row.hero, heroRows);
  }

  return Array.from(grouped.entries())
    .flatMap(([hero, heroRows]) => {
      const sortedRows = [...heroRows].sort(
        (a, b) => new Date(a.day).getTime() - new Date(b.day).getTime()
      );
      const first = sortedRows[0];
      const latest = sortedRows.at(-1);

      if (!first || !latest || first.day === latest.day) {
        return [];
      }

      return [
        {
          hero,
          firstDay: first.day,
          latestDay: latest.day,
          firstWinRate: first.win_rate,
          latestWinRate: latest.win_rate,
          delta: latest.win_rate - first.win_rate,
        },
      ];
    })
    .sort((a, b) => b.delta - a.delta || b.latestWinRate - a.latestWinRate || a.hero.localeCompare(b.hero));
}
