# Savings Net Worth: redesign plan v2, "Quiet Ledger"

Every number below comes from the repo (`src/shared/marketCatalog.ts`, `valuationFormulas.ts`) or from Jakub's screenshots of 12 Oct 2026. Nothing is invented. The one exception: the 17 non-September bars in the cashflow mockup were traced by eye from the current screenshot (about ±2k), and only September 2026 is exact.
Mockups: `/workspace/mockups/*.png` at 1440×900 @2x, plus `savings-1280.png`. The HTML sources sit next to them and share `base.css` (the tokens below, verbatim).

---

## 1. The data the design must handle honestly

| Fact | Value | Design consequence |
|---|---|---|
| Net worth | 3 365 429,22 zł, 18 assets, **0 liabilities** | There is no debt UI. Liabilities collapse to a one-line "No liabilities · Add loan" row |
| History | **2 snapshots** (11 and 12 Oct 2026), change 0,0 % | No trend chart until there are 7 snapshots. Show a 7-slot progress timeline instead, and disable the 1M/YTD/1Y period buttons until there is data for them |
| Fort Wola 12B/23 | 1 492 444,57 zł = 67 m² × 19 448 zł/m² (1 303 016) + parking 189 428,57; cost 590 900 (2016) → **+152,6 %** | "Since purchase" is the honest long-range view while snapshot history is short |
| Działka Nefrytowa | 1 017 m² × 321 zł/m² = 326 457,00; paid ≈ 280 000 → +16,6 %; asking price, not a transaction; purchase year not recorded | Valuation "receipt", a price-range scale and a sensitivity table, plus a stale/"not recorded" warning |
| ING Otwarte Konto Oszczędnościowe | 428 490,20 | Manual valuation, no cost basis → show "—" |
| The other 15 holdings | 1 118 037,45 combined (33,2 %) | Collapsed "+15" row in the mockup (the real app lists them) |
| Cashflow Sep 2026 | income 119 413,62 · expenses 48 018,44 (Opłaty 47 687,15 + Abonamenty 331,29) · kept 71 395,18 = 59,8 % | Neutral expense colors. Use a flow split (kept 59,8 % / Opłaty 39,9 % / Abonamenty 0,3 %) |
| Cashflow history | Apr 2025 – Sep 2026 = 18 months; **Jun 2026 has no expense entries** | Hatched "No expenses entered" marker instead of a silent 0 |

## 2. What the current screenshots get wrong, and the fix

| # | Issue | Cause in code | Fix |
|---|---|---|---|
| 1 | Y-axis repeats "3.4M" five times | `NetWorthTrendChart` YAxis `domain={['dataMin','dataMax']}` + `formatPlnCompact` rounding to 0.1M | Fewer than 7 points: no chart at all (`HistoryProgress`). Otherwise use domain `[min − 8 % range, max + 8 % range]`, 4 "nice" ticks (1-2-5 steps), and a formatter with enough decimals to keep labels unique (`3,36 mln`) |
| 2 | Straight 2-point line looks like growth | Plot of 2 near-equal points | `HistoryProgress` with 2/7 dots and "trend unlocks 17 Oct" |
| 3 | Assets are a cramped scroll box, about 3 visible of 18 | `HoldingsPanel` `min-h-0 flex-1 overflow-y-auto` inside a fixed-height card | A full-height table in the page flow, 44 px rows (36 compact). The page scrolls, the card does not |
| 4 | Empty Liabilities card wastes about 120 px | `LiabilitiesPanel` always renders a full card | With 0 liabilities, render a 56 px row: "No liabilities · Debt-free · 0 zł · Add loan" |
| 5 | 13 month tabs overflow the header | `ContextStrip` renders every period as a pill (`App.tsx` l.294/362) | Month stepper `‹ September 2026 ›` (⌘← / ⌘→) plus an 18-bar mini strip that you click to jump |
| 6 | Opłaty bar in red reads as "bad" | `OverviewPage` `DensePanel tone="error"` → `WeightBar` red | Remove `tone="error"`. Expenses use the neutral `--cat-5` and income uses `--accent`. Red is only for losses and negatives |
| 7 | Jun bar empty with no explanation | `CashflowChart` draws 0 | Add `missing: true` → a hatched 24 px stub plus the label "No expenses entered" |
| 8 | Settings cards have dead space (a 3-column masonry) | `SettingsPage` card grid | Two-pane macOS-style list: section nav 184 px plus 760 px rows (label + description left, control right) |
| 9 | Onboarding over a blurred dashboard | `OnboardingWizard` `fixed inset-0 bg-paper/95 backdrop-blur-md` | Full-window layout, no app behind it: 360 px step rail + centred 560 px question |
| 10 | Hero has no context ("+0.0%", "Best month: Oct 2026" from 1 day of data) | `SavingsDashboard` `bestWorstMonths` on 2 points | Hide "best month" until 2 or more months exist. Show facts that are true: 18 assets · 0 liabilities · debt 0 % · tracked since 11 Oct 2026 |

