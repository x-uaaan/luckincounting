# App Flow — Combined Reference & Working Notes

> **Purpose:** Single source of truth for the app's structure, routes, and data model. Combines `APP_ARCHITECTURE.md` (full reference, §B below) with the working summary, status tracker, and new feature specs (§A). Update this file whenever routes, data model, or major components change.

---

# §A. Working Notes (current understanding + new features)

## A.1 Tech stack (current scaffold)

- Next.js 14 (App Router) + TypeScript
- Tailwind CSS
- Zustand for stage-input state
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`) for DB + Auth
- `xlsx` (SheetJS) for `.xlsx` export
- Hosting: Vercel (deploy later)

## A.2 Structure

```
Next.js app (Vercel)
├── Counting flow (user)              — src/app/{page,count/[date]/*}
│   /                  → date selector, "Start counting"
│   /count/[date]/back     → Stage 1 input
│   /count/[date]/front    → Stage 2 input
│   /count/[date]/expired  → Stage 3 input (Loss + Inventory + whipping cream calc, A.4)
│   /count/[date]/closing  → Stage 4 input (incl. row×line+loose entry, A.5)
│   /count/[date]/result   → Stage 5, Sheet2 read-only + Submit
│
├── Admin panel                       — src/app/admin/*
│   /admin            → dashboard
│   /admin/items      → CRUD item list
│   /admin/records    → historical records, re-open
│   /admin/approvals  → pending approvals queue
│   /admin/settings   → loss rates, bag sizes, Drive folder
│
└── Shared core
    ├── src/store/useCountingStore.ts  — Zustand store, stage inputs, autosave (60s)
    ├── src/lib/calculations.ts        — Back/Front/Expired/Closing/Sheet2 formulas
    ├── src/lib/types.ts               — Item, DailyRecord, stage entry types
    ├── src/lib/xlsxExport.ts          — generates Sheet2-only .xlsx (YYMMDD.xlsx)
    ├── src/lib/supabase/{client,server}.ts
    ├── src/data/seedItems.ts          — seed item list
    └── src/components/{StageTabs,StageHooks}

External:
    Supabase   — Postgres DB + Auth (admin/user roles)
    Google Drive — receives YYMMDD.xlsx on admin approval
```

## A.3 Status / progress

| Area | Status |
|------|--------|
| Project scaffold (Next.js, Tailwind, Supabase, xlsx, Zustand) | done |
| Item data model (`types.ts`) | done — matches §B.3, needs A.4/A.5 extensions |
| Seed items (`seedItems.ts`) | done (375 lines) |
| Calculations (`calculations.ts`) | scaffolded (155 lines) — needs verification against countingflow.md cross-references (Cream/Milk linkage, Pandan warning), plus new whipping cream + row×line formulas |
| Store (`useCountingStore.ts`) | scaffolded (153 lines) |
| Stage page UIs (back/front/expired/closing/result) | scaffolded, need full input tables per §B.6, plus whipping cream calculator UI (expired) and row×line+loose UI (closing) |
| Admin pages | scaffolded, need CRUD logic |
| Supabase schema (`supabase/schema.sql`) | exists, needs review |
| Google Drive integration | not started |
| Deployment to Vercel | not started |

## A.4 Data model addition — Whipping Cream variant calculator (NEW, REVISED)

Extends `MaterialLossEntry` for items with `loss_formula` involving whipping cream variants. See countingflow.md §A.2 for formulas.

```ts
interface WhippingCreamVariant {
  id: string;
  name: string;                  // "Vanilla", "Sakura", or custom
  pump_count: number;            // preset, e.g. 4 (Vanilla), 10 (Sakura)
  ml_per_pump: number;           // preset, default 5
  empty_canister_weight: number; // preset tare weight (g) of this canister type
  total_weight: number | null;   // user keys in the gross weight (canister + syrup + cream)
}

// On MaterialLossEntry (or a new sibling map keyed by item_id):
interface WhippingCreamCalc {
  variants: WhippingCreamVariant[]; // up to 5
  total_whipping_cream: number;     // computed: sum of cream_weight (cream-only) across variants
}
```

- Defaults seeded for "Vanilla whipping cream" (4 pumps, 150 g tare) and "Sakura whipping cream" (10 pumps, 150 g tare); user can add up to 3 more (max 5 total), each representing one canister.
- `total_weight` is the only field the user enters per variant — pumps, ml/pump, and tare weight are preset.
- Computed per variant: `syrup_weight = pump_count * ml_per_pump`, `cream_weight = total_weight - syrup_weight - empty_canister_weight`.
- `total_whipping_cream` (sum of `cream_weight` across all canisters/variants — cream only) feeds the Cream Loss `result` as the `total` input.
- UI: on `/count/[date]/expired`, the Cream/Whipping Cream card has an "Add canister" control (disabled at 5); each canister row shows name + total weight input + computed cream weight, with a running cream-only sum displayed in the card header.

## A.5 Data model addition — Flexible loose counting, row × line + loose (NEW)

Extends loose-count inputs for items in **Raw Material, Syrup, and Frozen** categories. See countingflow.md §A.3 for formulas.

```ts
interface ClosingEntry {
  loose: number | null;        // existing: direct value (back-compat)
  loose_rows: number | null;   // NEW: optional grid row count
  loose_lines: number | null;  // NEW: optional grid line/column count
  loose_extra: number | null;  // NEW: extra loose pieces outside the grid
  loose_sum: number | null;    // computed
  box_count: number | null;
  box_sum: number | null;
  total: number | null;
}
```

- Computed: `loose = (loose_rows ?? 0) * (loose_lines ?? 0) + (loose_extra ?? 0)`, then `loose_sum` derives from `loose` as before (per item type).
- If `loose_rows`/`loose_lines`/`loose_extra` are all null, fall back to the existing single `loose` field (back-compat with simple entry).
- Applies only to items whose `category` is Raw Material, Syrup, or Frozen; other categories keep the simple single-value `loose` field.
- UI: on `/count/[date]/closing`, items in these categories show `rows × lines + loose` inputs with a live computed total instead of the single free-entry field.

## A.6 Key cross-references / gotchas

- **Cream**: Loss "subtract" result (canister ml, e.g. 694) is reused as the canister value in Cream's Inventory formula (3b), and now also as the default `canister_ml` in each whipping cream variant (A.4). Keep this link explicit in the data model — don't hardcode 694 in multiple places.
- **Milk**: Loss "add" result depends on Milk-Cheese's result being computed first. Order of evaluation matters.
- **Pandan**: Loss formula = "none" → must trigger a hard warning if container measurement is blank.
- **Sheet2** is never directly editable — always derived from Back + Front + Closing.

## A.6.1 Stage page layout — all items on one page (NEW, REVISED)

Each counting stage page (`/count/[date]/back`, `/front`, `/expired`, `/closing`) displays **all items for that stage in a single scrollable page**, not one item per page/screen. This matches the original B.6 mobile card layout — confirmed as the intended design (no per-item navigation/pagination).

- Items render as a **compact** stacked list of cards (grouped by category with collapsible headers per B.6). Each card should fit in just a few lines: a header row (item name + category/unit, with the item's computed total right-aligned in the same row) followed by one or two compact rows of small input/auto fields. Avoid the earlier large per-field block layout — it made each card too tall.
- Every computed value (bag sum, box sum, loose total, whipping cream cream-weight/total, item total) updates **live** as the user types — no "calculate" button.
- A pinned **summary bar** sits near the top of the page for page-wide live totals, but only when a single summed unit makes sense across items:
  - **Closing**: no stage-wide summary total (items have mixed units — pcs, kg, etc. — so a single "stage total" isn't meaningful). A simple "Items counted X / Y" progress row may still appear.
  - **Material Expired**: shows "Total cream (whipping)" as the cream-only sum across whipping cream canisters (A.4), since that's a single homogeneous unit feeding the Cream loss row.
- The whipping cream calculator (A.4) and row×line+loose grid (A.5) are inline within their item's card on the Material Expired / Closing pages respectively — not a separate page.

## A.6.2 Tab navigation, admin overlay, numeric input, autosave (NEW)

- **Tab bar**: the 5 stages — Back, Front, Material Exp, Closing, Final — render as a persistent top tab bar. Switching tabs is **client-side only** (no route change / page reload); each tab's input state is preserved when switching away and back. (Implementation note: still keep `/count/[date]/{back,front,expired,closing,result}` as deep-linkable routes, but within a stage the active tab can change via client state without a full navigation.)
- **Admin button**: pinned top-right of the tab bar on every page. Tapping it opens the Admin panel as an **overlay** (slide-in panel + backdrop) on top of the current tab — it does not navigate away or reload, so in-progress counting input is preserved underneath. Closing the overlay returns to the same tab/state.
- **Numeric keyboard**: every count/weight input uses `inputmode="numeric"` (whole counts: rows, lines, loose, box count, open bags) or `inputmode="decimal"` (weights in g/ml where fractional values are possible) so mobile devices show the number pad, never the full keyboard.
- **Autosave**: every input change is autosaved (debounced ~500ms), with a small "Saved" confirmation toast. This replaces/supplements the existing 60s interval autosave (A.2 store) — autosave should fire on both a debounce-after-edit AND the periodic interval.
- **Final result tab** (Stage 5 / Sheet2): read-only table of Item × Back × Front × Closing × Total, with a grand-total row and the "Submit for Approval" action. Matches B.6/B.7 — never directly editable, missing stages treated as 0.

## A.6.3 Minimal-chrome UI conventions (NEW)

- **No per-page titles**: stage panels no longer show a `1. Back` / `2. Front` style header — the active tab in the topbar is the only page identifier.
- **No date in UI**: the date is not displayed anywhere in the app UI; it exists only as the record's file/record name (e.g. the daily count record date), consistent with `/count/[date]/...` routing.
- **Sticky topbar**: the tab bar + Admin button form a fixed topbar above the scrollable content area, always visible while scrolling within a stage.
- **Minimize parentheses / explanatory text**: standing style rule — avoid parenthetical labels and asides (e.g. "(g)", "(auto)", "(computed = rows × lines + loose)", "(2 of 5 used)"). Use plain short labels (units folded into the value, e.g. "1020 g") and compact separators like "·" or "/" instead (e.g. "+ Add canister · 2/5"). Goal: fewer messages, less visual clutter.
- **No footer descriptions**: the long explanatory paragraphs previously shown at the bottom of each panel are removed. Formula/behavior documentation lives in countingflow.md/appflow.md, not in the UI.
- **Consistent units per item**: every item shows its unit (pcs or g) in its card subtitle (e.g. "Raw Material · pcs", "Frozen · g") so the unit stays visible and consistent across all 5 tabs for that item.
- **Always show full-pack reference**: each item card has a compact `.ref` line showing the admin-configured reference values used in its calc — "Per bag N · Per box N" for pcs items, "Full N · Container N" for weight items (whipping cream, oat milk).
- **Self-check line per card**: each card keeps one compact `.check` line showing the arithmetic that produces its total (e.g. "600 + 600 = 1200 pcs", "1020 − 20 − 150 = 850 g"), recalculated live — this replaced the earlier verbose multi-line check format.

## A.6.5 Step-by-step row calc (NEW)

- **Back/Front rows** now show the full per-row formula inline as `count × factor = sum`, e.g. "Bags [2] × /bag [300] = Sum [600]" and "Boxes [1] × /box [600] = Sum [600]". The `factor` is a read-only `.const` value sourced from the item's admin record (`per_bag_pcs` / `per_box_pcs`). The card-level `.ref` line was dropped from Back/Front since the factor is now visible directly in each row.
- **Closing rows**: the existing `rows × lines + loose = loose total` row is unchanged. The Ctn row now also shows `boxes × /box = sum` using a **separate** admin field `closing_per_box_pcs` (e.g. Coffee Beans 8, Matcha 10) — distinct from the Back/Front `per_box_pcs` (600/800), because Closing's storage-box pcs differs from the Back/Front delivery-box pcs.
- **Material Expired rows** already followed this pattern (`total − syrup − tare = cream`, `opened + add = loss total`) and are unchanged.
- Each card's bottom `.check` line remains as the final roll-up (`row sum + row sum = total`) on Back/Front/Material Expired/Closing. The Final tab does **not** show per-item or grand-total check lines — the result table itself is the final output, with no extra calc description below it.

## A.6.4 Admin overlay scope (REVISED)

- The Admin overlay does **not** show per-item details or calc factors (full pack/container weights, per-bag/per-box pcs, pump settings, etc.) — that editing surface was removed as out of scope for the mobile counting app's admin overlay.
- Admin overlay is a simple list of links: "Final results", "Records", "Approvals", "Settings". Item-level configuration (the data referenced by §A.6.5's `.const` factors) is managed elsewhere (e.g. a separate `/admin/items` desktop screen per §B routes), not in this overlay.

## A.7 Working agreement

- Before starting any task: review `countingflow.md` and `appflow.md` for current state and known gotchas.
- After making changes: update `countingflow.md` (calculation/formula changes) and/or `appflow.md` (structure/route/data-model/status changes) to reflect what changed.

---

# §B. Full reference — original APP_ARCHITECTURE.md

> **Last updated:** 2026-06-11
> **Companion to:** `countingflow.md`

## B.1 Modes

### Admin Mode
Full control over the app structure and data.

**Capabilities:**
- Add / edit / delete any **item** (row) within any section
- Add / edit / delete any **section** (e.g. Packaging, Syrup, Frozen)
- Edit metadata per item: per_bag_pcs, per_box_pcs, loss_rate, formula_type, bag_size_g
- **Cannot** rename or reorder the 5 counting stages (Back, Front, Material Expired, Closing, Sheet2)
- Delete workflow: click Delete → warning modal ("This will remove [item] from all stages") → confirmation modal ("Type item name to confirm") → delete executed
- View all daily records and re-open/re-approve any date
- Override any locked submission

**Access:** Password-protected. No public registration.

### User Mode (Daily Counting Staff)
Guided input flow through all 4 active counting stages. Read-only access to Sheet2.

**Capabilities:**
- Input counts for Back, Front, Material Expired (Loss + Inventory), Closing
- Weight inputs for powder/liquid items come from physical scale reading
- View auto-calculated results and Sheet2 preview
- Submit for final approval (triggers admin review)
- Cannot modify item list or stage structure

## B.2 Stage Architecture

```
Stage 1: Back         → input: open_bags, box_count
Stage 2: Front        → input: box_count
Stage 3: Material     → 
  3A: Loss            → input: container_volume (ml/g) for each thrown premix
  3B: Inventory       → input: remaining_weight per container (under_cabinet, non_coffee)
Stage 4: Closing      → input: loose_weight_or_count, box_count  [all fields nullable with warning]
Stage 5: Sheet2       → auto-calculated only, read-only display
```

Each stage shows:
- Progress indicator (stages 1–4 numbered, with completion checkmarks)
- Save draft capability (auto-saves every 60 seconds)
- "Stage Complete" button to lock stage and move forward
- Admin can unlock any stage post-submission

## B.3 Data Model

### Item
```
{
  id: uuid,
  name: string,               // e.g. "Matcha Flavoured (bag)"
  category: string,           // e.g. "Solid Beverage"
  appears_in: [Stage],        // which stages this item appears in
  per_bag_pcs: number | null, // null if "-" (whole unit)
  per_box_pcs: number | null,
  closing_per_box_pcs: number | null, // (NEW) Closing-stage storage-box pcs, may differ from per_box_pcs
  bag_size_g: number | null,  // for powder/liquid closing conversion
  loss_formula: "multiply" | "subtract" | "add" | "none",
  loss_rate: number | null,
  notes: string
}
```

### DailyRecord
```
{
  date: YYMMDD string,
  status: "draft" | "pending_approval" | "approved",
  back: { [item_id]: { open_bags, bag_sum, box_count, box_sum, total } },
  front: { [item_id]: { box_count, total } },
  material_loss: { [item_id]: { total_volume, rate_value, result } },
  material_inventory: { [item_id]: { under_cabinet, non_coffee, result } },
  closing: { [item_id]: { loose, loose_sum, box_count, box_sum, total } },
  sheet2: { [item_id]: { back, front, closing, total } },  // computed
  approved_by: string | null,
  approved_at: timestamp | null,
  drive_file_id: string | null
}
```

> See §A.4 and §A.5 for new fields (whipping cream variants, row×line+loose) layered on top of this model.

## B.4 Calculation Rules (Frontend Logic)

### Back
```
open_sum = open_bags × per_bag_pcs   (skip if per_bag_pcs is null → open_sum = open_bags)
box_sum  = box_count × per_box_pcs   (skip if per_box_pcs is null)
total    = (open_sum ?? 0) + (box_sum ?? 0)
```

### Front
```
total = box_count × per_box_pcs
```

### Material Expired — Loss
```
if loss_formula == "multiply":  result = total_volume × loss_rate
if loss_formula == "subtract":  result = total_volume − rate_value        // Cream
if loss_formula == "add":       result = total_volume + addend_item_result  // Milk
if loss_formula == "none":      result = null (warn: measurement not captured)
```

### Material Expired — Inventory
```
result = bag_size_g − (under_cabinet ?? 0) − (non_coffee ?? 0)
// For Cream: bag_size_g − canister_from_loss − non_coffee
```

### Closing
```
// Powder/liquid items (bag_size_g is set):
loose_sum = loose_g / bag_size_g

// Piece items (bag_size_g is null, per_bag_pcs is null):
loose_sum = loose_count

// Sleeve-count items (per_bag_pcs is set, e.g. Cream Charger):
loose_sum = loose_sleeves × per_bag_pcs

box_sum = box_count × per_box_pcs
total   = (loose_sum ?? 0) + (box_sum ?? 0)
```

### Sheet2 (Final)
```
total = (back ?? 0) + (front ?? 0) + (closing ?? 0)
```

## B.5 Validation Rules

| Rule | Trigger | Severity |
|------|---------|----------|
| Closing field left blank | Any Closing field = null on submit | Warning (not block) |
| Pandan container not measured | Loss result = null for Pandan | Warning (highlight red) |
| box_sum ≠ box × per_box_pcs | Auto-check on input | Warning inline |
| Sheet2 Total < 0 | Any total turns negative | Error (block submit) |
| Duplicate date record | Attempting to create record for existing date | Error (block) |
| Approve without all 4 stages completed | Admin approval attempted | Warning: "Stages X not completed" |
| Whipping cream variants > 5 | User attempts to add a 6th variant | Error (block, A.4) |

## B.6 UI Structure

### Header / Navigation
```
[Logo]  [Date: YYMMDD]  [Mode: User | Admin]  [Save Draft]  [↑ Submit for Approval]
```

### Stage Tabs (top bar)
```
[1. Back]  [2. Front]  [3. Material Expired]  [4. Closing]  [5. Final Result ↗]
```

### Input Table (per stage)
```
┌──────────────────┬──────────┬──────┬───────────┬──────────┬──────┬───────────┬────────┐
│ Item             │ /bag pcs │ Open │ Bag Sum   │ /box pcs │ Box  │ Box Sum   │ Total  │
├──────────────────┼──────────┼──────┼───────────┼──────────┼──────┼───────────┼────────┤
│ Matcha (bag)     │ 300      │ [__] │ auto      │ –        │ [__] │ auto      │ auto   │
└──────────────────┴──────────┴──────┴───────────┴──────────┴──────┴───────────┴────────┘
```

- Blue cells = user input
- Grey cells = auto-calculated (read-only)
- Red outline = validation warning
- Items grouped by category with collapsible headers

### Mobile View
- Single column layout
- Each item renders as a card:
  ```
  ┌─────────────────────────────┐
  │ Matcha (bag)                │
  │ Open bags: [____]           │
  │ Bag sum: 0 pcs (auto)       │
  │ Full boxes: [____]          │
  │ Box sum: 0 pcs (auto)       │
  │ Total: 0 pcs                │
  └─────────────────────────────┘
  ```

### Admin Panel (separate route `/admin`)
```
Sidebar:
  - Items Manager   → CRUD item list
  - Records         → view/re-open historical records
  - Approvals       → pending submissions queue
  - Settings        → loss rates, bag sizes, Google Drive folder

Main area: table/form view of selected section
```

## B.7 Google Drive Integration

### Trigger
Admin clicks **"Approve & Save to Drive"** button on the Sheet2 review screen.

### File Details
- **Format:** `.xlsx`
- **Filename:** `YYMMDD.xlsx` (e.g. `260611.xlsx`)
- **Destination:** Pre-configured Google Drive folder ID (set in Admin → Settings)
- **Content:** Sheet2 data only (Final Result), matching the original sheet format

### Flow
```
Admin reviews Sheet2
  → clicks "Approve & Save to Drive"
  → app generates YYMMDD.xlsx (Sheet2 only)
  → uploads to Google Drive via Drive API
  → stores file_id in DailyRecord.drive_file_id
  → DailyRecord.status = "approved"
  → confirmation toast: "Saved to Drive as 260611.xlsx ✓"
```

### Error Handling
- If Drive upload fails: show error, keep status as "pending_approval", allow retry
- If a file for that date already exists in Drive: prompt "Overwrite existing file?"

## B.8 Tech Stack Recommendation

| Layer | Choice | Reason |
|-------|--------|--------|
| Frontend | React (Next.js) | SSR for fast mobile load, easy file generation |
| Styling | Tailwind CSS | Responsive, mobile-first utility classes |
| State | Zustand or React Context | Simple local state for stage inputs |
| Backend / DB | Supabase (PostgreSQL) | Auth, real-time, easy JSON storage |
| File generation | `xlsx` (SheetJS) npm package | Generate .xlsx in browser |
| Drive integration | Google Drive API v3 | Upload + file management |
| Auth | Supabase Auth | Admin vs User role via JWT |
| Hosting | Vercel | Zero-config Next.js deployment |

## B.9 Page Routes

| Route | Access | Description |
|-------|--------|-------------|
| `/` | User + Admin | Date selector, start counting |
| `/count/[date]/back` | User + Admin | Stage 1 input |
| `/count/[date]/front` | User + Admin | Stage 2 input |
| `/count/[date]/expired` | User + Admin | Stage 3 input (Loss + Inventory) |
| `/count/[date]/closing` | User + Admin | Stage 4 input |
| `/count/[date]/result` | User + Admin | Stage 5 — Sheet2 read-only + Submit |
| `/admin` | Admin only | Dashboard |
| `/admin/items` | Admin only | CRUD items |
| `/admin/records` | Admin only | Historical records |
| `/admin/approvals` | Admin only | Pending approvals queue |
| `/admin/settings` | Admin only | Drive folder, loss rates |

## B.10 Change Log

| Date | Change | By |
|------|--------|----|
| 2026-06-11 | Initial architecture document | Claude |
| 2026-06-11 | Extracted into appflow.md working notes | Claude |
| 2026-06-12 | Combined APP_ARCHITECTURE.md into appflow.md; added §A.4 whipping cream variant calculator data model and §A.5 row×line+loose closing entry data model | Claude |
| 2026-06-12 | Refined §A.4: single user-keyed `canister_weight` per variant (no separate cream/canister fields); refined §A.5: row×line+loose scoped to Raw Material, Syrup, Frozen categories | Claude |
| 2026-06-12 | Created Figma mockups (file `BtIWGMkVlypQDRaTxPx9hs`) for Home, Closing (row×line+loose UI), and Material Expired (whipping cream canister calculator UI); screenshots saved as home.png/closing.png/expired.png in project root | Claude |
| 2026-06-12 | Added §A.6.1: stage pages show all items on one scrollable page (not one item per page), with live computed totals + running stage summary; updated Figma mockups accordingly | Claude |
| 2026-06-12 | Revised §A.4: whipping cream variant now stores `total_weight` (gross, user-entered) + preset `empty_canister_weight` (tare); cream-only weight computed as total − syrup − tare. Revised §A.6.1: compact one-row-per-item cards, removed Closing stage-wide total summary, kept cream-only summary on Material Expired. Figma update pending (rate limit reached) | Claude |
| 2026-06-12 | Figma MCP rate-limited; built `mockups/dark_theme.html` (dark appearance) as a local fallback mockup for Closing + Material Expired showing compact cards, corrected cream-only formula with worked examples (Vanilla 1020→850g, Sakura 1170→970g, total 1820g), and no Closing stage-total | Claude |
| 2026-06-12 | Dropped Figma entirely — HTML mockups are now the working reference. Added §A.6.2: tab bar (Back/Front/Material Exp/Closing/Final) with client-side switching, top-right Admin overlay (no reload), numeric-keyboard inputs, debounced autosave + toast. Expanded `mockups/dark_theme.html` into a single tabbed app covering all 5 stages incl. Final (Sheet2) result table; clarified "max 5" = 5 canisters total (2 presets + 3 addable) | Claude |
| 2026-06-12 | Added §A.6.3 (removed per-page titles, date moved to topbar, sticky topbar, "minimize parentheses" style rule, removed footer descriptions and inline check lines) and §A.6.4 (Admin "Items" section is now an editable list with Full pack g / Container g / per-bag/box pcs / pump fields). Updated `mockups/dark_theme.html` to match | Claude |
| 2026-06-12 | Refined §A.6.3: date removed entirely from UI (record date = file/record name only, not displayed); each item card now shows unit consistently in its subtitle (pcs/g), a `.ref` line with the full-pack/container reference values used in the calc, and one compact self-check arithmetic line. Back stage cards split into separate Loose and Ctn rows. Updated `mockups/dark_theme.html` to match | Claude |
| 2026-06-12 | Final (Sheet2) result table now shows a per-item self-check line (Back + Front + Closing = Total) plus a grand-total check line, matching the per-card check convention from §A.6.3 | Claude |
| 2026-06-12 | Added §A.6.5: Back/Front rows show inline `count × factor = sum` step-by-step calc; Closing Ctn row shows `boxes × /box = sum` using new `closing_per_box_pcs` field (added to Item data model, §A.4 admin item editor). Updated `mockups/dark_theme.html` and admin item list accordingly | Claude |
| 2026-06-12 | Reverted §A.6.4: removed the per-item editable list/calc factors from the Admin overlay (out of scope for this overlay); Admin is now just links (Final results, Records, Approvals, Settings). Removed the per-item/grand-total `.check` lines below the Final result table per §A.6.5 — Final tab shows the result table only, no calc description | Claude |
