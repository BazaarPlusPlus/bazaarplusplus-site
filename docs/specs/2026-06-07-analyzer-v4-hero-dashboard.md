# Analyzer-v4 Hero Dashboard Migration & Upgrade

Status: **Proposed, review-fixed** · 2026-06-07 · Scope: single full-scope PR · Route unchanged: `/heroes`

## 1. Goal & non-goals

**Goal.** Replace the legacy `/heroes` stats page with a hero-analysis dashboard built on the
**analyzer-v4** web payloads, surfacing the richer dimensions those payloads unlock (battle win
rates, game-stage breakdown, victory-bucket battle rates, hero matchups, run-days-to-10-wins), and
make the analysis logic legible to users inline. This implements the migration target defined in
`bazaarplusplus-analyzers/docs/web-analysis-logic.md`, verified against the analyzer source code.

**Non-goals.** No card/build recommendations (deliberately removed 2026-06-04; analyzer-v4 mod build
data lives separately at `analyzer-v4/mod/tenwin_builds.json` and is out of scope). No new design
system — reuse the existing "Bazaar Almanac" vocabulary. No route/URL-contract changes beyond what is
listed here (`/heroes`, params `w` + `t`). No server/analyzer changes — the analyzer-v4 web payloads
are already published and live.

## 2. Content review (verified against analyzer source)

The migration doc is **accurate**. It was checked claim-by-claim against `web_daily.py`, `rating.py`,
`quality.py`, `sli.py`, `runner.py`, `config.py`, `publish.py`, and `tests/test_web_daily.py`. The
analyzer emits **raw additive counts** at grain `day + rating_tier + hero`, deliberately leaving
rates, Wilson bounds, sorting, and filtering to the website. Confirmed semantics:

- `battle_decided_count` = decided battles only (`winner_side IN player/opponent`); draws/undecided
  excluded; `battle_wins + battle_losses == battle_decided_count` (`web_daily.py:57,84-88`).
- `final_battle_*` = the `is_final_battle` subset; a separate, much smaller denominator with a much
  lower win rate (live Vanessa: 33.9% vs 61% overall) (`web_daily.py:48,91-94`).
- `game_day_battle_counts`: `day_1_3 / day_4_7 / day_8_plus` from `b.day`; `victory_bucket_battle_counts`:
  `wins_0_3 / wins_4_6 / wins_7_9 / wins_10_plus` from `b.player_victories` (`web_daily.py:175-198`).
- `final_wins_counts` histograms `final_wins` for completed non-null runs; `run_days_10w_counts` is a
  **strict subset** over `run_days` only when `final_wins == 10` (`web_daily.py:72-79`).
- The `all` tier is an **explicit output row**, never `low+mid+high` summed — NULL/unexpected rating
  buckets land only in `all` (`web_daily.py:127-131`; `tests/test_web_daily.py:61,67-81`).
- Matchups include the **mirror** (no self-exclusion), pre-sorted by sample then opponent name
  (`web_daily.py:101,166-171`).
- Merge is additive and proven equal to a direct combined aggregate (`tests/test_web_daily.py:165-186`).

**Drift / nuance to handle in this implementation:**

1. **Victory-tier denominator is unspecified by the doc.** Completed runs with NULL `final_wins`
   inflate `runs_completed` above `Σ final_wins_counts` (`web_daily.py:72-77`). **Decision: use
   `scoredRuns = Σ final_wins_counts` as the base for the five victory-tier rates** so they sum to
   exactly 100% with no silent missing slice; surface `runs_completed` separately as a raw count.