## 3. Tokens (`globals.css`, replacing "Ledger Glass")

### 3.1 Color (OKLCH is the source; hex is for reference)

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | oklch(0.165 0.005 255) #0D0E10 | oklch(0.982 0.002 255) #F8F9FA | window |
| `--rail` | oklch(0.145 0.005 255) #0A0B0D | oklch(0.962 0.003 255) #F1F2F4 | sidebar (dimmer than content, like Linear) |
| `--surface-1` | oklch(0.205 0.006 255) #15171A | oklch(1 0 0) #FFFFFF | cards |
| `--surface-2` | oklch(0.245 0.007 255) #1E2124 | oklch(0.965 0.003 255) #F2F3F5 | hover, selected nav, segment bg |
| `--surface-3` | oklch(0.29 0.008 255) #292C2F | oklch(0.93 0.005 255) #E6E8EB | bar tracks |
| `--line` | oklch(1 0 0 / .08) | oklch(0.21 0.01 255 / .09) | dividers, card borders |
| `--line-strong` | oklch(1 0 0 / .14) | oklch(0.21 0.01 255 / .16) | inputs, buttons |
| `--ink` | oklch(0.95 0.003 255) #EDEEF0 | oklch(0.21 0.01 255) #15191D | primary text |
| `--ink-2` | oklch(0.76 0.01 255) #ADB1B7 | oklch(0.44 0.012 255) #4E5359 | secondary |
| `--ink-3` | oklch(0.58 0.012 255) #767B81 | oklch(0.60 0.012 255) #7B8187 | labels, decimals, axis |
| `--accent` | oklch(0.74 0.12 250) #6DB0F4 | oklch(0.52 0.15 255) #1F68BC | actions, selection, income |
| `--accent-subtle` | accent / .14 | accent / .10 | selected rows, chips |
| `--gain` | oklch(0.78 0.15 152) #62D286 | oklch(0.56 0.14 152) #168B49 | positive deltas only |
| `--loss` | oklch(0.70 0.16 25) #F2716A | oklch(0.56 0.18 27) #C83A35 | negative deltas, destructive actions |
| `--warn` | oklch(0.82 0.13 80) #F0BA59 | oklch(0.64 0.13 70) #BE7C1C | stale, asking-price, not-recorded |
| `--cat-1..5` | accent · oklch(.74 .10 195) #50BFBE · oklch(.72 .12 300) #B093E5 · oklch(.80 .12 75) #EBB25F · oklch(.62 .012 255) #81878D | light: accent · #008C8D · #7F5BB6 · #CB882E · #8D939A | composition and categories (cat-5 = "other" and expenses) |

Rules:
- Green and red are never decoration.
- The accent is not green, so "selected" can never be read as "gain".
- In the light theme, card borders and `0 1px 2px` shadows carry depth. In the dark theme, surface steps do.
- Vibrancy/glass only on `--rail` (macOS). Content cards are opaque, which drops `.surface-glass` from cards.

Accent presets (`ACCENT_PRESETS`):
- Blue oklch(.74 .12 250)
- Teal oklch(.74 .10 195)
- Violet oklch(.72 .12 300)
- Amber oklch(.80 .12 75)
- Graphite oklch(.70 .02 255)

