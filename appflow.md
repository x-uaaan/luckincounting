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
├── Counting flow (user)              — src/app/{page,count/*}
│   /                  → date selector, "Start counting"
│   /count/back     → Stage 1 input
│   /count/front    → Stage 2 input
│   /count/expired  → Stage 3 input (Loss + Inventory + whipping cream calc, A.4)
│   /count/closing  → Stage 4 input (incl. row×line+loose entry, A.5)
│   /count/result   → Stage 5, Sheet2 read-only + Submit
│
├── Admin panel                       — src/app/admin/*
│   /admin            → dashboard
│   /admin/items      → item CRUD (name, unit, calc factors, appears_in, container)
│   /admin/containers → container CRUD (name, tare_g)
│   /admin/records    → historical records, re-open
│   /admin/approvals  → pending approvals queue
│   /admin/settings   → loss rates, bag sizes, Drive folder
│
└── Shared core
    ├── src/store/useCountingStore.ts  — Zustand store, stage inputs, autosave (60s)
    ├── src/store/useItemsStore.ts     — Zustand store, items/containers (§A.9)
    ├── src/lib/itemsRepo.ts           — Supabase-first data access for items/containers (§A.9)
    ├── src/lib/calculations.ts        — Back/Front/Expired/Closing/Sheet2 formulas
    ├── src/lib/types.ts               — Item, Container, DailyRecord, stage entry types
    ├── src/lib/xlsxExport.ts          — generates Sheet2-only .xlsx (YYMMDD.xlsx)
    ├── src/lib/supabase/{client,server}.ts
    ├── src/data/seedItems.ts          — seed item defaults (60 items, §A.8), consumed by useItemsStore.init()
    ├── src/data/containers.ts         — seed container-tare presets (§A.6), consumed by useItemsStore.init()
    └── src/components/{Topbar,StageHooks,AdminHeader,ItemsStoreInit}

External:
    Supabase   — Postgres DB + Auth (admin/user roles)
    Google Drive — receives YYMMDD.xlsx on admin approval
```

## A.3 Status / progress

| Area | Status |
|------|--------|
| Project scaffold (Next.js, Tailwind, Supabase, xlsx, Zustand) | done |
| Item data model (`types.ts`) | done — incl. `front_per_box_pcs`, `closing_per_box_pcs`, `inventory_bag_size_g`, `default_container_id`, `closing_inventory_formula`, `loose_grid`, `Container`, `WhippingCreamVariant`/`Calc` |
| Seed items (`seedItems.ts`) | done — full 60-item list per §A.8 (50 Back, 17 Front, 51 Closing/Sheet2, 15 Loss-only); now used only as `useItemsStore` seed defaults |
| Containers (`containers.ts`) | done — 7 presets per §A.6; now used only as `useItemsStore` seed defaults |
| Items/containers store (`useItemsStore.ts`, `itemsRepo.ts`) | done — Supabase-first, falls back to localStorage + seed defaults (§A.9) |
| Calculations (`calculations.ts`) | done — Back/Front/Loss (container-tare + whipping cream)/Closing (inventory formulas + row×line)/Sheet2 + `round1` |
| Store (`useCountingStore.ts`) | done — reads items/containers from `useItemsStore` (not static imports); `material_inventory` removed, Loss/Closing cross-references (Cream↔Whipping Cream, Milk↔Milk-Cheese) wired |
| Global dark theme (`globals.css` `.app-dark`) | done — applied site-wide on `<body>` (root layout), ported from `mockups/dark_theme.html` |
| Stage page UIs (back/front/expired/closing/result) | done — single-page card lists, whipping cream calculator, row×line+loose grid, container selects, Sheet2 table with `round1`; items/containers read from `useItemsStore` |
| Topbar + Admin overlay (`Topbar.tsx`) | done — sticky tabs + slide-in overlay (Final results/Items/Containers/Records/Approvals/Settings) |
| Admin pages | done — `/admin/items` and `/admin/containers` full CRUD (§A.9); records/approvals/settings still scaffolded, need CRUD logic |
| Supabase schema (`supabase/schema.sql`) | updated — `items`/`containers`/`daily_records` match current data model |
| Autosave toast / debounce (§A.6.2) | not started |
| Google Drive integration | not started |
| Deployment to Vercel | not started |

## A.4 Data model addition — Whipping Cream variant calculator (NEW, REVISED)

Lives on `ClosingEntry.whipping_cream` (the Whipping Cream item's Closing card), not Material Expired. See countingflow.md §A.2 for formulas.

```ts
interface WhippingCreamVariant {
  id: string;
  name: string;                  // "Vanilla", "Sakura", or custom
  flavour: "vanilla" | "sakura";  // selects the pump/canister preset for this row
  pump_count: number;            // preset, e.g. 4 (Vanilla), 10 (Sakura)
  ml_per_pump: number;           // preset, default 5
  empty_canister_weight: number; // preset tare weight (g) of this canister type
  total_weight: number | null;   // user keys in the gross weight (canister + syrup + cream)
}

// On ClosingEntry.whipping_cream (Whipping Cream item only):
interface WhippingCreamCalc {
  variants: WhippingCreamVariant[]; // up to 5
  total_whipping_cream: number | null;     // computed: sum of cream_weight (cream-only) across variants
}
```

- Starts with a single canister row (default flavour "vanilla"); each row has a Vanilla/Sakura `<select>` that live-switches `pump_count`/`ml_per_pump` via a `FLAVOUR_PRESETS` map (vanilla: 4 pumps, sakura: 10 pumps; both 5 ml/pump). User can add up to 5 canisters total via "+ Add canister".
- `empty_canister_weight` is not part of `FLAVOUR_PRESETS` — it's set on every variant (initial, flavour-switch, and "+ Add canister") from the **"Canister" container's `tare_g`** (`useItemsStore.containers`, currently 694 g, editable on `/admin/containers`), the same for all flavours.
- `total_weight` is the only numeric field the user enters per variant — pumps and ml/pump come from the row's flavour preset, and tare weight comes from the "Canister" container's `tare_g` (per the bullet above).
- Computed per variant: `syrup_weight = pump_count * ml_per_pump`, `cream_weight = total_weight - syrup_weight - empty_canister_weight`.
- (NEW 2026-06-15) If `cream_weight < 0` (i.e. `total_weight < syrup_weight + empty_canister_weight`), that canister's `.canister-block` gets a `warn` class (red border, `--warn`) and renders a `.warning` message below the check line.
- `total_whipping_cream` (sum of `cream_weight` across all canisters/variants — cream only) feeds the Whipping Cream item's own Closing inventory formula (countingflow.md §A.7) as the "canister" value — it is unrelated to Material Expired's "Cream" row (countingflow.md §A.9).
- `ClosingEntry.unopened_stacks`/`unopened_loose_pcs` (NEW): the "Unopened" calc for Whipping Cream — boxes come 4-to-a-stack, so the user enters full stacks plus any loose pieces that don't fill a stack. `non_coffee = unopened_pcs = unopened_stacks * 4 + unopened_loose_pcs` is derived from this (no longer entered directly, and not multiplied by `bag_size_g` — Whipping Cream's unit is "box", same scale as the rest of its `loose` formula) and feeds the `loose` formula below.
- The Whipping Cream item has no `closing_per_box_pcs` / "Ctn" row — its Closing total comes only from the `whipping_cream` inventory `loose` calc.
- (REVISED 2026-06-15) The old `inventory_bag_size_g: 1228` constant has been removed from the `whipping_cream` item — it was a leftover from the pre-restructure "Section B" inventory formula and no longer made sense after the Unopened/canister split. The `loose` formula (§B.4) is now `loose = (non_coffee × bag_size_g(1000)) + canister_total − 50`: unopened stock (in boxes, converted to grams) plus cream currently in canisters, minus the 50g cherry allocation.
- UI: on `/count/closing`, the Whipping Cream card has an "Add canister" control (disabled at 5); each canister row shows name + total weight input + computed cream weight, with a running cream-only sum ("Canister total") displayed on the card.

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
- UI: on `/count/closing`, items in these categories show `rows × lines + loose` inputs with a live computed total instead of the single free-entry field.

## A.6 Key cross-references / gotchas

- **Cream / Coconut Cream / Frozen Coconut Juice / SeaSalt Cheese**: `loss_formula: "components"`, summary-only rows on Material Expired (`loss_role: "summary"`), derived from Cheese Cap / Coconut Cheese Cap via `Item.loss_components` (countingflow.md §A.9). Don't confuse these with the Whipping Cream canister calculator (A.4), which is a separate Closing-only concept.
- **Milk**: `loss_formula: "components"` with its own input (`loss_role: "input_and_summary"`) — result = own weight + Cheese Cap total × 8/15. `useCountingStore.setMaterialLoss` recomputes all dependents whenever Cheese Cap/Coconut Cheese Cap changes.
- **Pandan**: Loss formula = "multiply", rate = 2/7, default container = jug (same as Matcha Flavoured).
- **Sheet2** is never directly editable — always derived from Back + Front + Closing.

## A.6.1 Stage page layout — all items on one page (NEW, REVISED)

Each counting stage page (`/count/back`, `/front`, `/expired`, `/closing`) displays **all items for that stage in a single scrollable page**, not one item per page/screen. This matches the original B.6 mobile card layout — confirmed as the intended design (no per-item navigation/pagination).

- Items render as a **compact** stacked list of cards (grouped by category with collapsible headers per B.6). Each card should fit in just a few lines: a header row (item name + category/unit, with the item's computed total right-aligned in the same row) followed by one or two compact rows of small input/auto fields. Avoid the earlier large per-field block layout — it made each card too tall.
- Every computed value (bag sum, box sum, loose total, whipping cream cream-weight/total, item total) updates **live** as the user types — no "calculate" button.
- A pinned **summary bar** sits near the top of the page for page-wide live totals, but only when a single summed unit makes sense across items:
  - **Closing**: no stage-wide summary total (items have mixed units — pcs, kg, etc. — so a single "stage total" isn't meaningful). A simple "Items counted X / Y" progress row may still appear.
  - **Material Expired**: 10 input cards followed by a read-only "Summary" section of 12 rows (countingflow.md §A.9) — no page-wide summary bar.
- The whipping cream calculator (A.4) and row×line+loose grid (A.5) are inline within their item's card on the Closing page — not a separate page.

## A.6.2 Tab navigation, admin overlay, numeric input, autosave (NEW)

- **Tab bar**: the 5 stages — Back, Front, Material Exp, Closing, Final — render as a persistent top tab bar. Switching tabs is **client-side only** (no route change / page reload); each tab's input state is preserved when switching away and back. (Implementation note: still keep `/count/{back,front,expired,closing,result}` as deep-linkable routes, but within a stage the active tab can change via client state without a full navigation.)
- **Admin button**: pinned top-right of the tab bar on every page. Tapping it opens the Admin panel as an **overlay** (slide-in panel + backdrop) on top of the current tab — it does not navigate away or reload, so in-progress counting input is preserved underneath. Closing the overlay returns to the same tab/state.
- **Numeric keyboard**: every count/weight input uses `inputmode="numeric"` (whole counts: rows, lines, loose, box count, open bags) or `inputmode="decimal"` (weights in g/ml where fractional values are possible) so mobile devices show the number pad, never the full keyboard.
- **Autosave**: every input change is autosaved (debounced ~500ms), with a small "Saved" confirmation toast. This replaces/supplements the existing 60s interval autosave (A.2 store) — autosave should fire on both a debounce-after-edit AND the periodic interval.
- **Final result tab** (Stage 5 / Sheet2): read-only table of Item × Back × Front × Closing × Total, with a grand-total row and the "Submit for Approval" action. Matches B.6/B.7 — never directly editable, missing stages treated as 0.

## A.6.3 Minimal-chrome UI conventions (NEW)

- **No per-page titles**: stage panels no longer show a `1. Back` / `2. Front` style header — the active tab in the topbar is the only page identifier.
- **No date in UI or routes**: the date is not displayed anywhere in the app UI and is not part of the `/count/*` routes either — `/count/back`, `/count/front`, etc. always resolve to today's record (`todayYYMMDD()` in `src/lib/date.ts`, used by `useLoadDate()`). The date still exists only as the record's file/record name internally.
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

- The Admin overlay (`Topbar.tsx` slide-in panel, on `/count/*`) does **not** show per-item details or calc factors inline — it's a simple list of links: "Final results", "Items", "Containers", "Records", "Approvals", "Settings".
- Item-level configuration (the `.const` factors referenced in §A.6.5) and container tares are managed on the dedicated `/admin/items` and `/admin/containers` pages (§A.9), reached via the overlay or `/admin`.

## A.9 Admin Items/Containers CRUD data flow (NEW)

- **`useItemsStore` (Zustand)** holds `items: Item[]` and `containers: Container[]`, the single source of truth consumed by both the counting flow (`useCountingStore`, stage pages) and the admin CRUD pages. A client-only `<ItemsStoreInit />` (mounted in the root layout) calls `init()` once on app load.
- **`itemsRepo.ts`** is Supabase-first: `isSupabaseConfigured()` checks `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`. If configured, `init()` reads from the `items`/`containers` tables (bootstrapping them from `seedItems`/`containers.ts` if empty) and all CRUD writes go through Supabase. If not configured (current dev environment), `init()` falls back to `localStorage` (`luckin_items` / `luckin_containers`), seeded from `seedItems.ts`/`containers.ts` on first run.
- **`/admin/items`**: one CRUD table per category (Name, Unit, Delete + two-step confirm), with **category-specific numeric columns** defined by `CATEGORY_COLUMNS` in `admin/items/page.tsx`: Packaging = Bag/ctn (`per_box_pcs`) + Pcs/bag (`per_bag_pcs`); Syrup = ml (`bag_size_g`); Solid Beverage / Coffee Bean = Bag/ctn (`per_box_pcs`) + g/bag (`bag_size_g`); Frozen = Pcs/ctn (`per_box_pcs`) + ml (`bag_size_g`); Raw Material = Box/ctn (`per_box_pcs`) + ml/box (`bag_size_g`); Dairy & Soda = `/bag` (`per_bag_pcs`) + `/ctn` (`per_box_pcs`) + Size (`bag_size_g`); Merch = Pcs/ctn (`per_box_pcs`). `front_per_box_pcs`/`closing_per_box_pcs`/`inventory_bag_size_g`/Loss rate/default Container are not shown on this table (still set in `seedItems.ts`). The **"Loss" category is excluded entirely** from `/admin/items` — managed via `/admin/loss` instead. Per-category "+ Add item" form (name, unit, `appears_in` stage checkboxes); new items get a generated `id` and all other calc factors default to `null`/`"none"`/`false` and are edited inline afterward.
- **"Dairy & Soda" category**: `soda_water`, `cream_charger`, `whipping_cream`, `cream`, and `soda_loss` share this category (consolidated from Packaging/Coffee Bean/Dairy/Loss), with contiguous `sort_order` 502–507. All Syrup items now have `unit: "ml"` (default 1000ml, except Caramel Syrup 500 and Pistachio Sauce 300).
- **Merch**: `coconut_keychain.per_box_pcs = 50`; new item `coconut_plushie` (Pcs/ctn = 36, `appears_in: ["back","closing","sheet2"]`). Merch is now the last category card on `/admin/items`, with `sort_order` 508–509 (after Dairy & Soda's 502–507).
- **"+ Add item"**: the per-category add form no longer has a "Final" checkbox — every newly added item automatically gets `"sheet2"` appended to `appears_in` (in addition to whichever of Back/Front/Mat. Exp/Closing are checked), so new items always show up on the Final (Sheet2) sheet.
- **`/admin/loss`** (new page, linked from `/admin` and the Topbar overlay): lists every item with `"expired"` in `appears_in` (14 items, countingflow.md §A.9), with name, category, and per-`loss_formula` rate editor — `"multiply"` shows one `loss_rate` input, `"components"` shows one labeled input per `loss_components[i].rate` (e.g. "via Cheese Cap"), `"direct"` shows "—".
- **`/admin/containers`**: single CRUD table (Name, Tare g, Delete) + "+ Add container" form.
- Edits write through `updateItem`/`updateContainer` etc., which update Zustand state, mirror to `localStorage`, and (if Supabase configured) upsert remotely — stage pages re-render immediately since they read `items`/`containers` from the same store.
- `seedItems.ts` and `containers.ts` are now **seed defaults only**, consumed exclusively by `useItemsStore.init()`.

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
- Input counts for Back, Front, Material Expired (Loss only), Closing (incl. inventory items, §A.7)
- Weight inputs for powder/liquid items come from physical scale reading
- View auto-calculated results and Sheet2 preview
- Submit for final approval (triggers admin review)
- Cannot modify item list or stage structure

## B.2 Stage Architecture

```
Stage 1: Back         → input: open_bags, box_count
Stage 2: Front        → input: box_count
Stage 3: Material     → Loss ONLY (REVISED, countingflow.md §A.6/§A.8)
                        input: gross_weight (ml/g) + container selection (preset tare,
                        auto-subtracted) for each thrown premix
Stage 4: Closing      → input: loose_weight_or_count, box_count  [all fields nullable with warning]
                        + for the 13 inventory items (countingflow.md §A.7): under_cabinet,
                        non_coffee inputs inline on the card, feeding loose = bag_size − ...
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
  unit: string | null,        // display unit, e.g. "pcs", "bag", "bottle", "box", "pack", "can", "g"
  per_bag_pcs: number | null, // null if "-" (whole unit)
  per_box_pcs: number | null,
  front_per_box_pcs: number | null,   // Front-stage box pcs, may differ from per_box_pcs (§A.8 finding)
  closing_per_box_pcs: number | null, // Closing-stage storage-box pcs, may differ from per_box_pcs
  bag_size_g: number | null,  // for powder/liquid closing loose_sum conversion (loose / bag_size_g)
  inventory_bag_size_g: number | null, // bag size used by closing_inventory_formula; falls back to bag_size_g
  loss_formula: "multiply" | "direct" | "components" | "none",
  loss_rate: number | null,    // for "multiply"

  // (NEW, countingflow.md §A.9) for "components" — sum of componentTotals[source_item_id] * rate,
  // added to this item's own total_volume (if any)
  loss_components: { source_item_id: string; rate: number }[] | null,

  // (NEW, countingflow.md §A.9) controls Material Expired rendering:
  // "input" = input card only, "summary" = summary row only, "input_and_summary" = both (default)
  loss_role: "input" | "input_and_summary" | "summary",

  loose_grid: boolean,         // row x line + loose entry (Raw Material/Syrup/Frozen, §A.5)
  closing_input_type: "weight" | "count" | "sleeves",

  // (NEW, countingflow.md §A.6) Material Expired container-tare selector — only set
  // for Loss items that have a container preset. null/empty => no container subtraction.
  default_container_id: string | null, // e.g. "jug" — preselected, staff can change

  // (NEW, countingflow.md §A.7) Closing inventory calc — only set for the 13 items
  // whose "loose" is now derived in Closing instead of entered directly.
  closing_inventory_formula: "non_coffee" | "under_cabinet" | "whipping_cream" | null,
  // "non_coffee":     loose = bag_size_g − non_coffee
  // "under_cabinet":  loose = bag_size_g − under_cabinet            (coffee beans)
  // "whipping_cream": loose = bag_size_g − canister(cream total) − non_coffee − cherry(50)
  //   (non_coffee here is derived from unopened_stacks/unopened_loose_pcs, see ClosingEntry below)

  notes: string
}
```

### Container (NEW, countingflow.md §A.6)
```
{
  id: string,    // "pitcher" | "jug" | "powder_container" | "squeezer" | "canister" | "small_pitcher" | "coffee_tupperware"
  name: string,  // display name
  tare_g: number // e.g. pitcher=286, jug=281.5, powder container=191, squeezer=31.5,
                 // canister=694, small pitcher=138, coffee tupperware=268
}
```

### DailyRecord
```
{
  date: YYMMDD string,
  status: "draft" | "pending_approval" | "approved",
  back: { [item_id]: { open_bags, bag_sum, box_count, box_sum, total } },
  front: { [item_id]: { box_count, total } },
  material_loss: { [item_id]: { container_id, gross_weight, total_volume, rate_value, result } },
  // total_volume = gross_weight − container.tare_g (or = gross_weight if no container)
  closing: { [item_id]: { under_cabinet, non_coffee, loose, loose_sum, box_count, box_sum, total, whipping_cream, unopened_stacks, unopened_loose_pcs } },
  // under_cabinet/non_coffee only used when item.closing_inventory_formula is set (§A.7);
  // otherwise loose is entered directly as before
  // whipping_cream (NEW, countingflow.md §A.2/§A.4): WhippingCreamCalc | null — only set
  // for the Whipping Cream item; feeds its own "whipping_cream" closing_inventory_formula
  // unopened_stacks/unopened_loose_pcs (NEW, §A.4/§A.7): Whipping Cream only — derives
  // non_coffee = unopened_stacks*4 + unopened_loose_pcs (pcs, no bag_size_g conversion),
  // replacing manual entry
  sheet2: { [item_id]: { back, front, closing, total } },  // computed
  approved_by: string | null,
  approved_at: timestamp | null,
  drive_file_id: string | null
}
```

> `material_inventory` (former Material Expired §3B) is REMOVED — merged into `closing` per §A.7. See §A.4 and §A.5 for other new fields (whipping cream variants, row×line+loose) layered on top of this model.

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

### Material Expired — Loss (REVISED, countingflow.md §A.9 Cheese Cap split)
```
total_volume = gross_weight − (container.tare_g ?? 0)   // container = Container looked up by container_id

if loss_formula == "multiply":   result = total_volume × loss_rate
  // (NEW) the input card's row displays this whole chain inline:
  // gross_weight − tare × loss_rate = result (rate shown as a read-only constant)
if loss_formula == "direct":     result = total_volume                       // Soda, Cheese Cap, Coconut Cheese Cap
if loss_formula == "components": result = (total_volume ?? 0) + Σ (componentTotals[c.source_item_id] × c.rate)
                                  // null if no own input AND no component source has a value yet
                                  // Milk, Cream, Coconut Cream, Frozen Coconut Juice, SeaSalt Cheese
if loss_formula == "none":       result = null
```
`componentTotals` is a map of every item's current `total_volume`, rebuilt by `useCountingStore.setMaterialLoss` on every edit so dependent summary rows recompute live.

### Closing — Inventory items (NEW, countingflow.md §A.7)

For items with `closing_inventory_formula` set, `loose` is derived (not entered directly):
```
if closing_inventory_formula == "non_coffee":     loose = bag_size_g − (non_coffee ?? 0)
if closing_inventory_formula == "under_cabinet":  loose = bag_size_g − (under_cabinet ?? 0)
if closing_inventory_formula == "whipping_cream": loose = (non_coffee × bag_size_g) + canister_total
  // canister_total = calcWhippingCream(entry.whipping_cream).total_whipping_cream ?? 0 (§A.4, Closing-only)
  // non_coffee is derived (NEW, §A.4): non_coffee = unopened_stacks*4 + unopened_loose_pcs (pcs, "boxes" count)
  // (REVISED 2026-06-15) the old inventory_bag_size_g(1228) constant and the 50g cherry-allocation subtraction
  // were both removed — non_coffee (unopened boxes) is converted to grams via bag_size_g(1000), then the
  // canister total is added; loose_sum = loose / bag_size_g = non_coffee + canister_total/1000
```

### Closing
```
// Powder/liquid items (bag_size_g is set):
loose_sum = loose_g / bag_size_g

// Piece/count items (closing_input_type == "count"):
loose_sum = loose_count
  // (REVISED 2026-06-15) Cream Charger now uses "count" too: loose = loose pcs directly
  // (was "sleeves" with loose_sum = loose_sleeves × per_bag_pcs(10), which double-counted
  // against the Ctn row's closing_per_box_pcs)

box_sum = box_count × (closing_per_box_pcs ?? per_box_pcs)
  // Cream Charger: closing_per_box_pcs = 10 (1 sleeve = 10 pcs), so total = loose(pcs) + box_count × 10
total   = (loose_sum ?? 0) + (box_sum ?? 0)
```

### Sheet2 (Final)
```
total = (back ?? 0) + (front ?? 0) + (closing ?? 0)
```
Display: round to 1 decimal place in the Final result table (back/front/closing/total
columns) — full precision is retained internally, only the displayed value is rounded.

## B.5 Validation Rules

| Rule | Trigger | Severity |
|------|---------|----------|
| Closing field left blank | Any Closing field = null on submit | Warning (not block) |
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
| `/count/back` | User + Admin | Stage 1 input |
| `/count/front` | User + Admin | Stage 2 input |
| `/count/expired` | User + Admin | Stage 3 input (Loss + Inventory) |
| `/count/closing` | User + Admin | Stage 4 input |
| `/count/result` | User + Admin | Stage 5 — Sheet2 read-only + Submit |
| `/admin` | Admin only | Dashboard |
| `/admin/items` | Admin only | Item CRUD (name, unit, calc factors, appears_in, container) |
| `/admin/containers` | Admin only | Container CRUD (name, tare_g) |
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
| 2026-06-12 | Added `unit: string | null` field to Item data model (§B.3, types.ts) and set it on all 22 items in `seedItems.ts` per the user's master unit list (e.g. matcha=bag, ceylon_black_tea=g, whipping_cream=box, uht_milk=pack); items with no match in the list (chocolate, cream/milk cheese-premix rows, milk, cream, pineapple_syrup) left as `unit: null` | Claude |
| 2026-06-12 | Re-derived flow from `Counting (2).xlsx` (countingflow.md §A.6–A.8): Material Expired is now Loss-only with a container-tare selector (new `Container` type, `default_container_id` on Item, `material_loss.container_id`/`gross_weight` on DailyRecord); the former Material Expired Inventory section is merged into Closing via new `closing_inventory_formula` on Item and `under_cabinet`/`non_coffee` fields on `closing` entries; `material_inventory` removed from DailyRecord. Updated §B.2 stage architecture and §B.4 calculation rules accordingly. (Code/seedItems/mockup updates deferred to a follow-up pass) | Claude |
| 2026-06-12 | Removed "Souflle Syrup" from §A.8 item list (not part of this app's item set; Pineapple Syrup remains absent per `Counting (2).xlsx`) — Back is now 50 items, Closing 51 (Back + Whipping Cream). Added Sheet2/Final display rule: round to 1 decimal place for display only, full precision retained internally (§B.4) | Claude |
| 2026-06-12 | Implemented the revised data model end-to-end: `types.ts`/`calculations.ts`/`containers.ts`/`seedItems.ts` (60 items)/`useCountingStore.ts` updated per §A.6–A.8; `pineapple_syrup` removed; new `front_per_box_pcs` field added (Front box-pcs differs from Back for several shared items, e.g. Velvet Base 12 vs 2, Cup Sleeve 2000 vs 200). Ported `mockups/dark_theme.html` into `globals.css` (`.app-dark`), rebuilt the topbar as `Topbar.tsx` (sticky tabs + slide-in Admin overlay), and rewrote all 5 stage pages (back/front/expired/closing/result) as single-page card lists matching the mockup. Removed `/admin/items` (§A.6.4) and its link from `/admin`. Updated `supabase/schema.sql` to match the new `items`/`daily_records` columns | Claude |
| 2026-06-12 | Verified the above with `npm run build` and a `npm run dev` walkthrough (Back/Front calc rows, Material Expired cream canister calc + Pandan warning + container tares, Closing loose-grid and Whipping Cream's `closing_inventory_formula` consuming Cream's loss result, Final 51-row Sheet2 table, Admin overlay). Fixed a pre-existing `tsc`/build error in `src/lib/supabase/server.ts` by typing the cookie `set`/`remove` `options` params as `CookieOptions` | Claude |
| 2026-06-12 | Global dark theme + Admin Items/Containers CRUD (§A.9): moved `.app-dark` to `<body>` in the root layout so `/`, `/admin*` are dark too; rewrote home page and all `/admin/*` pages (new `AdminHeader` component). Added `containers` table to `supabase/schema.sql`, new `itemsRepo.ts` (Supabase-first data access) and `useItemsStore.ts` (Zustand, localStorage+seed fallback when Supabase isn't configured), with `<ItemsStoreInit />` mounted in the root layout. `useCountingStore.ts` and all 5 stage pages now read items/containers from `useItemsStore` instead of static `seedItems`/`containers.ts` imports (those files remain as seed defaults only). New `/admin/items` (per-category CRUD table: name/unit/calc factors/appears_in/default container, add/delete) and `/admin/containers` (name/tare_g CRUD) pages, linked from `/admin` and the Topbar admin overlay. Added `.admin-table`/`.row-actions`/`.add-row-form`/`.home-link`/`.admin-card` etc. to `globals.css`. Verified via `npm run build` and a dev walkthrough: editing an item's `per_box_pcs` on `/admin/items` updates the Back stage's `.const` value immediately; editing a container's `tare_g` on `/admin/containers` updates Material Expired's tare/formula check immediately; edits persist to `localStorage` | Claude |
| 2026-06-12 | `/admin/items` table: removed the Loss rate and default Container columns (still set via `seedItems.ts`, not admin-editable). Created a new "Dairy & Soda" category in `seedItems.ts` consolidating `soda_water`, `cream_charger`, `whipping_cream`, `cream_cheese_premix`, `cream`, `soda_loss` (previously split across Packaging/Coffee Bean/Dairy/Loss), with new contiguous `sort_order` 501–506 placed after Merch and before Loss so the category renders as a single block on stage pages and `/admin/items`. Verified on `/count/back` and `/admin/items` via dev server (after clearing `localStorage` so the new seed data reloads) | Claude |
| 2026-06-12 | Syrup items in `seedItems.ts` now use `unit: "ml"` (1000ml default, Caramel 500, Pistachio 300); `/admin/items` shows a single "ml" column (`bag_size_g`) for the Syrup category instead of the full Unit/`/bag`/`/box`/Bag g/Inv bag g set. Fixed `cream_charger.per_box_pcs` 360→400 (1 ctn = 40 sleeves × 10 pcs). Removed the "Final" checkbox from "+ Add item" — new items now always get `"sheet2"` appended to `appears_in` automatically. Added new `/admin/loss` page (linked from `/admin` and the Topbar overlay) listing all items with `"expired"` in `appears_in` plus an editable `loss_rate` column. Verified via dev server walkthrough | Claude |
| 2026-06-12 | Reworked `/admin/items` to show category-specific numeric columns via a new `CATEGORY_COLUMNS` config (§A.9): Packaging (Bag/ctn, Pcs/bag), Syrup (ml), Solid Beverage & Coffee Bean (Bag/ctn, g/bag), Frozen (Pcs/ctn, ml), Raw Material (Box/ctn, ml/box), Dairy & Soda (`/bag`, `/ctn`, Size), Merch (Pcs/ctn); the "Loss" category card is no longer shown on `/admin/items` (use `/admin/loss`). In `seedItems.ts`: set `coconut_keychain.per_box_pcs = 50`, added new Merch item `coconut_plushie` (Pcs/ctn = 36, appears in Back/Closing/Final, `sort_order: 501`), and shifted the "Dairy & Soda" block from `sort_order` 501–506 to 502–507 to make room. Verified via dev server: per-category columns render correctly, "Loss" card is gone from `/admin/items` (still 15 rows on `/admin/loss`), Coconut Plushie appears on `/count/back`, and category labels remain non-duplicated | Claude |
| 2026-06-12 | Moved Merch to the last category card on `/admin/items` by renumbering `coconut_keychain`/`coconut_plushie` `sort_order` from 500/501 to 508/509 (after Dairy & Soda's 502–507). Removed the date segment from counting routes: `src/app/count/[date]/*` → `src/app/count/*` (back/front/expired/closing/result + layout), `Topbar.tsx` no longer takes a `date` prop and links to `/count/{stage}`, and `useLoadDate()` (in `StageHooks.ts`) now takes no argument and resolves the record date internally via new `src/lib/date.ts` (`todayYYMMDD()`). Home page "Start counting" link now points to `/count/back` with no date suffix in the text or URL. Verified via dev server: `/`, `/count/back`, `/count/result`, and `/admin/items` (Merch last) all render correctly | Claude |
| 2026-06-15 | `seedItems.ts`: Pandan changed from `loss_formula: "none"` to `"multiply"` with `loss_rate: 2/7` and `default_container_id: "jug"` (matching Matcha Flavoured); Ceylon Black Tea and Jasmine Tea `loss_rate` changed from 0.45 to 1/20. Removed the Pandan-specific S-01 hard-warning logic from `calculations.ts` (selfCheckWarnings) and `/count/expired` (the `isPandanWarning` card banner) — Pandan now behaves like any other multiply-formula Loss item. Updated `/admin/loss` values accordingly (data-driven, no code change needed there) | Claude |
| 2026-06-15 | Restructured Material Expired loss model (countingflow.md §A.9, "Cheese Cap" split): `LossFormula` is now `"multiply" \| "direct" \| "components" \| "none"` (removed `"subtract"`/`"add"`); `Item` gained `loss_components: {source_item_id, rate}[] \| null` and `loss_role: "input" \| "input_and_summary" \| "summary"`, and lost `loss_subtract_ml`/`loss_addend_item_id`. `MaterialLossEntry` lost `whipping_cream`; `ClosingEntry` gained `whipping_cream: WhippingCreamCalc \| null`. In `seedItems.ts`: removed `cream_cheese_premix`/`milk_cheese_premix`/`seasalt_coconut`; added `cheese_cap`/`coconut_cheese_cap` (`loss_formula: "direct"`, `loss_role: "input"`); `cream`/`coconut_cream_loss`/`frozen_coconut_juice`/`sea_salt_cheese` are now `"components"` summary-only rows; `milk_loss` is `"components"` with `loss_role: "input_and_summary"`; `soda_loss` is `"direct"`. `calcMaterialLoss` rewritten around `componentTotals` (map of every item's `total_volume`); `calcClosing` dropped `creamCanisterValue` and now accepts/returns `whipping_cream`. `useCountingStore.setMaterialLoss` rebuilds `componentTotals` and recomputes every item whose `loss_components` references the edited item. `/count/expired` rewritten as 10 input cards + a read-only 12-row "Summary" section (removed the old Cream whipping-cream special case and "Total cream" bar). The whipping-cream canister calculator moved to `/count/closing`'s Whipping Cream card (feeding its own `closing_inventory_formula`) and the stale Pandan/S-01 warning leftover was removed from that page. `/admin/loss` now renders per-`loss_formula` rate editors (`multiply`=1 input, `components`=1 input per source labeled "via X", `direct`="—"). Verified via `npx tsc --noEmit`, `npm run build`, and dev-server checks on `/count/expired` (Cheese Cap=300, Coconut Cheese Cap=200, Milk=500 → Cream=100, SeaSalt Cheese≈47.59, Milk=660, Coconut Cream≈177.22, Frozen Coconut Juice≈15.19), `/count/closing` (canister calc → Whipping Cream loose), and `/admin/loss` | Claude |
| 2026-06-15 | Two follow-up refinements (§A.4/§A.9): (1) `/count/expired` multiply-formula cards now display the rate inline in the main row (`gross_weight − tare × loss_rate = result`, rate shown as a read-only constant), and the now-redundant separate check line for multiply items was removed. (2) `/count/closing`'s Whipping Cream card: `WhippingCreamVariant` gained `flavour: "vanilla" \| "sakura"`, and each canister row now has a Vanilla/Sakura `<select>` (`FLAVOUR_PRESETS` map) that live-switches `pump_count`/`ml_per_pump`/`empty_canister_weight`; `DEFAULT_WHIPPING_CREAM` now starts with a single canister (was fixed Vanilla+Sakura rows), up to 5 via "+ Add canister". `ClosingEntry` gained `unopened_stacks`/`unopened_loose_pcs`: a new "Unopened" row (`stacks × 4 + loose_pcs = unopened_pcs`) derives `non_coffee = unopened_pcs × bag_size_g`, replacing the old manual `non_coffee` entry for Whipping Cream and feeding the existing `loose = bag_size_g − canister_total − non_coffee − 50` formula. `calcClosing`/`calcWhippingCream` and `useCountingStore.setClosing` updated accordingly. Verified via preview: 500 − 281.5 × 0.286 = 62.43 (Pandan), and stacks=2/loose=3 → "2 × 4 + 3 = 11 pcs × 1000 = 11000 g" feeding `1228 − canister(530) − 11000 − 50` | Claude |
| 2026-06-15 | Whipping Cream follow-up: removed `closing_per_box_pcs: 8` from the `whipping_cream` item in `seedItems.ts`, so its Closing card no longer shows a "Ctn" (Boxes × /box = Sum) row — its total now comes solely from the `whipping_cream` inventory `loose` calc. Also fixed the Unopened calc to not multiply by `bag_size_g`: `non_coffee = unopened_stacks*4 + unopened_loose_pcs` (pcs), since Whipping Cream's unit is "box" — same scale as `canister_total`/`1228`/`50` in the `loose` formula. `calcClosing` and the Closing page's check line updated accordingly. Verified via preview (after clearing `localStorage['luckin_items']`): Ctn row gone, and stacks=2/loose=3/canister=530 → `1228 − 530 − 11 − 50 = 637` → `0.637 box` | Claude |
| 2026-06-15 | Whipping Cream canister tare follow-up (§A.4): removed the hardcoded `empty_canister_weight: 150` from `FLAVOUR_PRESETS` in `/count/closing` — every canister variant (initial default, flavour-switch, and "+ Add canister") now gets `empty_canister_weight` from the **"Canister" container's `tare_g`** (`useItemsStore.containers`, 694 g, editable on `/admin/containers`) instead of a flavour preset, since the tare is the same physical canister regardless of flavour. Verified via preview: canister-block now shows "Syrup 20 · Container 694" and check line `0 − 20 − 694 = 0 g` | Claude |
| 2026-06-15 | Whipping Cream: removed the leftover `1228` constant (§B.4/§A.7) — it was the old "Section B" inventory bag size from `Counting (1).xlsx`, no longer meaningful after the Unopened/canister split. Formula is now `loose = (non_coffee × bag_size_g(1000)) + canister − cherry(50)`, i.e. unopened stock (in boxes) converted to grams, plus cream currently in canisters, minus the cherry allocation. Removed `inventory_bag_size_g: 1228` from the `whipping_cream` item (`bag_size_g: 1000` used directly); fixed stale "tare weight come from the row's flavour preset" wording in §A.4. Verified via preview: stacks=2/loose=3/canister total=−14 (700−20−694) → `11 × 1000 + (−14) − 50 = 10936 g → 10.936 box` | Claude |
| 2026-06-15 | Whipping Cream: removed the 50g cherry allocation from `loose` (§B.4/§A.7) — user reported it as wrong. Formula is now `loose = (non_coffee × bag_size_g(1000)) + canister_total`, so `loose_sum = non_coffee + canister_total/1000` (e.g. 11 box unopened + 565g canister → 11.565 box). Updated `calcClosing`'s `whipping_cream` branch, the Closing card's check line, and the `whipping_cream` item's `notes` field | Claude |
| 2026-06-15 | Two fixes: (1) §A.4 — each whipping-cream canister row now gets a `warn` border + `.warning` message if `cream_weight < 0` (`total_weight < syrup_weight + empty_canister_weight`), added `.canister-block.warn` CSS. (2) §B.4 — Cream Charger's Closing calc (`seedItems.ts`) was double-counting the per-sleeve factor: changed `closing_input_type: "sleeves"` → `"count"` (`loose_sum = loose` pcs directly) and `closing_per_box_pcs: 1` → `10` (1 sleeve = 10 pcs), so `total = loose(pcs) + box_count × 10`. Verified via preview: loose=4, boxes=3 → `4.000 + 30 = 34.000 pcs` | Claude |