2. **`gold` formula needs a null-default.** `gold = (final_wins_counts['10'] ?? 0) - perfect`;
   without `?? 0` it yields NaN when a hero has no 10-win runs. A 10-win run with NULL `run_days`
   correctly lands in `gold` (it's in `final_wins['10']` but not `run_days_10w['10']`) — the formula
   handles this automatically (`rating.py:22`); do not special-case.
3. **`manifest.dq` includes `battle_count_mismatch`** (live 1653) which the doc's dq type omits
   (`quality.py:34`); it is a non-blocking integrity warning, not data loss.
4. **`wins_10_plus` is effectively never present** (a run ends at the 10th win) — bucket maps are
   partial; iterate present keys only, never index a fixed key set.
5. **`manifest.dq` has no `status` field.** Warn thresholds (`bundle_download_fail_rate > 0.05`,
   `decode_fail_rate > 0.02`) live only in `_sli.json` (`sli.py:52`). Compute thresholds client-side,
   or read `sli.json` `dq_health.status` when `sli_path` is present.

**Live production reality (fetched 2026-06-07):** `analyzer-v4/manifest.json` is live; `web.days` has
only **2 days** (2026-06-05/06), so 1d/3d/7d all currently resolve to ≤2 days; `bundle_download_fail_rate
≈ 0.126` (already past the 0.05 warn threshold); rows include a non-canonical hero `Common`; the
`high` tier is sparse (4 heroes vs 8 in `all`); at `all` tier samples are large (Vanessa: 5,150
completed runs, 55k decided battles).

## 3. Data contract

New types in `src/shared/lib/metrics.ts` (replacing the legacy `ManifestPayload`/`HeroOverviewPayload`/
`HeroWinrateDailyPayload`). `MetricWindow`, `RatingTier`, `Locale`, `DEFAULT_LOCALE`, `MetricsSource`,
and the `parse*` helpers are **kept** (reused by App/router/dashboard/tests).

```ts
export type AnalyzerV4Manifest = {
  schema_version: '1';
  namespace: 'analyzer-v4';
  generatedAt: string;
  latest_complete_day: string;
  web: {
    schema_version: '1';
    days: Array<{ day: string; path: string; rowCount: number }>;
  };
  dq?: {
    days?: number;
    downloaded?: number;
    download_failed?: number;
    decode_failed?: number;
    battle_count_mismatch?: number;   // present in live data; doc omits it
    decode_fail_rate?: number;
    bundle_download_fail_rate?: number;
  };
  sli_path?: string;
};

export type BattleBucketCounts = { count: number; wins: number; losses: number };

export type WebHeroDailyRow = {
  hero: string;
  rating_tier: RatingTier;            // 'all' | 'low' | 'mid' | 'high'
  runs_total: number;
  runs_completed: number;
  final_wins_counts: Record<string, number>;     // keys '0'..'10'
  run_days_10w_counts: Record<string, number>;   // keys e.g. '10'..'17'; subset of final_wins['10']
  battle_decided_count: number;
  battle_wins: number;
  battle_losses: number;
  final_battle_decided_count: number;
  final_battle_wins: number;
  final_battle_losses: number;
  game_day_battle_counts: Partial<Record<'day_1_3' | 'day_4_7' | 'day_8_plus', BattleBucketCounts>>;
  victory_bucket_battle_counts: Partial<
    Record<'wins_0_3' | 'wins_4_6' | 'wins_7_9' | 'wins_10_plus', BattleBucketCounts>
  >;
  matchups: Array<{ opponent_hero: string; battle_decided_count: number; wins: number; losses: number }>;
};

export type WebHeroDailyPayload = {
  schema_version: '1';
  kind: 'web_hero_daily';
  day: string;
  generatedAt: string;
  rows: WebHeroDailyRow[];
};
```

Schema guards (Load Flow steps 2 & 6): `isAnalyzerV4Manifest(m)` checks `namespace === 'analyzer-v4'`
+ `web.schema_version === '1'`; `validateWebDailyPayload(p, expectedDay)` checks `schema_version === '1'`,
`kind === 'web_hero_daily'`, and `p.day === expectedDay`.

## 4. Load flow & failure isolation

1. Fetch `analyzer-v4/manifest.json`; validate with `isAnalyzerV4Manifest`.
2. `selectDays(manifest.web.days, '7d', manifest.latest_complete_day)` → up to the latest 7 days at or
   before `latest_complete_day` (superset; the UI re-slices per selected window client-side).
3. Load each selected day via `client.getWebDaily(path)` through the **kept** bounded-concurrency queue
   in `page-data.ts` (default concurrency 6) with progress tracking; validate each payload.
4. **Per-file isolation (bug fix, see §10.3):** load days with `allSettled`, not a single `Promise.all`
   that throws the whole page. Track the loaded-day set. One explicit one-shot refetch for a 404 day
   (the client does not auto-retry 404).
5. Degradation policy on a failed daily file:
   - If the `latest_complete_day` file fails → the "latest snapshot" cannot be shown truthfully →
     scoped error state for the snapshot section (do **not** backfill from an older day).
   - If only older day(s) fail → degrade the window to loaded days; show the coverage note + a
     "some days unavailable" caveat naming the included span.
   - Never produce a silent partial aggregate.

`generatedAt` for the footer comes from `manifest.generatedAt`. Path note: `web.days[].path` already
contains the `analyzer-v4/web/` prefix — `getWebDaily` passes it verbatim to `loadMetric` (base+path);
do **not** re-prepend `analyzer-v4/` or every daily fetch 404s.

## 5. Derivation layer — `src/shared/lib/web-daily.ts` (new, pure, no React)

All windowing/rates/Wilson/percentiles/matchups are computed client-side from raw counts. Every rate
returns `null` on a zero denominator (never `NaN`/`Infinity`). Histogram keys are parsed numerically;
only present keys are iterated.

```ts
// 95% Wilson lower bound, z=1.96 — copied verbatim from web-analysis-logic.md to keep parity
// with the analyzer's z=1.96 formula. null when attempts<=0.
wilsonLower95(successes: number, attempts: number): number | null

// p75 (etc.) from a keyed histogram via ceil(total*p) rank walk; null on empty.
percentileFromHistogram(counts: Record<string, number>, p: number): number | null

// latest N (1/3/7) manifest days at/before latestCompleteDay; available subset when fewer; no zero-fill.
selectDays(days, window, latestCompleteDay): WebDayRef[]

// group by hero (tier already filtered): sum ints, histograms by key, bucket maps by bucket+field,
// matchups by opponent_hero. Never derive 'all' from low+mid+high.
mergeRows(rows: WebHeroDailyRow[]): Map<string, MergedHeroRow>

// per-hero view model (see below); null on zero denominators.
deriveHeroMetrics(merged: Map<string, MergedHeroRow>): HeroMetricsRow[]

// one chartable point per loaded day per hero where runs_completed > 0
// (daily tenWinRate = final_wins['10']/runs_completed). Null-denominator daily rows
// are kept in a side list for "no value" notes, but are not converted into SVG points.
// Reuse the existing chart shell/testids/axis/tooltip geometry; update point mapping
// so null rows are skipped and cannot produce NaN coordinates or "NaN%".
deriveTrendSeries(rows: WebHeroDailyRow[], selectedDays: WebDayRef[]): HeroTrendSeries[]

// per-opponent rate + wilsonLower95(wins,n)/wilsonLower95(losses,n); favorable sort by win-wilson
// desc then n then name, unfavorable by loss-wilson; hide below minSample; mirror handled by caller.
deriveMatchups(merged: MergedHeroRow, minSample: number): { favorable: MatchupRow[]; unfavorable: MatchupRow[]; mirror: MatchupRow | null }

deriveAvailableWindows(days): MetricWindow[]   // [] when no days; otherwise always ['1d','3d','7d']
deriveAvailableTiers(days: WebHeroDailyPayload[]): RatingTier[]  // union of loaded rows' tiers, canonical order
```

`HeroMetricsRow` view model: `hero`, `runsTotal`, `runsCompleted`, `scoredRuns`, `runShare`,
`tenWinCount`, `tenWinRate`, `tenWinRateWilsonLower`, `avgRunDays10w`, `p75RunDays10w`,
`perfectRate`/`goldRate`/`silverRate`/`bronzeRate`/`misfortuneRate`, `battleWinRate`(+wilson),
`finalBattleWinRate`(+wilson), `isCanonical`.

`HeroTrendSeries` view model: `hero`, `color`, `isCanonical`, `points: Array<{day; winRate}>`,
`latestWinRate`, `firstWinRate`, `nullPointCount`. `points` contains only chartable rates. A hero with
zero chartable points is omitted from the trend chart and legend, but remains visible in the ranking table
and dossier with `—` rates. If a hero has a gap in the middle, draw separate polyline segments rather than
connecting across the missing day; a single chartable point renders as a dot.

Derived formulas (denominators guarded → null):

| Value | Formula | null when |
|---|---|---|
| 10-win count | `final_wins_counts['10'] ?? 0` | — |
| 10-win rate | `tenWins / runs_completed` | `runs_completed == 0` |
| **10-win Wilson lower** (ranking key) | `wilsonLower95(tenWins, runs_completed)` | `runs_completed == 0` |
| run share | `runs_completed / Σ runs_completed(scope)` (per the doc; current UI used `runs_total`) | scope total == 0 |
| scoredRuns | `Σ final_wins_counts.values()` | — |
| perfect | `run_days_10w_counts['10'] ?? 0` | — |
| gold | `tenWins − perfect` | — |
| silver / bronze / misfortune | `Σ final_wins_counts[k]`, k∈7–9 / 4–6 / 0–3 | — |
| `*Rate` (victory tiers) | `tier / scoredRuns` | `scoredRuns == 0` |
| avg / p75 run-days-to-10w | weighted mean / `percentileFromHistogram` over `run_days_10w_counts` | histogram empty |
| overall battle win rate | `battle_wins / battle_decided_count` | `battle_decided_count == 0` |
| final-battle win rate | `final_battle_wins / final_battle_decided_count` | denom == 0 |

## 6. Information architecture

Two altitudes plus a bridging chart, all inside `StatsPageShell` on `/heroes`. A single shared
`focusedHero` replaces today's separate `selectedSnapshotHero` + `selectedTrendHero` and drives the trend
spotlight plus the per-hero dossier. Filters write `w` + `t`; `focusedHero` is ephemeral UI state.
There is no separate trend-tier state: the trend honors the same global `t` as the ranking/dossier and
ignores only the global `w` by always using the loaded 7-day span.

| # | Region | Altitude | Driven by |
|---|---|---|---|
| §0 | Page header + BazaarDB links + coverage/quality strip | chrome | manifest |
| §1 | Global scope filters (window `1d/3d/7d` + tier `all/low/mid/high`) in the shell `filters` slot | global control | writes `w`,`t` |
| §2 | **Hero ranking table** (run grain) — the spine and drill source | PRIMARY | `w`+`t` |
| §3 | 10-win-rate trend chart (reuse existing SVG; fixed 7d span; honors tier, ignores window) | secondary-overview | `t` |
| §4 | **Per-hero dossier** (battle / game-stage / victory-bucket / matchups) | secondary-detail (battle grain) | `w`+`t`+focusedHero |

Defaults: tier `all` (omitted from URL), window `1d` (omitted). Load the explicit `all` row; never
sum tiers. Detail sits full-width below the ranking on every breakpoint; dossier cards multi-column
only inside themselves on `lg+`.

Available-window semantics are deliberately separate from coverage. If at least one analyzer-v4 day loads,
the UI keeps the three existing window buttons (`1d`, `3d`, `7d`) so the page shape does not jump as the
retained window fills in. The coverage note says how many loaded days actually contributed to the selected
window. If no Web days load, render the empty state and hide the filters.

## 7. Visualization design (per dimension)

| Dimension (**bold** = new) | Form | Reused component |
|---|---|---|
| Hero ranking (10-win rate + Wilson lower, share, 10W count, **avg/p75 days→10W**, perfect/gold/silver/bronze, **overall & final battle WR**) | sortable `table-fixed` + `.databar` bars | snapshot table, `SortableHeader`, `HeroBadge`, `.hero-rail`, `.databar` |
| 10-win-rate trend | multi-line SVG, one chartable point/day/hero; split lines across null gaps | existing inline SVG chart shell/testids/axis/tooltip, with null-safe point mapping |
| **Overall vs final-battle WR** | horizontal **dumbbell** (segment length+color = the gap), Wilson whisker | SVG axis/grid + marker + tooltip in a `.surface` card |
| **Game-stage WR** (day_1_3/4_7/8_plus) | grouped bars (focused hero) / 3-col `.databar` mini-table (all heroes) | `.databar`, `SegmentedButton` toggle |
| **Victory-bucket WR** (wins_0_3/4_6/7_9) | 3-point connected progression line (snowball vs stall) | multi-line SVG shell |
| **Matchups** (favorable / unfavorable) | two `.surface` cards, opponent `HeroBadge` + signed bar + raw `n` | `.databar-pos`/`.databar-neg` |
| Victory-outcome distribution | 100% stacked bar (cross-hero) + focused-hero `final_wins` histogram | `metric-row` + SVG shell |

Shared primitives (build once): `wilsonLower95` (in `dashboard.ts`), the `null → '—'` guard (existing
`buildTierRate` pattern, `HeroOverviewDashboard.tsx:185-191`), `scoredRuns` denominator, numeric
histogram-key parsing, non-canonical pass-through (`getHeroColor`/`getHeroShortLabel` fallback),
incomplete-coverage tolerance, and the null-sort sentinel fix (§10.1).

Default sorts: ranking + battle panels by **Wilson lower desc** (then `runs_completed` desc, then hero
asc), with null-denominator rows sinking via the sentinel. Display the point rate as the bar; rank by
the Wilson lower.

### 7.1 Display effect and style consistency

The page should still read as the current `/heroes` Almanac dashboard, not a new product surface. Keep the
visual language grounded in the existing code:

- Shell and spacing: keep `StatsPageShell`'s max-width page rhythm and header/actions placement
  (`src/shared/components/StatsPageShell.tsx:39-71`). Use the shell `filters` slot for the one global
  window+tier control, not an extra local control block in the trend card.
- Surfaces: use `.surface` for major panels and `.surface-flat` only for compact nested detail panes. Do
  not introduce nested card-in-card structures; repeated matchup/detail cards may be individual `.surface`
  siblings (`src/styles/global.css:89-106`).
- Table language: keep the current snapshot table feel: `table-fixed`, `HeroBadge`, `.hero-rail`,
  `.metric-row`, `.databar`, tabular numeric cells, compact uppercase headers, and the existing sort-arrow
  pattern (`src/shared/components/HeroBadge.tsx:31-57`, `src/styles/global.css:137-190`,
  `src/shared/components/SortableHeader.tsx:20-58`).
- Chart language: keep the current dark SVG chart frame, brass gridlines, hero-colored strokes, focused
  area fill, point tooltip, and legend button shape. Unknown/non-canonical heroes stay out of the chart so
  the fallback grey color does not make multiple unknown series indistinguishable
  (`src/features/heroes/HeroOverviewDashboard.tsx:629-866`, `src/shared/lib/heroes.ts:31-42`).
- Dossier language: battle/stage/bucket/matchup sections use compact operational panels: dense numeric
  labels, horizontal bars, signed deltas, and small tooltips. Avoid hero-scale typography inside these
  panels; reserve the large display type for the page header and section titles already used today.
- Color: keep the current dark base + brass accent + hero swatches + positive/negative greens/reds.
  New visualizations should use opacity, databar fill, and stroke weight before adding new colors
  (`src/styles/global.css:154-180`, `src/shared/lib/heroes.ts:13-21`).
- Copy: every visible label, tooltip, empty-state line, aria-label, and dismiss label goes through
  `src/content/site-copy.ts`; no hardcoded dashboard text in React components.
- Responsive behavior: ranking and dossier stack vertically on mobile. Fixed-format elements use explicit
  widths/aspect ratios (`table-fixed`, SVG `viewBox`, stable grid tracks) so hover, focus, null values, and
  localized copy do not resize the layout.

## 8. Methodology-legibility layer

Disclosure budget — the page stays a dashboard; prose accumulates only behind one modal:

| Layer | Default visible | Surface |
|---|---|---|
| ⓘ tooltips on metric headers | yes (icon only) | 1 sentence on hover/focus |
| "Ranked by Wilson 95% lower bound" caption + formula chip | yes | 1 line in the table header |
| Victory-tier legend strip (color dot + word) | yes | 1 compact row |
| Coverage / freshness caption (days loaded + quality dot) | yes | 1 line, elaborates the footer `lastSync` |
| "How we measure this" sheet (7 sections + glossary) | on click | large scrollable `DialogShell` variant — the only prose container |

Implementation: extract `InfoTip` from the existing BazaarDB `?` tooltip idiom
(`HeroOverviewDashboard.tsx:533-547`) into `src/shared/components/InfoTip.tsx`; add an optional
`info?: ReactNode` slot to `SortableHeader` (keep the sort button and ⓘ as separate focus targets — do
not nest a button in a button). Extend `DialogShell` instead of using it unchanged: add a `size?: 'sm'|'lg'`
or equivalent class hook, keep the existing small modal behavior for support, and make the methodology
variant `max-w-3xl`, `max-h-[min(760px,calc(100vh-3rem))]`, and `overflow-y-auto` so the 7-section sheet
is readable on mobile and desktop. Full zh+en methodology copy is in Appendix A.

## 9. Edge cases & UI states

Single threshold/config block in `dashboard.ts`: `WEB_DAILY_NOMINAL = {1d:1,3d:3,7d:7}`,
`DQ_BUNDLE_FAIL_WARN = 0.05`, `DQ_DECODE_FAIL_WARN = 0.02`, `MATCHUP_MIN_SAMPLE = 20`.

| Case | Trigger | Behavior |
|---|---|---|
| Non-canonical hero (`Common`) | `hero ∉ HEROES` | Show in tables (fallback color/label + a "non-standard" marker); **exclude from the trend chart** (all unknowns collapse to one grey, indistinguishable); never fold into a synthetic "Other" sum; skip when picking the default focused hero |
| Sparse tier (`high`=4) | tier has < heroes of `all`, or 0 rows | Derive available tiers from loaded rows; show a pill only if ≥1 row; if the selected tier loses all rows after a window change, fall back to `all` and write the resolved value to the URL; a 0-row tier renders a section-level empty state (reuse `snapshot.noData`), not a page error; a sparse-but-nonzero tier is valid data |
| Sparse days (7d ≈ 2) | `loaded days < WEB_DAILY_NOMINAL[window]` | Aggregate only loaded files; "showing N of M days" coverage note; keep all three window pills; never zero-fill |
| Zero denominator | any rate denom ≤ 0 | `null → '—'` (guard before `formatPercent` so `"NaN%"` can't appear); `—` cell gets an aria-label; nulls **sink to bottom in both sort directions** |
| Trend null point | daily `runs_completed == 0` for a hero | Keep the row for ranking/dossier, omit that day from the SVG series, split the line across gaps, and show a compact no-value/low-sample note when the focused hero has omitted points |
| Low-sample matchup | `battle_decided_count < 20` | Re-sort client-side; below threshold → rate shown as `—` + "low sample" tag, collapsed under a disclosure (don't hide — hiding implies never faced); encounter count stays visible |
| Mirror matchup | `opponent_hero === hero` | Show + label as "mirror"; **exclude from best/worst highlights** (~50% by construction, no edge signal) |
| High `bundle_download_fail_rate` (live 12.6%) | rate > 0.05 (or `sli.dq_health.status` non-ok) | Soft, dismissible warning banner at the top of the children area; **never hides data** |
| `web.days` empty/absent | manifest OK but no days | "Data coming soon" empty state (distinct from the red error screen) |
| Daily file 404 | non-retryable fetch | Per §4 degradation policy; never a silent partial aggregate |
| Loading / hard error | manifest or latest-day fetch fails | Reuse `LoadingScreen` (progress labels keep `Loading/Loaded/Failed` prefixes so `translateProgressLabel` localizes) / `ErrorScreen` |
| Invalid/unavailable `w`/`t` | bad or absent-in-data param | `parseMetricWindow`/`parseRatingTier` + availability check fall back; day-count does **not** invalidate `w` (7d with 2 days stays 7d); write the resolved value back via `replaceState` |

## 10. Existing-code bugs this migration must fix

1. **Null-sort direction** (`table-sorting.ts:14-35,52-61`). `compareValues` returns a fixed `+1/-1`
   for nulls, then `sortRows` negates the whole result for `desc` (line 60) → nulls float to the **top**
   under `desc`. With the new default sort = Wilson-lower desc, a zero-denominator hero (Wilson = null)
   would rank #1. Fix: either partition nulls last after the direction flip, or use a v4-local
   comparator / accessor sentinel (`?? -Infinity`). Do not change `compareValues` for the global flip
   without a test; the cleanest is a comparator that always sinks nulls.
2. **`formatPercent(NaN)` → `"NaN%"`** (`dashboard.ts:13-15`). Every rate must be guarded to `null`
   before formatting.
3. **One rejection kills the page** (`page-data.ts:235-245`, `route-pages.tsx:58-64`). The `Promise.all`
   + non-retryable 404 fails the whole `useQuery` → `ErrorScreen`. v4 loads `web.days` with per-file
   isolation (allSettled) + the §4 degradation policy.
4. **Trend assumes all rates are numbers.** Current `HeroSeries` / `ChartPoint` use `winRate: number` and
   chart labels call `formatPercent` directly. V4 rows can have `runs_completed == 0`; do not coerce that
   to `0`. Filter or segment null chart points before SVG coordinate generation, and test that no `"NaN%"`
   appears.

## 11. Replacement plan — file by file

**Keep / reuse with narrow changes:** the inline SVG trend chart shell/testids/axis/tooltip geometry;
`SegmentedControl`/`SegmentedButton`; `SortableHeader` + `table-sorting.ts` (plus the null-sink fix);
`StatsPageShell`;
`dashboard.ts` formatters + `buildLocalizedHref`; `heroes.ts`; the bounded concurrency loader in
`page-data.ts`; `HeroBadge`/`.databar`/`.hero-rail`/colgroup table; both BazaarDB links; the `w/t/lang`
URL `replaceState` effect; SPA routing; `App.tsx` + `createRuntimeMetricsClient()` call site (only the
client's internal path + return type change).

| File | Action | Detail |
|---|---|---|
| `src/shared/lib/metrics.ts` | modify | Keep enums + `parse*`. Delete legacy `ManifestPayload`/`HeroOverviewPayload`/`HeroWinrateDailyPayload` + `getAvailableTiers`/`getAvailableTiersForWindowlessMetric`/`getAvailableWindows`. Add v4 types (§3) + `isAnalyzerV4Manifest`/`validateWebDailyPayload`. |
| `src/shared/lib/web-daily.ts` | **add** | Pure derivation layer + view-model types (§5). |
| `src/shared/lib/dashboard.ts` | modify | Add `wilsonLower95`, the threshold/config block (§9), and any histogram stat helper. Keep all existing formatters. |
| `src/shared/lib/table-sorting.ts` | modify | Null-sink fix (§10.1). |
| `src/shared/lib/metrics-client.ts` | modify | Keep fetch/retry/timeout/abort core. `getManifest` → `analyzer-v4/manifest.json` returning `AnalyzerV4Manifest`. Add `getWebDaily(path)` (pass path verbatim). Remove `getHeroOverview`/`getHeroWinrateDaily`. |
| `src/app/page-data.ts` | modify | Keep progress tracker + task queue + abort plumbing. New `HeroOverviewPageData` = `{manifest; source; days: WebHeroDailyPayload[]; availableWindows; availableTiers; latestCompleteDay; coverage:{requested;loaded; failedDays}}`. `availableWindows` is `[]` only when there are no loaded Web days, otherwise all three windows. New loader flow with per-file isolation (§4). Delete `WindowTierMap`/`loadWindowTierMap`/`countWindowTierPayloads`. |
| `src/app/route-pages.tsx` | modify | Swap imports; `getInitialWindow` reads `data.availableWindows`; pass new store props. |
| `src/features/heroes/HeroOverviewDashboard.tsx` | modify | New props (days + latestCompleteDay + availableWindows/Tiers + coverage). Delete local `buildChartState`/`buildTierRate`/`WINDOW_DAY_COUNT` (moved to `web-daily.ts`), delete `selectedTrendTier`, and replace separate trend/snapshot hero state with shared `focusedHero`. Snapshot table + trend fed from derived view models. Add §4 dossier panels, methodology layer (§8), and coverage/DQ strip (§9). Reuse SVG/table styling, but make trend point rendering null-safe. |
| `src/shared/components/InfoTip.tsx` | **add** | Extracted tooltip idiom (§8). |
| `src/shared/components/SortableHeader.tsx` | modify | Optional `info?: ReactNode` slot after the sort arrows. |
| `src/shared/components/DialogShell.tsx` | modify | Preserve current default small modal. Add large scrollable variant for the methodology sheet (`max-w-3xl`, viewport max-height, internal scroll). |
| `src/content/site-copy.ts` | modify | Additive: `stats.heroes.methodology` (Appendix A) + battle/stage/bucket/matchup labels + coverage/DQ/empty-state keys. No removals. Keep coverage/DQ keys as top-level `stats.heroes.*`, not nested inside `methodology`. |
| `docs/architecture.md` | modify | Update "Data Sources" (lines 34-36) to the analyzer-v4 manifest + daily paths. |

**Delete:** legacy V3 types/helpers above (blast radius confirmed contained: `route-pages.tsx` +
`test/metrics.test.ts` + `test/page-data.test.ts` + `test/hero-overview-dashboard.test.tsx`).

Net request reduction: ~16 (3 windows × 4 tiers overview + 4 daily) → 1 manifest + ≤7 daily files.

## 12. Copy additions (`site-copy.ts`)

All new strings go through `stats.heroes` (+ a couple of `common` keys), zh + en, via the `locale`
prop. Following the codebase's no-interpolation convention, split prefix/suffix pieces where a value is
embedded (mirroring `error.titlePrefix`/`releaseFallbackPrefix`). Key groups: `methodology.*`
(Appendix A), `battle.{overallWinRate,finalBattleWinRate,gap,wilsonLower}`,
`stage.{day_1_3,day_4_7,day_8_plus,title}`, `victoryProgress.{wins_0_3,wins_4_6,wins_7_9,title}`,
`matchups.{favorable,unfavorable,mirror,lowSampleTag,lowSampleDisclosure,sample,empty,minSampleNote,title}`,
`outcome.{perfect,gold,silver,bronze,misfortune,title,histogramTitle}`,
`tableHeaders.{wilsonLower,runShare,avgDays,p75Days,overallBattle,finalBattle}`,
`heroClass.{nonCanonicalTag,nonCanonicalTooltip,chartExcludedFootnote}`,
`coverage.{windowSuffix,daysLoadedPrefix,daysLoadedSeparator,partialNote,syncedPrefix,qualityOk,qualityDegraded,failRatePrefix,someDaysUnavailable,noTrendValue}`,
`dataQuality.{bundleFailBanner,decodeFailBanner,dismiss}`, `unavailable.{title,body}`, `tierEmpty.{title,body}`,
and `common.noValueLabel`. Reuse existing `tierLabels`, `WINDOW_LABELS`, `scope.*`, and loader prefixes.

`methodology` contains only the long-form explanatory sheet strings. Coverage/freshness/DQ labels are
top-level `stats.heroes.coverage` / `stats.heroes.dataQuality` because they are used by always-visible
dashboard chrome as well as the sheet.

## 13. Testing

- **`test/web-daily.test.ts` (new, pure functions):** `selectDays` 1d/3d/7d + fewer-than-N coverage;
  `mergeRows` additivity (two days == direct combined aggregate) for ints, histograms, buckets,
  matchups; `all` kept separate from `low+mid+high`; `wilsonLower95` zero/small/large + null on
  `attempts<=0`; `percentileFromHistogram` p75 + null on empty; `deriveHeroMetrics` rates + victory-tier
  reconstruction (perfect/gold/silver/bronze/misfortune over `scoredRuns`); `deriveTrendSeries`
  one chartable point per non-null day, null-gap segmentation, single-point rendering, non-canonical
  exclusion, and latest-rate sort; `deriveMatchups` merge + favorable/unfavorable sort + min-sample
  threshold + mirror split; schema guards reject namespace/schema_version/kind/day mismatch.
- **`test/metrics.test.ts` (rewrite):** drop legacy `getAvailable*` assertions; add
  `deriveAvailableWindows`/`deriveAvailableTiers`/`isAnalyzerV4Manifest`/`validateWebDailyPayload`. Keep
  the `parse*` tests.
- **`test/metrics-client.test.ts` (change):** `getManifest` URL → `.../analyzer-v4/manifest.json`; new
  `getWebDaily(path)` test asserting base+path verbatim; keep timeout/retry/abort cases.
- **`test/page-data.test.ts` (rewrite):** v4 manifest + `getWebDaily` mock; progress = 1 + N labels;
  re-verify abort propagation; add a per-file-isolation test (one daily 404 degrades, does not throw
  the page).
- **`test/hero-overview-dashboard.test.tsx` (rebuild fixtures):** `WebHeroDailyPayload[]` props; recompute
  expected percentages from histograms. Keep/re-assert: BazaarDB links, `daily-winrate-chart/line/tooltip`
  testids, window/tier `aria-pressed` toggles, `w=`/`t=` URL writes, hero color strokes, colgroup length,
  sortable headers. Add behavioral assertions for: one global tier control drives ranking/trend/dossier,
  no separate trend-tier control, null-sink ranking, `—` (no `NaN%`), trend null points omitted/segmented,
  one-404 degradation, DQ banner appears only past threshold, mirror excluded from highlights, ⓘ tooltip +
  large scrollable `DialogShell` open/close (ESC + backdrop), partial-coverage note only when
  `loaded < nominal`.
- **No coverage-theater** (project rule): assert behavior, not copy snapshots or mock call sequences.
- Verify with `npm test`, `npm run typecheck`, `npm run build`.

## 14. Rollout & verification

Single PR. Suggested internal implementation order (one branch): (1) types + schema guards; (2) pure
`web-daily.ts` + `wilsonLower95` + tests; (3) null-sink + client + `page-data` loader with isolation +
tests; (4) dashboard parity (global filters + null-safe trend + ranking on derived view models, default
Wilson sort); (5) §4 dossier panels; (6) methodology layer + copy + large DialogShell variant; (7)
DQ/coverage/empty states; (8) `architecture.md` + final test/typecheck/build. The site is a client-side SPA against already-live data, so no
analyzer/server coordination is required; deploy via `npm run deploy` (or `deploy:preview` first).

## 15. Locked decisions

- Single full-scope PR (chosen 2026-06-07).
- Victory-tier denominator = `scoredRuns = Σ final_wins_counts`.
- Run-share denominator = `runs_completed` (per the migration doc; the current UI used `runs_total` — flip if you prefer pick-rate semantics).
- Default sort = `tenWinRateWilsonLower` desc, nulls sink.
- Single global tier control; no independent trend-tier selector.
- Trend chart omits null-denominator points and splits lines across gaps instead of coercing to `0`.
- Mirror matchups shown + labeled, excluded from highlights.
- Non-canonical heroes shown in tables, excluded from the trend chart.
- `MATCHUP_MIN_SAMPLE = 20` (configurable).
- Coverage never zero-fills; DQ warns softly, never hides.

## Appendix A — methodology copy (`stats.heroes.methodology`, zh + en)

Type addition to `HeroStatsCopy`:

```ts
methodology: {
  triggerLabel: string; triggerAriaLabel: string; sheetEyebrow: string; sheetTitle: string;
  closeLabel: string; intro: string; rankedByCaption: string;
  formula: { wilson: string; winRate: string; runShare: string; tenWinRate: string; runDays: string };
  tips: { hero: string; winRate: string; runs: string; share: string; wins10w: string; perfect: string; gold: string; silver: string; bronze: string };
  tierLegend: Record<'perfect'|'gold'|'silver'|'bronze'|'misfortune', { label: string; gloss: string }>;
  sections: Record<'ranking'|'battles'|'outcomes'|'tiers'|'tierVsAll'|'window'|'quality', { title: string; body: string }>;
  glossary: Array<{ term: string; definition: string }>;
};
coverage: {
  windowSuffix: string; daysLoadedPrefix: string; daysLoadedSeparator: string; partialNote: string;
  syncedPrefix: string; qualityOk: string; qualityDegraded: string; failRatePrefix: string;
  someDaysUnavailable: string; noTrendValue: string;
};
```

**zh**

```ts
methodology: {
  triggerLabel: '我们如何统计', triggerAriaLabel: '查看统计方法说明',
  sheetEyebrow: '方法说明', sheetTitle: '我们如何统计', closeLabel: '关闭',
  intro: '这里的每个数字都来自真实上传的对局，下面说明每项如何计算。',
  rankedByCaption: '按 Wilson 95% 置信下界排名',
  formula: {
    wilson: 'Wilson 95% 下界(胜场 ÷ 有效对战)',
    winRate: '胜场 ÷ 有效对战',
    runShare: '该英雄局数 ÷ 窗口内全部局数',
    tenWinRate: '10胜局数 ÷ 完成局数',
    runDays: '达成10胜天数 · 平均 / 75分位',
  },
  tips: {
    hero: '按 Wilson 95% 置信下界胜率排名。',
    winRate: '胜场 ÷ 有效对战（不计平局）。',
    runs: '该英雄在此窗口记录到的局数。',
    share: '该英雄占窗口内全部局数的比例。',
    wins10w: '达成 10 胜的局数。',
    perfect: '10 天内拿到 10 胜，占完成局数的比例。',
    gold: '拿到 10 胜，但用了超过 10 天。',
    silver: '7-9 胜。', bronze: '4-6 胜。',
  },
  tierLegend: {
    perfect: { label: '完美', gloss: '10 天内 10 胜' },
    gold: { label: '黄金', gloss: '10 胜，超过 10 天' },
    silver: { label: '白银', gloss: '7-9 胜' },
    bronze: { label: '青铜', gloss: '4-6 胜' },
    misfortune: { label: '厄运', gloss: '0-3 胜' },
  },
  sections: {
    ranking: { title: '置信度修正排名', body: '英雄按胜率的 Wilson 95% 置信下界排名，而不是原始胜率。样本不足时会被往下拉，直到有足够对战支撑，所以靠 3 场幸运胜利的英雄无法登顶。' },
    battles: { title: '有效对战与终局对战', body: '有效对战指分出胜负的一场战斗，平局和未结束的不计，因此胜场 + 负场始终等于有效对战。终局对战是一局中决定结束的最后一战。' },
    outcomes: { title: '对局结果', body: '10胜率是完成局数中打到 10 胜的比例；局数占比是该英雄在窗口内的份额；达成10胜天数展示 10 胜局用了多久，给出平均值与 75 分位（p75，即每 4 局有 3 局在该天数内完成）。' },
    tiers: { title: '战绩等级', body: '每个完成的对局按最终胜场归入一档：完美（10 天内 10 胜）、黄金（10 胜但超过 10 天）、白银（7-9）、青铜（4-6）、厄运（0-3）。五档合起来覆盖全部完成局。' },
    tierVsAll: { title: '“全部”是独立测量，不是相加', body: '“全部”是单独统计的人群，不等于低 + 中 + 高相加。分段未知的对局只计入“全部”，把各档相加会少算。请直接看“全部”这一行。' },
    window: { title: '时间窗口与缺失的天', body: '1 / 3 / 7 天窗口是把每天的计数相加。没有上传的那天是未知，而不是 0，所以 7 天窗口可能只覆盖不到 7 个真实日期。我们不会用 0 填补缺失的天。' },
    quality: { title: '新鲜度与覆盖', body: '“同步”是这份快照的生成时间；覆盖显示窗口实际加载了多少天；上传失败率反映有多少对局数据包未能下载用于分析，超过 5% 会标记为数据质量下降。' },
  },
  glossary: [
    { term: '有效对战', definition: '分出胜负的对战，不含平局。' },
    { term: '终局对战', definition: '一局中决定结束的最后一战。' },
    { term: 'Wilson 置信下界', definition: '对比率做置信度修正后的下限；样本越小分数越低。' },
    { term: '10胜局', definition: '打到 10 胜的对局。' },
    { term: '局数占比', definition: '该英雄占窗口内全部局数的比例。' },
    { term: 'p75 达成天数', definition: '每 4 局 10 胜局有 3 局在此天数内完成。' },
  ],
},
coverage: {
  windowSuffix: ' 窗口', daysLoadedPrefix: '已加载 ', daysLoadedSeparator: ' / ',
  partialNote: '覆盖不完整', syncedPrefix: '同步于 ',
  qualityOk: '数据正常', qualityDegraded: '数据质量下降', failRatePrefix: '数据包下载失败率 ',
  someDaysUnavailable: '部分日期暂不可用，当前结果只包含已加载日期。',
  noTrendValue: '部分日期没有可计算的趋势点。',
},
```

**en**

```ts
methodology: {
  triggerLabel: 'How we measure this', triggerAriaLabel: 'How we measure this',
  sheetEyebrow: 'Methodology', sheetTitle: 'How we measure this', closeLabel: 'Close',
  intro: 'Every number here comes from real uploaded runs. Here is how each one is calculated.',
  rankedByCaption: 'Ranked by Wilson 95% lower bound',
  formula: {
    wilson: 'Wilson 95% lower bound(wins ÷ decided)',
    winRate: 'wins ÷ decided battles',
    runShare: 'hero runs ÷ all runs in window',
    tenWinRate: '10-win runs ÷ completed runs',
    runDays: 'days to 10 wins · avg / p75',
  },
  tips: {
    hero: 'Ranked by Wilson 95% lower-bound win rate.',
    winRate: 'Wins ÷ decided battles (draws excluded).',
    runs: 'Runs recorded for this hero in the window.',
    share: "This hero's share of all runs in the window.",
    wins10w: 'Runs that reached 10 wins.',
    perfect: '10 wins within 10 days — share of completed runs.',
    gold: '10 wins, but it took more than 10 days.',
    silver: '7-9 wins.', bronze: '4-6 wins.',
  },
  tierLegend: {
    perfect: { label: 'Perfect', gloss: '10 wins in 10 days' },
    gold: { label: 'Gold', gloss: '10 wins, over 10 days' },
    silver: { label: 'Silver', gloss: '7-9 wins' },
    bronze: { label: 'Bronze', gloss: '4-6 wins' },
    misfortune: { label: 'Misfortune', gloss: '0-3 wins' },
  },
  sections: {
    ranking: { title: 'Confidence-adjusted ranking', body: 'Heroes are ranked by the Wilson 95% lower bound of their win rate, not the raw rate. Small samples get pulled down until enough battles confirm the result, so a hero with three lucky wins cannot top the board.' },
    battles: { title: 'Decided & final battles', body: 'A decided battle is one fight with a clear winner — draws and unfinished fights are left out, so wins + losses always equals decided battles. A final battle is the run’s last decisive fight, the one that ends the run.' },
    outcomes: { title: 'Run outcomes', body: '10-win rate is the share of completed runs that reached 10 wins. Run share is a hero’s slice of all runs in the window. Days-to-10W shows how fast 10-win runs got there — the average and the 75th percentile (p75 = 3 of 4 such runs finished within that many days).' },
    tiers: { title: 'Victory tiers', body: 'Each completed run lands in one tier by its final wins: Perfect (10 wins within 10 days), Gold (10 wins, but more than 10 days), Silver (7-9), Bronze (4-6), Misfortune (0-3). The five tiers together cover every completed run.' },
    tierVsAll: { title: 'All is measured, not summed', body: '“All” is its own measured population, not Low + Mid + High added up. Runs with an unknown rating count only toward All, so summing the tiers would undercount. Read the All row directly.' },
    window: { title: 'Windows & missing days', body: 'A 1/3/7-day window adds up each day’s counts. Days with no upload are unknown, not zero — so a 7-day window can cover fewer than 7 actual days. We never fill missing days with zeros.' },
    quality: { title: 'Freshness & coverage', body: '“Synced” is when this snapshot was built. Coverage shows how many days the window actually loaded. The upload-failure rate flags how many run bundles failed to download for analysis; above 5% we mark the data degraded.' },
  },
  glossary: [
    { term: 'Decided battle', definition: 'A fight with a clear winner; draws excluded.' },
    { term: 'Final battle', definition: "The run’s last decisive fight." },
    { term: 'Wilson lower bound', definition: 'A confidence-adjusted floor of a rate; smaller samples score lower.' },
    { term: '10-win run', definition: 'A run that reached 10 wins.' },
    { term: 'Run share', definition: "A hero’s portion of all runs in the window." },
    { term: 'p75 days-to-10W', definition: '3 of 4 ten-win runs finished within this many days.' },
  ],
},
coverage: {
  windowSuffix: ' window', daysLoadedPrefix: '', daysLoadedSeparator: ' of ',
  partialNote: 'partial coverage', syncedPrefix: 'synced ',
  qualityOk: 'data healthy', qualityDegraded: 'data degraded', failRatePrefix: 'bundle download failures ',
  someDaysUnavailable: 'Some days are unavailable; this view includes loaded days only.',
  noTrendValue: 'Some days have no calculable trend point.',
},
```

Confirm the zh tier word 厄运 (misfortune) matches the mod's in-game term if one exists.