Derive `-subtle` and `-hover` with `color-mix(in oklch, var(--accent) X%, transparent)`. That replaces `hexToRgb`/`rgbToHex` in `appPreferences.ts`.

### 3.2 Type (Geist via `geist` npm package, bundled locally; no CDN in Electron)

| Role | Size / line-height / weight | Tracking | Notes |
|---|---|---|---|
| Hero money | 56/60/500 (≥1360 px) · 48/52 (<1360) | −0.035em | Geist `tnum`; decimals and "zł" in `--ink-3`; "zł" at 50 % size, 10 px gap; groups split with U+2009 thin space |
| Detail money | 40/44/500 | −0.03em | holding page |
| KPI money | 22/28/500 | −0.02em | cashflow tiles |
| Page title (bar) | 15/20/600 | −0.01em | |
| Detail title | 24/32/600 | −0.02em | |
| Onboarding title | 28/36/600 | −0.025em | |
| Card title | 13/20/600 | 0 | |
| Body / table | 13/20/450 | −0.005em | numbers `tnum`, right-aligned, U+202F narrow no-break space for thousands, comma for decimals (`pl-PL`) in both languages |
| Label | 12/16/500 `--ink-3` | 0 | |
| Micro / th | 11/16/500 uppercase | +0.04em | |
| kbd / paths | Geist Mono 11–12/16/450 | 0 | |

Font packs: **Quiet** (Geist, default), **Editorial** (Instrument Serif titles + Geist), **Classic** (Plus Jakarta + Fraunces, the current look), **System** (SF Pro). The "Night/Modern" packs are removed.

### 3.3 Spacing, radius, motion
- Spacing scale: 4 · 8 · 12 · 16 · 24 · 32 · 40 · 48. Card padding 14/16/16. Gap between cards 16. Page padding 24/32.
- Radius: cards 10, buttons and inputs 6, segment 7/5, chips 6, pills 12.
- Controls: button 28 h; segment item 22 h; row 44 (36 compact); nav item 28; title bar 52 (drag region; traffic lights at x=20).
- Motion: 120 ms ease-out for hover and selection; 200 ms for page `FadeUp` with a 4 px offset (was larger); number changes via `@number-flow/react` at 400 ms. All of it is disabled under `prefers-reduced-motion` (already in the CSS).

### 3.4 Grid
| | 1440 | 1280 |
|---|---|---|
| Rail | 232 | 208 |
| Page padding | 32 | 24 |
| Content width | 1144 | 1024 |
| Two-column pages | `minmax(0,1fr) 360px`, gap 16 → main 768 | `minmax(0,1fr) 320px` → main 688 |
| Holdings columns | Holding · Value 120 · Share 136 · Since purchase 112 · Valued 72 | the Valued column is hidden; share bar 48 |
| Settings | nav 184 + gap 40 + rows max 760 | same (rows shrink) |
| Onboarding | side 360 + question 560 centred | same |

## 4. Screens

### 4.1 Net worth (`savings.png`, `savings-light.png`, `savings-1280.png`)
1. **Bar (52):**
   - Left: "Net worth" plus a freshness chip ("Snapshot · just now", green dot; amber after 24 h, labelled "Snapshot · 3 d ago").
   - Right: privacy eye (ghost), Refresh prices (secondary), Add holding (primary).
2. **Hero:**
   - Label "Net worth · 12 Oct 2026 · PLN", then the hero money.
   - Facts row 13/20 `--ink-2` with values in `--ink` 500.
   - Period segment `1M YTD 1Y All` on the right. A period is disabled when it has fewer than 2 snapshots (shown at 40 % opacity, with the tooltip "Not enough history yet").
3. **History card:**
   - **Fewer than 7 snapshots:** `HistoryProgress`, a 7-column grid with dots (filled = taken, accent with a 4 px halo) on a dashed baseline. Each column has a date and, for filled dots, the value. The title chip reads "2 of 7 snapshots" and the right-hand note reads "Trend line appears at 7 daily snapshots · 5 to go".
   - **7 or more:** an area chart, 220 h (spec in §5).
