# Hero Detail Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/heroes/[hero]` drill-down page with single-hero trend, current summary, and hero-scoped card analysis, linked from the homepage.

**Architecture:** Reuse the existing static-Astro + hydrated-React pattern. Astro preloads all tier/window payload maps for hero overview, hero daily, item winrate, and item uplift; the React dashboard filters those payloads down to the selected hero and syncs `w/t/m/lang` back into the URL.

**Tech Stack:** Astro, React, TypeScript, Vitest, existing metrics repository and dashboard helpers.

---

### Task 1: Add shared hero route helpers and homepage hero links

**Files:**
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/dashboard.ts`
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/DailyHeroDashboard.tsx`
- Test: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add assertions that homepage hero entries link to `/heroes/<hero>` while preserving active query params.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/daily-hero-dashboard.test.tsx`
Expected: FAIL because hero links do not exist yet.

- [ ] **Step 3: Add minimal shared hero href helpers**

Implement helper(s) for:
- validating known hero names
- building `/heroes/<hero>` URLs with `w/t/lang`

Then update the homepage hero legend and hero table names to render anchor links instead of plain text.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/daily-hero-dashboard.test.tsx`
Expected: PASS

### Task 2: Add the hero detail route and dashboard

**Files:**
- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/components/HeroDetailDashboard.tsx`
- Create: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/pages/heroes/[hero].astro`
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/interactive-filters.ts`
- Modify: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/src/lib/dashboard.ts`
- Test: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-detail-dashboard.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a new test file covering:
- initial state from hero slug + `?w=&t=&m=`
- summary values from `hero_overview`
- card metric switch from `winrate` to `uplift`
- invalid hero handling helper behavior

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- test/hero-detail-dashboard.test.tsx`
Expected: FAIL because the dashboard and route logic do not exist.

- [ ] **Step 3: Implement the detail route and dashboard**

Build:
- Astro dynamic route with `getStaticPaths()` for all seven heroes
- hero validation and 404 for invalid slug
- preloaded payload maps for hero overview, hero daily, item winrate, and item uplift
- React dashboard with:
  - single-hero chart
  - summary cards
  - `Win rate / Uplift` tabbed card section
  - `w/t/m/lang` URL sync

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- test/hero-detail-dashboard.test.tsx`
Expected: PASS

### Task 3: Verify integration and route build

**Files:**
- Modify as needed based on failures from Task 2
- Test: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/daily-hero-dashboard.test.tsx`
- Test: `/Users/yxinyu/codes/bpp_codes/bazaarplusplus-stats/test/hero-detail-dashboard.test.tsx`

- [ ] **Step 1: Run targeted integration tests**

Run: `npm test -- test/daily-hero-dashboard.test.tsx test/hero-detail-dashboard.test.tsx`
Expected: PASS

- [ ] **Step 2: Run full test suite**

Run: `npm test`
Expected: PASS

- [ ] **Step 3: Run production build**

Run: `npm run build`
Expected: PASS, including the new `/heroes/<hero>` static routes.

- [ ] **Step 4: Review for scope discipline**

Confirm that this change does not add archetype/build sections or extra hero-search behavior.