4. **Holdings table** (left), with segment sort Value/Gain/Name.
   - Each row: 28 px icon tile (`--surface-2`, 7 radius), name 13/18/500, subline "Class · source" 12/16 `--ink-3`.
   - Value is tabular. Share is a 72×4 accent bar plus %. Since purchase is a gain %, or "—" when there is no cost basis. Valued is "1 Oct", "manual", or an amber dot when older than 30 days.
   - Hover: row `--surface-2`, cursor pointer, Enter opens the holding.
   - Loading: 4 skeleton rows at 44 h. Empty: "No holdings yet" plus Add holding / Load from catalog.
5. **Right column:**
   - **Composition:** a 10 px stacked bar with 2 px gaps (top 3 holdings plus "15 more" in cat-5), and a legend with %.
   - **Since purchase:** each holding with a cost basis gets two lines (gain zł and gain %, then cost → worth) and a 6 px bar (cost grey + gain green).
   - **Liabilities:** a single row when there are 0; when there are 1 or more, a card listing them, each nested under its linked asset.

### 4.2 Holding detail (`holding.png`, Działka Nefrytowa)
1. **Bar:** the breadcrumb "Net worth / Działka Nefrytowa, Szczecin" replaces "Holding" and "← Holdings". Edit is secondary; Delete is a ghost button in `--loss`.
2. **Header:** "Land · Szczecin-Skolwin · 1 017 m² · building plot for a house", the title, money at 40 px, and chips: gain vs paid, "Valued 1 Oct 2026" (with freshness dot), and "Asking price, not transaction" (warn).
3. **How this value is calculated:**
   - Receipt grid `Area × Catalog price = Worth`: labels 12 `--ink-3`, values 15/24, result 600.
   - Source sentence from `NEFRYTOWA_CATALOG.source`.
   - A **zł/m² scale** from 250 to 360: RCN transactions 267, "you paid ≈ 275", 299 (870 m², reserved), **321 used** (accent pin), 346 (723 m²), 355 (Szczecin asks). The 299–346 asking range is shaded in warn at 55 %.
4. **What if the price is different?** At 267 → 271 539,00 (−8 461,00 · −3,0 %). At **321 → 326 457,00 (+16,6 %)** in the highlighted row. At 346 → 351 882,00 (+25,7 %).
5. **Right column:**
   - Valuation: method, valued on, status, source links.
   - Purchase: paid ≈, per m² 275,32, gain, and purchase year as a warn chip "Not recorded" with the hint "Add the purchase year to show annualised return".
   - Share ring: 9,7 % (3rd of 18).
6. `SourceInfoBanner` (the dismissible info strip) is removed. Its content now lives in the Valuation card, so it can't be dismissed and forgotten.

Fort Wola gets the same template. Its receipt reads `67 m² × 19 448 zł/m² = 1 303 016` plus `parking 75 000 × 19 448/7 700 = 189 428,57`, and its scale shows the RCN median.

### 4.3 Cashflow (`cashflow.png`)
1. **Bar:**
   - Title, then the month stepper (28 × 28 ghost chevrons, a 128 px label at 13/20/600; the next-month chevron is at 60 % opacity when the month is in the future), then an 18×4 px income mini-strip (current month in accent).
   - Right: the Overview/Expenses/Income/Loans segment (it moves out of the second header row), Add income, and Add expense (primary).
2. **KPI band:** one card with 4 cells divided by `--line`. Income · Expenses · Kept (+ in gain) · Kept of income %.
3. **Income vs expenses (18 mo):**
   - Paired bars, 13 px each with a 2 px gap. Income in accent, expenses in cat-5. Non-selected months at 38 % opacity. The selected month gets a `--surface-2` column background, and its label is 600 in `--ink`.
   - Y ticks 0/50k/100k/150k/200k on the right, 11 px `--ink-3`, horizontal grid in `--line`. Year labels under the first month of each year.
   - A missing month gets a hatch plus a dashed leader to "No expenses entered".
   - Clicking a bar selects that month.
4. **Where September's income went:** an income block on the left, split proportionally on the right into Kept (gain-subtle) 59,8 %, Opłaty 39,9 % and Abonamenty 0,3 % (minimum height 24). This is a simple CSS flex, so no Sankey library is needed. It upgrades to a Recharts `Sankey` once there are 4 or more categories.
5. **Lists row** (1fr 1fr 280):
   - Expenses and Income: name + amount + % on one line, a 4 px bar below. Expenses are neutral, income is accent.
   - Loans: one line, "No instalments this month · Add loan".
6. **Subtabs:** they reuse the same bar. Expenses/Income are tables (date, name, category chip, amount) with inline add at the top (Enter to save). Loans shows amortisation bars once there is a loan.

### 4.4 Settings (`settings.png`)
- Section nav: General · Appearance · Modules · Data & privacy · Setup guide. It scroll-spies a single page.
- Rows are 48 min-h with 8/16 padding: label 13/500 plus description 12 `--ink-3` on the left, control on the right.
- Controls: segments for language/theme/density, 20 px accent swatches (selection = 2 px ink outline with 2 px offset), a 4-up typeface grid that previews "3 365 429" in each face, 28×16 toggles, and pill tags for areas of interest.
- Data & privacy: DB path `~/Library/Application Support/savings-net-worth/networth.sqlite` (from `shared/dataDirs.ts`) with "Show in Finder", Hide amounts ⌘⇧H, and Hide on window blur.

### 4.5 Onboarding (`onboarding.png`)
- **Left rail (360):** app mark, the 4 steps (the existing i18n keys `onboarding.step1..4`) with a numbered vertical stepper, and a lock note at the bottom: "Everything stays on this Mac in networth.sqlite. No account and no cloud database."
- **Right:** "STEP 1 OF 4" micro label, 28/36 title, hint, and 3 option cards (36 px icon tile, title, one-line description, radio). Selected = accent border + 1 px ring + accent-subtle background.
- Footer: Skip setup (ghost), Back (disabled at 45 %), Continue ↵ (primary). Enter advances and Esc goes back.

## 5. Chart spec (`chartTheme.ts`)
- Delete `CHART_*` constants (the old forest/copper hex values are still exported). `chartTokens()` returns `{accent, gain, loss, grid, axis, cat:[5]}` read from CSS vars, memoized on `resolved` theme.
- **Net worth area (7 or more points):**
  - `type="monotone"`, stroke 2 accent, round caps. Gradient fill accent 22 % → 0 %.
  - A dashed `ReferenceLine` at the period-start value. The area above it is tinted gain 8 % and below it loss 8 %, using two clipPaths.
  - Y: domain padded ±8 % of range, 4 nice ticks, labels on the right at 11/16 `--ink-3`, no axis line, `width={56}`.
  - X: 4–6 date ticks (`d MMM`), `minTickGap={48}`.
  - Tooltip: `--surface-2`, 8 radius, 12/16 text: date, value, Δ vs start (zł + %).
  - The last point gets a 4 px dot with a 4 px halo.
- **Cashflow bars:** described in §4.3. `barCategoryGap="22%"`, `barGap={2}`, `radius={[2,2,0,0]}`.
- **Number format:** `formatPlnCompact` becomes `Intl.NumberFormat(localeTag,{notation:'compact',maximumFractionDigits:2})`, giving "3,37 mln" in PL and "3.37M" in EN. Axis ticks drop decimals once their labels are unique.

## 6. Privacy and desktop
- `privacy` is added to `AppPreferences`. `MoneyAmount` wraps values in `.money` → `filter: blur(8px)` and `aria-hidden`; hold ⌥ to peek. Percentages stay visible. Charts hide Y tick labels.
- Toggle with ⌘⇧H (a menu accelerator in `main/index.ts`) or the eye icon in the bar. Optional auto-hide on `blur`.
- Command palette with `cmdk` (⌘K): jump to a holding or month, Add holding/expense/income, Refresh prices, Toggle privacy, Switch theme.
- Shortcuts: ⌘1/⌘2 for modules, ⌘, for Settings, ⌘←/→ to change month, J/K + Enter in tables.
- Electron: keep `titleBarStyle:'hiddenInset'`. Use vibrancy `'sidebar'` (instead of `'under-window'`) applied only behind the rail, with an opaque content area. Liquid Glass (macOS 26) via the proposed `setGlassEffect` API ([electron#50415](https://github.com/electron/electron/pull/50415)) is a later step and stays off by default.

## 7. File-by-file diff

| File | Change |
|---|---|
| `assets/globals.css` | Replace both theme blocks with §3.1 tokens. Delete `--color-moss/sage/copper/pine/brass/forest*`, `--banner-*`, `--canvas-*`, `--glass-*`. The daisyUI bridge maps primary to accent, success to gain, error to loss, warning to warn, and base-100/200/300 to surface-1/2/3. `@theme` gets `--font-sans: Geist` and `--text-hero`. Remove `.surface-glass` from cards and keep it only for the rail. Add `.money` / `.privacy .money` |
| `lib/appPreferences.ts` | New `ACCENT_PRESETS` (5 OKLCH values), `FONT_PACKS` → quiet/editorial/classic/system, plus `privacy:boolean` and `density:'comfortable'|'compact'`. Migrate the old ids `night/modern` → `quiet` |
| `lib/theme.tsx` | Write `--accent` only, and derive the rest via `color-mix` in CSS. Set `data-density` |
| `shell/MoneyAmount.tsx` | Props `size: 'hero'|'detail'|'kpi'|'body'`. Splits integer, decimals and currency. Decimals and currency in `--ink-3`. U+202F grouping. NumberFlow for `hero`/`kpi`. Privacy blur |
| `shell/DeltaChip.tsx`, `MetricChip.tsx` | Tones: gain/loss/neutral only. A 0 delta renders neutral "0,0 %", never green |
| `shell/FreshnessChip.tsx` | Dot + text. Green when under 24 h, amber when under 30 d, then amber chip "Stale" |
| `shell/WeightBar.tsx` | `tone` becomes `'accent'|'neutral'|'gain'`, and the `error` tone is removed |
| `shell/ContextStrip.tsx` | Savings: the period segment (1M/YTD/1Y/All, disabled without data). Cashflow: `MonthStepper` + `MonthStrip` (new, same folder). The 13-pill list is gone |
| `shell/AppRail.tsx` | 232/208 widths, `--rail` bg, ⌘K search button, nav with ⌘1/⌘2 hints, "Largest holdings" (top 3 by value) group. The YTD card is removed |
| new `shell/CommandPalette.tsx` | `cmdk` dialog via Radix Dialog |
| `savings/SavingsDashboard.tsx` | Layout per §4.1. Remove `bestWorstMonths` and `periodChange` from the hero unless there are 2 or more months of data |
| `savings/NetWorthHero.tsx` | Hero money + facts row + period segment |
| new `savings/HistoryProgress.tsx` | The fewer-than-7-snapshots state |
| `charts/NetWorthTrendChart.tsx` | Render only at 7 or more points. Padded domain, nice ticks, reference line, tooltip, right axis |
| `savings/HoldingsPanel.tsx` + `HoldingsList.tsx` | A `<table>` with the §4.1 columns. Remove `overflow-y-auto`/`flex-1`. Sort segment |
| `charts/AllocationChart.tsx` | Becomes a `CompositionBar` (stacked 10 px bar + legend). The pie/donut is removed |
| new `savings/SincePurchase.tsx` | Cost → worth bars for assets with a `cost_basis_minor` |
| `savings/LiabilitiesPanel.tsx` | With 0 items, the single row; otherwise a list grouped under linked assets |
| `savings/SavingsMetrics.tsx` | Removed (its facts move into the hero) |
| `AssetDetail.tsx` | Layout per §4.2: breadcrumb, header chips, `ValuationReceipt`, `PriceScale`, `Sensitivity`, right-column cards |
| `SourceInfoBanner.tsx` | Removed; its content goes into the Valuation card |
| `shared/marketCatalog.ts` | Add `comparables: {areaM2, plnPerM2, note, source}[]` and `transactionAvgPlnPerM2` so `PriceScale` and `Sensitivity` are data-driven (the values already exist in the comments) |
| `LotsSection.tsx` | Becomes a "Purchases" table in the same 44 px row style |
| `installments/InstallmentsLayout.tsx` + `InstallmentsSubNav.tsx` | The subnav moves into the bar as a segment. Month handling moves to `MonthStepper` (`useMonthParam` is kept) |
| `installments/OverviewPage.tsx` | KPI band, `CashflowChart`, `IncomeSplit` (new), and the lists row. `tone="error"` → `"neutral"` |
| `charts/CashflowChart.tsx` | §4.3 spec. `missing` months get a hatch. Click selects the month. Colors come from `chartTokens()` |
| `SettingsPage.tsx` + `PrefsBar.tsx` | Two-pane rows per §4.4. `PrefsBar` (theme/language in the header) is removed, since those live in Settings and ⌘K |
| `OnboardingWizard.tsx` | Full window per §4.5, with the overlay and `backdrop-blur-md` removed. Same 4 steps and i18n keys |
| `lib/i18n/messages.ts` | New keys: `history.progress`, `history.unlocks`, `liabilities.none`, `cashflow.noExpensesEntered`, `privacy.*`, `palette.*` (EN + PL) |
| `main/index.ts` | Vibrancy `'sidebar'`, menu accelerators (⌘⇧H, ⌘K, ⌘1/2), `setGlassEffect` behind a check |
| `package.json` | Add `geist`, `cmdk`, `@number-flow/react` |

**Order of work** (each step ships alone):
1. Tokens + fonts + `MoneyAmount`
2. Fixes 1–4 and 10 on Savings
3. Cashflow fixes 5–7
4. Holding detail
5. Settings + onboarding
6. ⌘K, privacy, menu, vibrancy

## 8. References (images in `/workspace/refs/`, sources in `refs/sources.tsv`)

| App | What to borrow | Image |
|---|---|---|
| Wealthfolio (local-first, React + Tailwind 4 + shadcn, the same stack) | Monospace-feeling numbers, a period segment under the chart, a category breakdown with a stacked bar plus a %/value/Δ table, a privacy eye in the header | `wealthfolio-net-worth.png`, `-investments.png`, `-spending.png` |
| Copilot Money (Mac) | Dimmer sidebar, dense dark cards, "transactions to review" lists | `copilot-mac-dashboard.png`, `copilot-ipad-dashboard.png`, `copilot-hero-og.png` |
| Kubera | Balance-sheet tiles (Net worth / Assets / Debts), plain big numbers, no chartjunk | `kubera-hero.png` |
| Monarch | Account rows with "1 min ago" freshness, card-on-green marketing style (not for us) | `monarch-tab-1..3.png` |
| Lunch Money | A stacked "budget" bar + category rows with thin bars | `lunchmoney-og.png` |
| Actual Budget | Desktop-dense dark tables, keyboard-first | `actual-budget-dark.webp`, `actual-transactions.webp` |
| Finary | Dark "card stack" brand. Secret mode and a treemap ([product update](https://finary.com/en/product-updates/the-web-is-getting-a-makeover)) | `finary-sharing.png` |
| Origin | A minimal "Cash flow 88 % · 2 actions" progress tile | `origin-2.png` |
| Ghostfolio | No product screenshot could be retrieved (the site only exposes a non-UI cover image) | none |

Written sources from v1 still apply:
- [Linear calmer UI, Mar 2026](https://linear.app/now/behind-the-latest-design-refresh)
- [WANDR fintech trends 2026](https://www.wandr.studio/blog/fintech-mobile-app-design-trends)
- [Appthetics budgeting UX](https://www.appthetics.com/blog/budgeting-apps-ux-patterns)
- [Monarch Sankey/treemap update](https://www.monarch.com/blog/august-product-update)

**X:** `search_posts_all` returned HTTP 429 (shared rate limit) on all 5 attempts between 14:36 and 14:40 Warsaw time, so this plan has no X sources.
