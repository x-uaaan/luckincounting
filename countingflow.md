# Counting Flow — Combined Reference & Working Notes

> **Purpose:** Single source of truth for counting logic. Combines `COUNTING_RULES.md` (full reference, §B below) with the working summary and new feature specs (§A). Update this file whenever counting logic, formulas, or stage flow changes.

---

# §A. Working Notes (current understanding + new features)

## A.1 Stage sequence

```
1. Back (store room)
   total = open × per_bag_pcs + box × per_box_pcs
        ↓
2. Front (bar area)
   total = box × per_box_pcs   (boxes only, no loose)
        ↓
3. Material Expired (Loss ONLY — during/end of service) (REVISED, see §A.6/§A.7/§A.9)
   - Staff weighs the container being thrown (gross weight, container + leftover premix)
   - Staff selects which container was used from a dropdown (§A.6) → app subtracts
     the container's known tare weight automatically: total = gross_weight − tare_g
   - multiply:   result = total × rate                (Pandan, Matcha, Matcha 1000, Chocolate, Ceylon, Jasmine — each standalone)
     → the input card's row displays the full chain: `gross_weight − tare × rate = result`
       (the rate is shown inline as a read-only constant, e.g. "500 − 281.5 × 0.286 = 62.43")
   - direct:     result = total_volume (plain weight, no rate; Soda has no container, Cheese Cap/Coconut Cheese Cap subtract a container tare like other Loss items, §A.6)
   - components: result = own_total + Σ(component_total × rate) (Milk, Cream, Coconut Cream,
     Frozen Coconut Juice, SeaSalt Cheese — see §A.9 for the Cheese Cap / Coconut Cheese Cap split)
   → the whipping-cream canister calculator (§A.2) is NOT part of Material Expired —
     it lives entirely in Closing and feeds the Whipping Cream inventory formula (§A.7).
        ↓
4. Closing (after service)
   - Inventory items (13 items, §A.7): loose = bag_size − under_cabinet − non_coffee
     (under_cabinet/non_coffee entered inline on the Closing card for these items —
     this is the former Material Expired "Inventory" section, now part of Closing)
   - powder/liquid: loose_sum = loose_g / bag_size_g
   - pieces:        loose_sum = loose_count   (see A.3 — flexible row×line+loose entry)
   box_sum = box_count × box_factor   (§A.9 — box_factor = closing_per_box_pcs, falling
             back to per_bag_pcs, then per_box_pcs: admin /items data, not a hidden value)
   total   = loose_sum + box_sum
   ⚠ all fields can be empty → warning only, not a hard block
        ↓
5. Sheet2 (final result, read-only, auto-computed)
   total = back + front + closing
   missing stage → treated as 0, never NaN
   display: round to 1 decimal place (intermediate calcs keep full precision —
            only Sheet2/Final display is rounded)
```

## A.2 Whipping Cream — pump-based variant calculator (NEW, REVISED)

Whipping cream premix comes in flavoured variants (Vanilla, Sakura, etc.). The user weighs each canister **as a whole** (canister + syrup pumps + cream still inside) and the app extracts the **cream-only weight** by subtracting the known syrup amount and the empty-canister tare weight.

**Per-variant formula:**
```
syrup_weight  = pump_count × ml_per_pump          (g, density ≈ 1 g/ml)
cream_weight  = total_weight − syrup_weight − empty_canister_weight
```

**Known flavours:**
| Flavour | Pumps | ml/pump | syrup_weight |
|---------|-------|---------|---------------|
| Vanilla whipping cream | 4 | 5 | 20 g |
| Sakura whipping cream  | 10 | 5 | 50 g |

- `pump_count` and `ml_per_pump` (= 5) are **presets** selected per canister via a **Vanilla/Sakura flavour dropdown** — not entered manually.
- `empty_canister_weight` = the **"Canister" container's `tare_g`** (694 g, set on `/admin/containers`, §A.6) — the same value for every canister regardless of flavour, not a flavour-specific preset.
- `total_weight` is the **only numeric field the user keys in** — the gross weight of that canister (canister + syrup + cream) as measured on the scale.
- (NEW 2026-06-15) If `total_weight` is less than `syrup_weight + empty_canister_weight` (i.e. `cream_weight` would be negative), that canister row is flagged with a warning border and an inline error message — this indicates the entered weight is implausible (less than the empty canister + syrup alone).

**Multi-canister sum:**
- The page starts with **1 canister row** (default flavour Vanilla). Each row's flavour dropdown switches its pump/syrup/tare preset live and recomputes `cream_weight`. "+ Add canister" appends another row (default Vanilla, user can switch to Sakura) until **5 canisters total** — the control becomes disabled at 5.
- App sums the cream-only weight across all canisters:
```
total_whipping_cream = Σ cream_weight   (for i = 1..N, N ≤ 5)
```
- This `total_whipping_cream` (cream only — canister and syrup already excluded) feeds directly into the Whipping Cream Closing inventory formula (§A.7) as the "canister" value. It is unrelated to Material Expired's "Cream" row (§A.9), which represents premix thrown as part of Cheese Cap, not cream still in usable canisters.
- This calculator lives on the **Closing** page (`/count/closing`), on the Whipping Cream card — not on Material Expired.

## A.3 Flexible loose counting — row × line + loose (NEW)

For loose/piece counting, instead of a single free-entry number, allow staff to count stock arranged in a grid (rows × lines/columns) plus any extra loose pieces:

```
loose_total = (rows × lines) + loose
```

- `rows`, `lines`, and `loose` are all independently nullable (consistent with "Closing fields can be empty" rule, §B.7).
- If `rows` or `lines` is empty, treat as 0 for the multiplication (i.e. `loose_total = loose` if no grid is counted).
- `loose_total` feeds into `loose_sum` per the existing Closing rules (A.1 stage 4): for powder/liquid items `loose_sum = loose_total / bag_size_g`; for piece items `loose_sum = loose_total` directly.
- **Applies to items in these categories:** Raw Material, Syrup, Frozen. Other categories keep the simple single-value `loose` entry.
- Configurable per item by the admin (see appflow.md data model).

## A.4 Key cross-references / gotchas

- **Cream / Coconut Cream / Frozen Coconut Juice / SeaSalt Cheese**: these are "components" formula, summary-only rows in Material Expired — they have no own input, derived entirely from Cheese Cap / Coconut Cheese Cap (§A.9). The whipping-cream canister calculator (§A.2) is a separate concept that lives in Closing and feeds the Whipping Cream inventory formula (§A.7); don't conflate the two "cream" concepts.
- **Milk**: "components" formula with its own input — result = own weight + Cheese Cap × 8/15 (§A.9). Order of evaluation matters: Cheese Cap must be entered/recomputed before Milk's dependent total updates.
- **Pandan**: Loss formula = "multiply", rate = 2/7, default container = jug (same as Matcha Flavoured) — no longer a "none"/hard-warning item.
- **Sheet2** is never directly editable — always derived from Back + Front + Closing.

## A.5 Known historical errors (from `Counting (1).xlsx` audit — for reference, not to be repeated)

See §B.5–B.6 for the full list (E-01 to E-06, S-01 to S-06). Summary of root causes to design around:
- Box-sum mismatches (E-01, E-02) → app should auto-calculate box_sum, never allow manual override that diverges from box × per_box_pcs without a warning.
- Missing Sheet2 row for an item present in Closing (E-03) → app must enforce that every item appearing in any stage also has a Sheet2 row.
- Rate column overloading (E-04, E-05) → replaced by explicit `loss_formula` + dedicated fields per item (multiply/subtract/add), not a single ambiguous "rate" column.
- Opaque cross-stage formulas (E-06) → Cream's inventory formula (now in Closing, §A.7) must reference the Loss section's value directly in the data model, not require manual lookup.

## A.6 Material Expired — container selector for Loss (NEW, from `Counting (2).xlsx`)

Instead of staff mentally subtracting the empty-container weight before entering "total", the app now lets staff enter the **gross weight** (container + leftover premix) and **select which container** was used. The app subtracts the container's known tare automatically:

```
total = gross_weight − container_tare_g
```

**Container presets:**

| Container | Tare (g) | Default for Loss item |
|-----------|----------|------------------------|
| pitcher | 286 | Chocolate, Cheese Cap, Coconut Cheese Cap |
| jug | 281.5 | Matcha, Pandan |
| powder container | 191 | Matcha 1000 |
| squeezer | 31.5 | Ceylon Black Tea |
| canister | 694 | Jasmine Tea |

- Each Loss item has a **default** container preselected (above), but staff can change it via dropdown if a different container was actually used that day.
- Items entered as plain weight with no container subtraction (`loss_formula: "direct"` or `"components"` with own input): Soda, Milk.
- Cheese Cap and Coconut Cheese Cap (`loss_formula: "direct"`) DO get a container selector (default: pitcher, 286g) — staff weigh the combined premix waste in a pitcher and the tare is subtracted like any other Loss item, before the result feeds §A.9's split.
- Summary-only items with no input card at all (derived entirely from Cheese Cap / Coconut Cheese Cap, §A.9): Cream, SeaSalt Cheese, Coconut Cream, Frozen Coconut Juice.
- Data model: each Loss item gets a `container_options: { name, tare_g }[]` (or a shared lookup keyed by container name) plus a `default_container` and a per-record `container_id` selection (see appflow.md §B.3).

## A.7 Inventory moved into Closing (NEW, from `Counting (2).xlsx`)

The former Material Expired "Inventory" sub-section (3b) is **removed from Material Expired**. For the 13 items below, the `under_cabinet` / `non_coffee` inputs and the resulting `loose` value now live **inline on the Closing card** for that item — Material Expired is Loss-only (§A.6).

```
loose = bag_size − under_cabinet − non_coffee   (solid beverage / frozen items)
loose = bag_size − under_cabinet                (coffee beans)
loose = (non_coffee × bag_size_g) + canister(from Closing's own whipping-cream canister calculator, §A.2)   (Whipping Cream)
```

**Whipping Cream's `non_coffee` is derived, not entered directly.** Unopened boxes
come in stacks of 4; staff enter the number of full stacks plus any loose pieces
that don't make a full stack:

```
non_coffee = unopened_pcs = (stacks × 4) + loose_pcs
```

This `non_coffee` (pcs) then feeds the Whipping Cream `loose` formula above:
`unopened_pcs` boxes × `bag_size_g` (1000) gives the unopened stock in grams,
plus the cream still in canisters. There is no separate "total bag size"
constant for Whipping Cream (the old `1228` was a leftover from before the
Unopened/canister split and has been removed), and no cherry-allocation
subtraction (the old `-50` was also a leftover and has been removed). The
card shows both check lines: `stacks × 4 + loose_pcs = non_coffee pcs` and
`non_coffee × 1000 + canister(...) = loose g`.

| Item | Bag size (g) | Closing inventory formula |
|------|--------------|----------------------------|
| Matcha Flavoured (bag) | 280 | 280 − non_coffee |
| Matcha 1000 (bag) | TBD | bag_size − non_coffee |
| Pistachio Sauce (bag) | 513 | 513 − non_coffee |
| Original Smoothie (bag) | 268 | 268 − non_coffee |
| Blue Velvet Base (bag) | 595 | 595 − non_coffee |
| Jasmine Tea (bag) | TBD | bag_size − non_coffee |
| Ceylon Black Tea (g) | TBD | bag_size − non_coffee |
| Pandan (bag) | TBD | bag_size − non_coffee |
| Sea Salt Cheese (bag) | TBD | bag_size − non_coffee |
| Cocoa Flavoured (bag) | TBD | bag_size − non_coffee |
| Italian Bean (bag) | 600 | 600 − under_cabinet |
| Yirgacheffe Bean (bag) | 566 | 566 − under_cabinet |
| Whipping Cream (box) | 1000 | (non_coffee × 1000) + canister(from Closing's own canister calc, §A.2) |

The resulting `loose` then continues into the existing Closing formula (§A.1 stage 4): `loose_sum = loose / bag_size_g`.

## A.8 Item → tab membership (from `Counting (2).xlsx`, optimized flow)

`appears_in` is derived directly from which tabs of `Counting (2).xlsx` list the item. Material Expired now means "Loss list" only (§A.6); the former Inventory items appear in Closing instead (§A.7).

**Back** (50 items) — every item below appears in Back:
- *Packaging:* Drinking Lid, 24oz Ice Cup, 20oz Double Wall Cup, Common Cup Holder, 12oz SOE Hot Cup, 12oz SOE Ice Cup, 12oz SOE Hot Lid, 12oz D Drinking Lid, Cup Sleeve, 16oz Flat Lid, Dome Lid, 16oz Hot Lid, 16oz Hot Cup, 16oz Ice Cup, Double Cup Paper Bag, Single Cup Paper Bag, Soda Water (can)
- *Syrup:* Lime Concentrate, Seasalt Syrup, Original Syrup, Sakura Syrup, Vanilla Syrup, Caramel Syrup, Pistachio Sauce (Souflle Syrup excluded — not part of this app's item list; Pineapple Syrup also no longer appears in `Counting (2).xlsx`)
- *Solid Beverage:* Sea Salt Cheese, Blue Velvet Base, Pandan, Ceylon Black Tea, Jasmine Tea, Cocoa Flavoured, Matcha Flavoured, Matcha 1000, Original Smoothie
- *Coffee Bean:* Italian Bean, Yirgacheffe Bean, Cream Charger
- *Frozen:* Hanjuku, Frozen Mix Grape, Strawberry, Frozen Orange Pulp, Frozen Coconut
- *Raw Material:* UHT Milk, Coconut, Velvet Base, Milky Bev, Butter Flavour, Oat Milk, Coconut Jelly, Coconut Cream
- *Merch:* Coconut Keychain

**Front** (17 items): 16oz Ice Cup, 16oz Hot Cup, Velvet Base, Milky Bev, Butter Flavour, Oat Milk, Cocoa Flavoured, Matcha Flavoured, Matcha 1000, Original Smoothie, Single Cup Paper Bag, Double Cup Paper Bag, Common Cup Holder, Cup Sleeve, Dome Lid, 16oz Flat Lid, 16oz Hot Lid

**Material Expired — Loss only** (14 items, see §A.6/§A.9): Pandan, Matcha, Matcha 1000, Chocolate, Ceylon, Jasmine, Milk, Soda, Cheese Cap, Coconut Cheese Cap (10 input cards), plus SeaSalt Cheese, Cream, Coconut Cream, Frozen Coconut Juice (4 summary-only rows derived from Cheese Cap / Coconut Cheese Cap). These items are **Material-Expired-only** — they do not have Back/Front/Closing/Sheet2 rows (except where the same name also appears as a separate Back/Closing item, e.g. "Coconut Cream (box)" in Raw Material is a distinct item from Loss's "Coconut Cream", and "Sea Salt Cheese (bag)" also appears in Back/Closing).

**Closing** (51 items): same as Back, plus Whipping Cream (box) — i.e. Whipping Cream has no Back/Front row in `Counting (2).xlsx` but does have a Closing + Sheet2 row, plus its 13-item inventory calc (§A.7).

**Sheet2 / Final**: mirrors the Closing item set (51–52 items; verify exact set against the xlsx during implementation — at minimum every Closing item must have a Sheet2 row, per E-03).

## A.9 Cheese Cap / Coconut Cheese Cap split model (NEW, replaces Cream/Milk-Cheese/Seasalt-Coconut sub-items)

Staff don't throw away Cream, Milk-in-cheese, and SeaSalt Cheese premix separately — they're scraped together and thrown as one **Cheese Cap** of combined waste. Likewise Coconut Cream, Frozen Coconut Juice, and Seasalt (Coconut variant) are thrown together as one **Coconut Cheese Cap**. Material Expired therefore has **10 input cards** and a **12-row summary**:

**10 inputs:** Pandan, Matcha, Matcha 1000, Chocolate, Ceylon, Jasmine (unchanged `multiply` items, §A.6) — Milk, Soda (plain weight, no container), Cheese Cap, Coconut Cheese Cap (new; weighed gross in a container, default pitcher 286g, tare subtracted like other Loss items, §A.6).

**12-row summary:** the same 6 unchanged items, plus SeaSalt Cheese, Cream, Coconut Cream, Frozen Coconut Juice, Milk, Soda — where the last 6 are derived/echoed from the inputs above.

**Split rates** (sum to 1 within each cap — same numeric rates previously used for the now-removed `cream_cheese_premix`/`milk_cheese_premix`/`seasalt_coconut` items):

```
Cheese Cap split:
  Cream            = Cheese Cap × 1/3
  Milk (in cheese) = Cheese Cap × 8/15
  SeaSalt Cheese share #1 = Cheese Cap × 2/15

Coconut Cheese Cap split:
  Coconut Cream         = Coconut Cheese Cap × 0.8860759494
  Frozen Coconut Juice  = Coconut Cheese Cap × 0.07594936709
  SeaSalt Cheese share #2 = Coconut Cheese Cap × 0.03797468354

SeaSalt Cheese (summary) = SeaSalt Cheese share #1 + SeaSalt Cheese share #2
Milk (summary)           = Milk (own weighed input) + Milk (in cheese)
```

- `Cream`, `Coconut Cream`, `Frozen Coconut Juice`, `SeaSalt Cheese` have **no own input** — summary-only rows (`loss_role: "summary"`).
- `Milk` has its own input **and** a summary row that adds the Cheese Cap share (`loss_role: "input_and_summary"`).
- `Soda`, `Cheese Cap`, `Coconut Cheese Cap` use `loss_formula: "direct"` (result = total_volume, no rate). `Soda` has no container (`total_volume = gross_weight`); `Cheese Cap`/`Coconut Cheese Cap` have `default_container_id: "pitcher"` (`total_volume = gross_weight − 286`).
- Whenever Cheese Cap or Coconut Cheese Cap is edited, the app recomputes every dependent summary row automatically (`useCountingStore.setMaterialLoss`).
- The whipping-cream canister calculator (§A.2) is **not** part of this model — it lives in Closing and represents cream still in usable canisters, not waste.

## A.10 Closing "Bag/Bottle/Ctn" row — factor always comes from `/admin/items` (NEW 2026-06-15)

Key rule: the "1 unit" quantity used in Closing's box/bag/bottle row must always be readable from `/admin/items` (`per_bag_pcs`, `per_box_pcs`, `bag_size_g`) — never a hidden seed-only constant.

```
box_factor = item.closing_per_box_pcs ?? item.per_bag_pcs ?? item.per_box_pcs
box_sum    = box_count × box_factor
total      = loose_sum + box_sum
```

- **Plain count items** (Packaging cups/lids, Cream Charger, UHT Milk, Soda Water, etc.): no `closing_per_box_pcs` set, so `box_factor = per_bag_pcs` (admin's "Pcs/bag" / "/bag" field) — falling back to `per_box_pcs` only for true cartons with no bag breakdown (Dome Lid, Hot Lid, Hot Cup, paper bags, Hanjuku, keychains/plushies). The row is labelled **"Bag"** when `per_bag_pcs` is the source, **"Ctn"** otherwise.
  - Example (Flat Lid: 1 ctn = 10 bags = 100 pcs/bag): `total = loose_pcs + bags × 100`. Verified via preview: loose=50, bags=3 → `50 + 3×100 = 350 pcs`.
- **Bottle/bag loose_grid items** (Syrups, Frozen items, Cocoa Flavoured, Coconut/Velvet/Milky-Bev cartons): `closing_per_box_pcs` stays explicit (usually `1`, matching the `bag_size_g` denominator already used by `loose_sum`). The row is labelled **"Bottle"** or **"Bag"** based on the item's `(bottle)`/`(bag)` name suffix (or `unit`), so the row reads "Bottles × 1 = Sum" / "Bags × 1 = Sum" instead of the generic "Ctn". Added `closing_per_box_pcs: 1` to Lime Concentrate, Seasalt Syrup, and Caramel Syrup so all 6 Syrup-category bottle items now show this row consistently (previously only 3 of the 6 had it).
- Removed the seed-only `closing_per_box_pcs` overrides that didn't match `per_bag_pcs` for: 24oz Ice Cup, 20oz Double Wall Cup, SOE Hot Cup/Ice Cup/Hot Lid 12oz, D Drinking Lid 12oz, Soda Water, Cream Charger, UHT Milk, Drinking Lid, Common Cup Holder, Cup Sleeve, Flat Lid, 16oz Ice Cup — these now derive their factor from `per_bag_pcs` per the rule above (some values changed, e.g. UHT Milk 8→12, D Drinking Lid 1→50, Soda Water 1→24 — the new values match admin's "/bag" field).

## A.11 Closing per-category restructuring (NEW 2026-06-15)

Following the user's category-by-category spec, Closing now distinguishes
"loose only" items (no Bag/Ctn/Bottle row at all) from items that combine a
loose measurement with a box/bag/stack count, and adds two new entry shapes
(container-tare and stack+loose). Three new `Item` fields and two new
`ClosingEntry` fields support this:

- `closing_box_row: boolean` — when `false`, the Bag/Ctn/Bottle row (§A.10) is
  hidden entirely; the item is loose-only. Default `true`.
- `closing_container_input: boolean` — when `true` (only with
  `closing_inventory_formula: "non_coffee"`), the `non_coffee` value is not
  typed directly but derived from a container-tare entry: staff pick the
  container used (default preselected via `default_container_id`) and weigh
  the item **with the container still on**; `non_coffee = gross_weight −
  container.tare_g`, then `loose = inventory_bag_size_g − non_coffee` as
  before (§A.7).
- `closing_inventory_formula: "stack_box"` (new variant) + `unopened_stack_size:
  number | null` — for Raw Material box-counted items: staff enter the number
  of full unopened stacks and any extra loose boxes;
  `box_total = unopened_stacks × unopened_stack_size + unopened_loose_pcs`.
  If the item also has `bag_size_g`, an additional loose-weight row converts
  grams to a fractional box (`loose_sum = loose_g / bag_size_g`), and
  `total = box_total + loose_sum`. If not (e.g. UHT Milk), `total = box_total`
  only.
- `ClosingEntry.container_id` / `ClosingEntry.gross_weight` — the
  container-tare entry's selected container and weighed gross value (feeds
  `closing_container_input` above).

**Per-category results:**

- **Packaging, Syrup, Soda Water, Merch, Coffee Bean (bag), Hanjuku**: all
  set `closing_box_row: false` — these are now **loose only**, with no
  Bag/Ctn/Bottle row and no box-count check line. (Coffee Bean and Hanjuku
  also have `closing_inventory_formula: null` — no `under_cabinet`/`non_coffee`
  calc, just a plain loose entry.)
- **Solid Beverage — "solid powder" group**:
  - Pandan, Ceylon Black Tea, Jasmine Tea, Sea Salt Cheese: now **loose only**
    (`closing_inventory_formula: null`, `closing_box_row: false`) — the old
    `non_coffee`/`under_cabinet` inventory calc for these 4 items was removed.
  - Blue Velvet Base, Pistachio Sauce, Matcha Flavoured, Original Smoothie:
    keep `closing_inventory_formula: "non_coffee"` but switch to
    `closing_container_input: true` — staff select a container and enter the
    gross weight; `non_coffee = gross − tare`, `loose = inventory_bag_size_g −
    non_coffee` (same formula as before, different input UI). All four are
    `closing_box_row: false` (loose only beyond the inventory calc), except
    Matcha 1000 below.
  - Cocoa Flavoured: unchanged ("coco, bag + loose") — still
    `closing_inventory_formula: "non_coffee"` with a direct numeric
    `non_coffee` input, plus the Bag row.
  - Matcha 1000: unchanged ("loose + bag") — `closing_inventory_formula:
    "non_coffee"` direct numeric input, plus the Bag row.
- **Coffee Bean (2 beans)**: loose grams only, no calc (`closing_box_row:
  false`, `closing_inventory_formula: null`); Hanjuku: loose pcs only, no calc.
- **Frozen**: unchanged — bottle/bag row (no calc) + loose grams
  (`closing_box_row: true`, `closing_inventory_formula: null`). Verified
  example: 5 bottles + 640g loose (bag_size_g 1000) → `5 + 0.640 = 5.6 bottle`.
- **Raw Material — `"stack_box"` group**:
  - UHT Milk: `unopened_stack_size: 4`, `closing_input_type: "count"`,
    `closing_box_row: false`, **no loose row** (`bag_size_g: null`) —
    `total = stacks × 4 + extra` boxes only.
  - Coconut: `unopened_stack_size: 4`, `bag_size_g: 1000`,
    `closing_input_type: "weight"` — `total = (stacks × 4 + extra) +
    loose_g/1000`. Verified example: stacks=6, extra=3, loose=420g →
    `27 + 0.420 = 27.420 box`, matching `[(4×6)+3] + 420g = 27.4box`.
  - Velvet Base, Milky Bev, Butter Flavour, Oat Milk: `unopened_stack_size: 2`,
    `bag_size_g: 1000`, same `stack_box` + loose formula as Coconut but with a
    2-per-stack box size.
  - Coconut Jelly, Coconut Cream: **no box calc, loose only**
    (`closing_inventory_formula: null`, `closing_box_row: false`,
    `bag_size_g: 1000`) — `total = loose_g / 1000`.

## A.12 Closing follow-up corrections (NEW 2026-06-15)

Three corrections to §A.11, per user review of the live Closing page:

- **Syrup (all 6 bottle items)**: `loose_grid: false` — these are now plain
  "key in loose ml, no calc" items (just a single Loose input → `loose_sum =
  loose / bag_size_g`), removing the old Rows×Lines+Loose grid entry.
- **Pistachio Sauce**: the previous `non_coffee`/`inventory_bag_size_g(513)`
  formula was wrong. Pistachio Sauce is **only** a container-tare entry —
  `loose = gross_weight − container.tare_g` directly (no subtraction from an
  inventory bag size), then `loose_sum = loose / bag_size_g(300)`. New
  `closing_inventory_formula: "container_direct"` formula variant implements
  this (`loose = non_coffee = gross − tare`, skipping the
  `inventory_bag_size_g − non_coffee` step used by plain `"non_coffee"`).
  Also: `loose_grid: false`, `closing_box_row: false` (the old Bag×30 row was
  unintentionally still showing), `default_container_id` changed from
  `"squeezer"` to `"powder_container"` (191g tare), and the unused
  `inventory_bag_size_g: 513` removed. Verified: gross=800 → `800 − 191 = 609g
  → 609/300 = 2.030 ml`, matching `[user input] − container = pistachio/300`,
  `800 − 191 = 609 / 300 = 2.03 bag`.
- **Cocoa Flavoured, Matcha Flavoured, Matcha 1000, Original Smoothie**:
  inventory calc unchanged (still `"non_coffee"`, with/without
  `closing_container_input` as set in §A.11), but all four now get
  `closing_box_row: false` — the "×bag" Bag-count row is removed; `total` is
  the inventory `loose_sum` only.
- **Frozen (all 4 bottle items)**: `loose_grid: false` — now two simple
  inputs, "key in ml" (plain loose, `loose_sum = loose / bag_size_g(1000)`)
  and "bottles" (`box_count`, `closing_per_box_pcs: 1`, unchanged from
  §A.10/A.11), `total = loose_sum + box_count`. Verified: loose=300,
  bottles=5 → `0.300 + 5 = 5.300 bottle`, matching `300ml + 5 bottle = 5.6
  bottle` pattern (5 + 0.3 = 5.3; the user's "5.6" example used 640g, i.e.
  0.640 + 5 = 5.640).

## A.13 Matcha/Original Smoothie inventory formula fix, Front cleanup, Cream Charger ctn size (NEW 2026-06-15)

Further corrections per user review:

- **Matcha Flavoured, Original Smoothie**: the `"non_coffee"` formula with
  `inventory_bag_size_g` (280 / 268) from §A.11 was wrong — those numbers had
  no basis. Replaced with a new `closing_inventory_formula:
  "container_plus_loose"`: `loose_sum = [user-entered Loose, in bag units] +
  (gross_weight − container.tare_g) / bag_size_g(300)`. Both items keep
  `closing_container_input: true` (container-tare selector) and
  `closing_box_row: false`; the unused `inventory_bag_size_g` was removed.
  (Cocoa Flavoured and Matcha 1000 are unaffected — still plain `"non_coffee"`
  per §A.11/§A.12.) See §A.14 for a correction to the unit of the "Loose" input.
- **Front tab cleanup**: removed `"front"` from `appears_in` (and the now-unused
  `front_per_box_pcs`) for all Solid Beverage items (Cocoa Flavoured, Matcha
  Flavoured, Matcha 1000, Original Smoothie) and all Raw Material items
  (Velvet Base, Milky Bev, Butter Flavour, Oat Milk). `/count/front` now shows
  Packaging items only.
- **Cream Charger**: `per_box_pcs` corrected from 400 to 360 — 1 ctn = 36
  sleeves × 10 pcs (was incorrectly 40 sleeves).

## A.14 Matcha/Original Smoothie "Loose" unit fix; remove Seasalt Syrup (NEW 2026-06-15)

- **Matcha Flavoured, Original Smoothie**: the §A.13 `"container_plus_loose"`
  formula treated the "Loose" input as grams (divided into the total along
  with the container weight). It should instead be entered directly **in bag
  units** and added on top of the container conversion:
  `loose_sum = [Loose, bags] + (gross_weight − container.tare_g) /
  bag_size_g(300)`. `calcClosing` now computes `loose_sum` directly for this
  formula (bypassing the generic `loose / bag_size_g` conversion), and the
  Closing page's "Loose" field is labeled by the item's unit (e.g. "Loose
  (bag)"). Verified: Loose=15, gross=520, container=Powder container(191) →
  `15 + (520 − 191)/300 = 15 + 1.097 = 16.097 bag`, matching `15bag + (520 −
  191) = 15bag + 329g; 329/300 = 1.097 bag; 15 + 1.097 = 16.097 bag`.
- **Seasalt Syrup**: removed entirely from `seedItems.ts` (was a loose-only
  Syrup bottle item per §A.12, `appears_in: ["back", "closing", "sheet2"]`) —
  no longer counted anywhere. The Syrup category's "loose-only bottle" group
  (§A.12) now has 5 items: Lime Concentrate, Original/Sakura/Vanilla/Caramel
  Syrup.

## A.15 Blue Velvet Base calc fix (NEW 2026-06-15)

- **Blue Velvet Base**: the §A.11 `"non_coffee"`/`inventory_bag_size_g(595)`
  formula was wrong. Changed to `closing_inventory_formula:
  "container_direct"` (same pattern as Pistachio Sauce, §A.12):
  `loose_sum = (gross_weight − container.tare_g) / bag_size_g(500)`. Removed
  the unused `inventory_bag_size_g: 595`. Verified: gross=500,
  container=Small pitcher(138) → `(500 − 138) / 500 = 0.724 bag`.
- **Ceylon Black Tea**: already matches the requested `loose / bag_size_g(300)`
  pattern (`closing_inventory_formula: null`, plain Loose entry per §A.11) —
  no change needed.

## A.16 Final (Sheet2) page reorder; new Coconut C / Coconut Refreshing items (NEW 2026-06-15)

- **Final page order**: the Final (`/count/result`, Sheet2) tab now displays
  its 53 rows in a fixed sequence specified by the user, independent of the
  Back/Front/Closing category-grouped order. Added `Item.final_sort_order:
  number | null` — when set, `/count/result` sorts by `final_sort_order`
  instead of `sort_order`; `sort_order` (and thus Back/Front/Closing display
  order) is unchanged. The new sequence (10–530, by tens) is: Italian Bean,
  Yirgacheffe Bean, UHT Milk, Coconut, Coconut C, Coconut Refreshing, Frozen
  Coconut, Oat Milk, Coconut Jelly, Coconut Cream, Velvet Base, Whipping
  Cream, Butter Flavour, Milky Bev, Caramel/Vanilla/Original/Sakura
  Syrup, Lime Concentrate, Pistachio Sauce, Cocoa Flavoured, Matcha
  Flavoured, Original Smoothie, Ceylon Black Tea, Jasmine Tea, Pandan, Sea
  Salt Cheese, Blue Velvet Base, Matcha 1000, Soda Water, Cream Charger,
  Frozen Orange Pulp, Frozen Mix Grape, Strawberry, Hanjuku, then all 16
  Packaging items (Drinking Lid → Single Cup Paper Bag), then Coconut
  Keychain, Coconut Plushie.
- **New items**: "Coconut C (box)" and "Coconut Refreshing (box)" — two new
  Raw Material items (`appears_in: ["back", "closing", "sheet2"]`), `unit:
  "box"`, `per_box_pcs: 12` (12 boxes per ctn), `bag_size_g: 1000` (1000ml per
  box). `sort_order` 432/434 (between Coconut at 430 and Velvet Base at 440)
  keeps them adjacent to Coconut on Back/Closing.
  - **Coconut C**'s Closing calc matches **Coconut**: `closing_inventory_formula:
    "stack_box"`, `unopened_stack_size: 4`, `per_bag_pcs: 30` —
    `Boxes = stacks×4 + extra`, plus `Loose(g)/1000 = loose sum`.
  - **Coconut Refreshing**'s Closing calc matches **Coconut Jelly**: plain
    loose-only entry, `loose_sum = loose(g) / bag_size_g(1000)`.

## A.17 Autosave persistence, category quick-nav, equation inputs (NEW 2026-06-16)

- **Autosave / daily reset**: `useCountingStore`'s `record` (Back, Front,
  Material Expired, Closing, Sheet2) is now persisted to
  `localStorage["luckin_counting"]` as `{ date, record }` after every
  `setBack`/`setFront`/`setMaterialLoss`/`setClosing` call. `loadDate(date)`
  restores the stored record when its `date` matches today's
  (`todayYYMMDD()`); otherwise it starts a fresh `emptyRecord(date)` — so a
  page reload mid-day keeps all entered values, and the record naturally
  resets once the date rolls over. This replaces the old behavior where every
  reload wiped Back/Front/Material Expired/Closing/Sheet2 back to empty.
- **Category quick-nav (Back, Closing, Final)**: each of these three pages now
  renders a sticky horizontal row of category buttons (`CategoryNav`,
  `src/components/CategoryNav.tsx`) above the item list/table. Clicking a
  category name smooth-scrolls to that category's section. Each
  `.category-label` (Back/Closing) or category divider row (Final's result
  table) gets an `id="cat-<slugified-category>"` anchor. Front and Material
  Expired are unchanged (not in scope).
- **Equation-capable numeric inputs (all stages)**: every editable numeric
  input on Back, Front, Material Expired, and Closing now uses
  `NumericInput` (`src/components/NumericInput.tsx`), which accepts either a
  plain number or an arithmetic expression (e.g. `2*3`, `8+9`,
  `[12.5/2]` — brackets optional). On blur/Enter, `evalExpression`
  (`src/lib/expr.ts`, a small recursive-descent `+ - * / ()` parser, no
  `eval()`) computes the result and replaces the displayed text with the
  numeric value, which then feeds the normal calc/store pipeline. Invalid
  expressions revert to the last valid value. Read-only `.auto` (derived)
  fields are unchanged — still plain `<input disabled>`.

## A.18 Back "Loose" stack_box formula (UHT Milk/Coconut/Coconut C); sticky category labels (NEW 2026-06-16)

- **Back "Loose" row, `back_loose_formula: "stack_box"`**: for **UHT Milk
  (pack)**, **Coconut (box)**, and **Coconut C (box)** — the only `back`-stage
  items that have both `per_bag_pcs` set and a `closing_inventory_formula:
  "stack_box"` with `unopened_stack_size: 4` — the Back "Loose" row no longer
  uses `Bags × per_bag_pcs = Sum`. Instead it mirrors the Closing stack/box
  calc for the same item: `Stacks × unopened_stack_size (4) + Loose = Sum`
  (`calcBack` in `src/lib/calculations.ts`). `BackEntry.loose_extra` stores the
  "Loose" input; `open_bags` is reused as "Stacks". All other Back items
  (no `back_loose_formula`) are unchanged.
- **Sticky category labels (Back/Closing/Final)**: `.category-label` is now
  `position: sticky; top: 82px` (below the sticky `.topbar` at 0–51.5px and
  `.category-nav`, now `top: 52px`, at 52–82.5px), so the current category's
  label stays pinned at the top of the viewport while scrolling through that
  category's items, then is replaced by the next category's label once its
  section begins.

## A.19 Back-row fixes: Ceylon bag size, hidden Loose rows, Coconut Cream stack_box (NEW 2026-06-16)

- **`Item.back_loose_formula`** gained a third value, `"hidden"` (now
  `"stack_box" | "hidden" | null`): the Back "Loose"/"Count" row is omitted
  entirely (item shows only its Ctn row), and `calcBack` forces `bag_sum:
  null` for these items. The §A.18 "stack_box" branch's second field is now
  labelled **"Loose"** (was "Extra") for consistency with this naming.
- **Ceylon Black Tea (g)**: added `per_bag_pcs: 300` — the Back "Loose" row
  was previously a bare "Count → Units" field whose value was used directly as
  grams, undercounting by the 300g/bag conversion. It now reads
  `Bags × /bag (300) = Sum`, matching its `g` unit and `bag_size_g: 300`.
  **Superseded by §A.20** the same day — see below.
- **Velvet Base / Milky Bev / Butter Flavour (box)**: set
  `back_loose_formula: "hidden"` — these Raw Material items have no
  meaningful "Loose"/"Count" input on Back (only counted by the carton), so
  the row is removed; only the "Ctn: Boxes × /box = Sum" row remains.
- **Coconut Cream (box)**: set `back_loose_formula: "stack_box"`
  (`unopened_stack_size` unset → defaults to 4) — its Back "Count" row is now
  `Stacks × /stack (4) + Loose = Sum`, same pattern as UHT Milk/Coconut/Coconut
  C. Verified via `npx tsc --noEmit` and preview: Ceylon shows "Bags × /bag
  (300) = Sum"; Velvet Base/Milky Bev/Butter Flavour show only the Ctn row;
  Coconut Cream Stacks=3/Loose=2 → `3 × 4 + 2 = 14 box`.

## A.20 Ceylon Black Tea Back calc revised: bag-count Loose + Ctn×20, total ×300 (NEW 2026-06-16)

- **`Item.back_loose_formula`** gained a fourth value, `"bag_count"` (now
  `"stack_box" | "hidden" | "bag_count" | null`). For **Ceylon Black Tea (g)**
  (replacing the §A.19 `per_bag_pcs: 300` approach):
  - The Back "Loose" row is a plain bag-count input — `Loose: Bag = [input]`,
    no multiplication shown (`per_bag_pcs` is `null`, so `calcBack`'s
    whole-unit fallback sets `bag_sum = open_bags` directly).
  - The Back "Ctn" row is unchanged: `Boxes × /box (20) = Sum` (`box_sum =
    box_count × 20`), still counted in bags.
  - `calcBack`'s `total` becomes `(bag_sum + box_sum) × bag_size_g` when
    `back_loose_formula === "bag_count"` — i.e. `(Loose + Ctn×20) × 300` —
    converting the combined bag count to grams. The check line shows
    `(loose + ctn_sum) × bag_size_g = total g`, and the generic
    `checkParts.join(" + ") = total` line is suppressed for this item (it
    would be wrong post-multiplication).
  - `seedItems.ts`: `ceylon_black_tea` now has `back_loose_formula:
    "bag_count"` and no `per_bag_pcs` (back to `null`); `per_box_pcs: 20` and
    `bag_size_g: 300` unchanged. Verified via `npx tsc --noEmit` and preview:
    Loose=2, Ctn=1 → `(2 + 20) × 300 = 6600 g`.

# §B. Full reference — original COUNTING_RULES.md

> **Last updated:** 2026-06-11
> **Source file:** `Counting (1).xlsx`

## B.1 Overview

Daily inventory counting captures the stock remaining at the end of each operation day. The final result is consolidated in **Sheet2 (Final Result)** which is the only sheet to be keyed into the system.

**Final formula:** `Sheet2 Total = Back + Front + Closing`

## B.2 Counting Stages & Flow

```
[Start of Day / Before Service]
        │
        ▼
  STAGE 1: BACK (Store Room)
  Count all daily-consuming items in the store room.
  - Open bags: count number of open bags → sum = open × per_bag_pcs
  - Full boxes/cases: count boxes → sum = box × per_box_pcs
  - Total = open_bag_sum + box_sum
        │
        ▼
  STAGE 2: FRONT (Bar Area)
  Count items already placed at the bar (may not all be used today).
  - Count by box/unit only (no loose items at this stage)
  - Total = box_count × per_box_pcs
        │
        ▼
  STAGE 3: MATERIAL EXPIRED (During / End of Service)
  Items made into premix/products that did NOT finish within operating hours.
  These are physically disposed of, but must be measured first.
  Two sub-sections:
    A. LOSS — measure ml/g in each container being thrown → derive powder/ingredient wasted
    B. INVENTORY — measure remaining amount in open working containers →
       derive how much of the bag has been used (bag_size − remaining = result)
  Results feed into the Closing loose measurements.
        │
        ▼
  STAGE 4: CLOSING (After Operations End)
  Count everything physically remaining after service.
  - Loose (ml/g or individual pcs): converted to bag/box units for continuity
    - For powder/liquid: loose_sum = loose_g / bag_size_g  (= fraction of a bag)
    - For pcs items (cups, lids, etc.): loose_sum = loose count (direct)
    - For items measured per pack (cream charger): loose_sum = open_sleeves × pcs_per_sleeve
  - Full boxes: box_sum = box_count × per_box_pcs
  - Total = loose_sum + box_sum
  - ⚠ All fields CAN be empty during counting (trigger warning only, not hard block)
        │
        ▼
  STAGE 5: SHEET2 — FINAL RESULT (Auto-consolidated)
  Total = Back + Front + Closing
  This is the only sheet submitted to the system.
```

## B.3 Sheet-by-Sheet Rules

### B.3.1 Back Sheet

| Column | Description | Formula |
|--------|-------------|---------|
| per_bag_pcs | Pieces per open bag (use `-` if item sold as individual unit) | — |
| open | Number of open bags counted | — |
| open_sum | Total loose pieces | `open × per_bag_pcs` |
| per_box_pcs | Pieces per sealed box/case | — |
| box | Number of full boxes | — |
| box_sum | Total from boxes | `box × per_box_pcs` |
| total | Grand total | `open_sum + box_sum` |

**Rule:** If `per_bag_pcs` is `-`, the item is counted in whole units (bottles, bags as units). Enter the count directly in the sum column.

### B.3.2 Front Sheet

| Column | Description | Formula |
|--------|-------------|---------|
| per_box_pcs | Pieces per box placed at bar | — |
| box | Number of boxes at bar | — |
| total | Total pieces | `box × per_box_pcs` |

### B.3.3 Material Expired Sheet

#### Section A — Loss (Thrown Premix)

Measures the ingredient equivalent wasted when a premix container is disposed of.

| Column | Description | Notes |
|--------|-------------|-------|
| Product | Premix/product name | — |
| total | Total volume/weight in the container being thrown (ml or g) | — |
| rate | **Context-dependent** (see below) | ⚠ Inconsistent usage |
| result | Calculated waste | See formulas below |

**Rate column usage (3 different modes — must be documented per item):**

| Mode | Items | Formula |
|------|-------|---------|
| Proportion rate | Chocolate, Matcha, Matcha 1000, Ceylon, Jasmine, SeaSalt(Cheese), Cream(Cheese) | `result = total × rate` |
| Container subtraction | Cream | `result = total − rate` (rate = ml remaining in canister) |
| Addend | Milk | `result = total + rate` (rate = Milk-Cheese result, adds milk from cheese premix) |

**Right-side container measurements** (cols 8–9): physical measurement of each container before disposal.

| Container | Measured (ml) |
|-----------|---------------|
| pitcher | 286 |
| jug | 281.5 |
| powder container | 191 |
| squeezer | 31.5 |
| canister | 694 |
| small pitcher | 138 |
| coffee tupperware | 268 |

#### Section B — Inventory (Remaining in Working Containers)

Measures what is left in open working containers to determine how much of the bag has been used.

**Formula:** `result = bag_size − under_cabinet − non_coffee`

| Item | Bag size (g) | Formula |
|------|-------------|---------|
| Matcha | 280 | 280 − non_coffee |
| Pistachio | 513 | 513 − non_coffee |
| Original Smoothie | 268 | 268 − non_coffee |
| Blue Velvet | 595 | 595 − non_coffee |
| Italian Bean | 600 | 600 − under_cabinet |
| Yirgacheffe Bean | 566 | 566 − under_cabinet |
| Whipping Cream | 1228 | 1228 − canister(694) − non_coffee(20) = 514, then subtract cherry allocation(50) → **464g remaining** |

**The Inventory result values feed directly into Closing as the `loose` (g) measurement.**

### B.3.4 Closing Sheet

Items counted per remaining physical stock after closing.

- Liquid/powder items: `loose` = measured grams/ml → `loose_sum = loose / bag_size`
- Piece items: `loose` = count → `loose_sum = loose` (direct)
- Cream Charger (REVISED 2026-06-15): `loose` = loose pcs (direct, `loose_sum = loose`); the "Ctn" row's
  `closing_per_box_pcs` is 10 (1 sleeve = 10 pcs), so `total = loose + box_count × 10`
- Loose-only items (NEW 2026-06-15, §A.11): Packaging, Syrup, Soda Water,
  Merch, Coffee Bean, Hanjuku — `closing_box_row: false`, no Bag/Ctn/Bottle
  row; `total = loose_sum` only.
- Container-tare inventory items (NEW 2026-06-15, §A.11): Blue Velvet Base,
  Pistachio Sauce, Matcha Flavoured, Original Smoothie — staff pick a
  container and weigh gross (with container on); `non_coffee = gross −
  container.tare_g`, then `loose = inventory_bag_size_g − non_coffee` as in
  §A.7.
- Raw Material `"stack_box"` items (NEW 2026-06-15, §A.11): UHT Milk, Coconut,
  Velvet Base, Milky Bev, Butter Flavour, Oat Milk — `unopened_stacks ×
  unopened_stack_size + unopened_loose_pcs` gives a whole-box count; Coconut
  and the four Raw Material flavour bases also add `loose_g / bag_size_g`.
  Coconut Jelly and Coconut Cream are loose-only (no stack/box calc).

### B.3.5 Sheet2 (Final)

Auto-sum: `Total = Back + Front + Closing`

Items not present in a stage are treated as **0** (not NaN).

## B.4 Standard Loss Rates

| Item | Rate | Notes |
|------|------|-------|
| Chocolate | 0.5 (50%) | `multiply` |
| Matcha | 2/7 ≈ 0.2857 | `multiply` |
| Matcha 1000 | 1/3 ≈ 0.3333 | `multiply` |
| Ceylon Black Tea | 1/20 = 0.05 | `multiply` |
| Jasmine Tea | 1/20 = 0.05 | `multiply` |
| Pandan | 2/7 ≈ 0.2857 | `multiply` |
| Soda, Cheese Cap, Coconut Cheese Cap | — (n/a) | `direct`, plain weight in/out |
| Cream | Cheese Cap × 1/3 | `components`, see §A.9 |
| Milk (in cheese share) | Cheese Cap × 8/15 | `components`, added to Milk's own input, §A.9 |
| SeaSalt Cheese | Cheese Cap × 2/15 + Coconut Cheese Cap × 0.03797468354 | `components`, §A.9 |
| Coconut Cream | Coconut Cheese Cap × 0.8860759494 | `components`, §A.9 |
| Frozen Coconut Juice | Coconut Cheese Cap × 0.07594936709 | `components`, §A.9 |

## B.5 Confirmed Errors

### E-01 ⛔ Closing — UHT Milk: Box Sum Mismatch
- **Location:** Closing sheet, row 26 (UHT Milk)
- **Expected:** `box(7) × per_box_pcs(8) = 56`
- **Actual recorded:** 59
- **Discrepancy:** +3 packs
- **Impact:** Sheet2 UHT Milk Total is **over by 3** (shows 63, should be 60)
- **Action:** Recount UHT Milk boxes or verify if per_box_pcs should be different

### E-02 ⛔ Closing — Whipping Cream: Box Sum Mismatch
- **Location:** Closing sheet, row 35 (Whipping Cream)
- **Expected:** `box(9) × per_box_pcs(8) = 72`
- **Actual recorded:** 74
- **Discrepancy:** +2 boxes
- **Impact:** Sheet2 Whipping Cream Total is **over by 2**
- **Action:** Recount whipping cream boxes

### E-03 ⛔ Sheet2 — Pineapple Syrup Missing
- **Location:** Pineapple Syrup is in the Closing sheet (0.4 bottles) but **has no row in Sheet2**
- **Impact:** Pineapple Syrup stock is **completely omitted** from the final system entry
- **Action:** Add Pineapple Syrup row to Sheet2

### E-04 ⛔ Material Expired — Cream Loss: Rate Column Misuse
- **Location:** Material Expired, Loss section, Cream row
- **Issue:** `rate = 694` (a container volume in ml) — formula used is `total − rate = result` (800 − 694 = 106), NOT `total × rate`
- **Impact:** If someone applies the standard formula (total × rate), they get 555,200 — completely wrong
- **Action:** Rename the column for this row or add a note; use a dedicated "subtraction" column

### E-05 ⛔ Material Expired — Milk Loss: Rate Column Misuse
- **Location:** Material Expired, Loss section, Milk row
- **Issue:** `rate = 106.6667` (copied result from Milk-Cheese row) — formula used is `total + rate = result` (500 + 106.667 = 606.667), NOT `total × rate`
- **Impact:** If the rate is misread as a proportion, the calculation is completely wrong
- **Action:** Rename the column or add a note; use a dedicated "add-from-cheese" column

### E-06 ⛔ Material Expired — Cream Inventory Formula Opaque
- **Location:** Material Expired, Inventory section, Cream row (row 32)
- **Issue:** `result = 514` but `1228 − 20 = 1208 ≠ 514`. Correct formula requires subtracting canister value (694) from the Loss section: `1228 − 694 − 20 = 514`, but this cross-reference is **not visible in the Inventory section**
- **Impact:** Formula cannot be audited without referencing Loss section
- **Action:** Either move 694 into the Inventory section, or add a cross-reference note

## B.6 Suspected Errors

### S-01 ⚠ Material Expired — Pandan: No Measurement Recorded
- **Location:** Material Expired, Loss section, Pandan row
- **Issue:** `rate = "- container"` and `result = NaN` — the Pandan container was thrown without measuring the volume
- **Impact:** Pandan waste is unknown; cannot be reconciled
- **Action:** Staff must measure Pandan container before disposal

### S-02 ⚠ Material Expired — Cherry Rows: Negative and Zero Results
- **Location:** Material Expired, Inventory section, rows 35–36 (cherry)
- **Issue:** Row 35 `result = −50` (negative inventory), Row 36 `result = 0` with the same starting value (694)
- **Likely interpretation:** 50g cherry-flavored cream allocated, reducing final whipping cream to 514 − 50 = 464g (matches Closing loose = 464g)
- **Action:** Clarify the cherry allocation formula and label these rows clearly; confirm the −50 is intentional

### S-03 ⚠ Back — UHT Milk & Coconut: Open Bags Not Filled
- **Location:** Back sheet, UHT Milk (row 44) and Coconut (row 45)
- **Issue:** `open = NaN` but `open_sum` has a non-zero value (4 and 18 respectively). The sum was manually entered, bypassing the `open × per_bag_pcs` formula
- **Impact:** Cannot verify if the sum is correct; formula chain broken
- **Action:** Staff should fill the `open` count, not just the sum

### S-04 ⚠ Sheet2 — Whipping Cream: Back and Front Counts Missing (NaN)
- **Location:** Sheet2, Whipping Cream row
- **Issue:** `Back = NaN`, `Front = NaN` — no counts were entered for these stages
- **Impact:** Sheet2 Total for Whipping Cream = Closing only. If there was whipping cream in Back or Front, it is missed
- **Action:** Verify Whipping Cream was 0 at Back and Front, and replace NaN with 0

### S-05 ⚠ Material Expired — Matcha Loss Rate Verification
- **Location:** Material Expired, Loss section, Matcha row
- **Rate recorded:** 2/7 ≈ 0.285714
- **Query:** Is 2/7 the correct standard Matcha loss rate, or was this calculated from a specific batch measurement?
- **Action:** Confirm with operations manager this is the approved rate

### S-06 ⚠ Closing — Jasmine, Ceylon, Pandan, Seasalt, Cocoa, Matcha 1000 All Zero
- **Location:** Closing sheet, rows 17–21
- **Issue:** All six items show `loose = NaN` and `total = 0` in Closing, but these items had measurements in the Material Expired Inventory section (NaN = not measured)
- **Impact:** If any of these were in open containers at closing, they are unaccounted for
- **Action:** Verify with staff whether these containers were truly empty at closing

## B.7 App Design Notes

> See `appflow.md` for the full app architecture document. Key rules for app implementation:

- **Sheet2 is auto-generated** — never allow direct input into Sheet2; it must be calculated from Back + Front + Closing
- **Closing fields must allow empty** with a warning prompt before final submission
- **Material Expired rate column** must be replaced with clearly labeled formula cells per item (`multiply`, `direct`, or `components` — §A.9)
- **Material Expired container measurement** must let staff pick a container preset (§A.6) and enter the gross weight; the app subtracts the tare automatically — staff should never need to do this subtraction by hand
- **Material Expired is Loss-only** (§A.6/§A.8/§A.9) — the former Inventory sub-section now lives inline on the relevant Closing item cards (§A.7); the whipping-cream canister calculator (§A.2) also lives in Closing
- File saved to Google Drive as `YYMMDD.xlsx` upon final approval by admin
- Admin can CRUD all items and sections (except stage names/order)
- Delete workflow: component → confirmation warning → confirmed delete

## B.8 Change Log

| Date | Change | By |
|------|--------|----|
| 2026-06-11 | Initial document created from `Counting (1).xlsx` audit | Claude |
| 2026-06-11 | Extracted into countingflow.md working notes | Claude |
| 2026-06-12 | Combined COUNTING_RULES.md into countingflow.md; added §A.2 whipping cream pump calculator (Vanilla 4×5ml, Sakura 10×5ml, up to 5 variants summed) and §A.3 flexible row×line+loose counting | Claude |
| 2026-06-12 | Refined §A.2: user keys in each canister's weight directly (no separate cream/canister split, no 694 default); refined §A.3: row×line+loose applies to Raw Material, Syrup, Frozen categories | Claude |
| 2026-06-12 | Corrected §A.2: user keys in the canister's TOTAL (gross) weight; app derives cream-only weight as `total_weight − syrup_weight (pump_count×ml_per_pump) − empty_canister_weight (preset tare)`. `total_whipping_cream` is now cream-only | Claude |
| 2026-06-12 | Re-derived flow from `Counting (2).xlsx`: revised §A.1 stage 3 (Material Expired = Loss only, with container-tare selector) and stage 4 (Closing absorbs the former Inventory sub-section). Added §A.6 (container preset table: pitcher/jug/powder container/squeezer/canister/small pitcher/coffee tupperware with tare weights), §A.7 (13-item Inventory→Closing formula table), §A.8 (full Back/Front/Material-Expired-Loss/Closing/Sheet2 item membership; new item "Souflle Syrup (bottle)" replaces "Pineapple Syrup" which is no longer in the xlsx). Updated §B.7 app design notes accordingly | Claude |
| 2026-06-12 | Clarified §A.2: "max 5" means 5 canisters total including the 2 presets (Vanilla, Sakura), so up to 3 more can be added | Claude |
| 2026-06-12 | Implemented §A.1–§A.8 in code: `seedItems.ts` now has the full 60-item list (50 Back / 17 Front / 51 Closing+Sheet2 / 15 Loss-only), `pineapple_syrup` removed. Discovered Front's box-pcs constants differ from Back's for several shared items (Velvet Base, Milky Bev, Cup Sleeve, Common Cup Holder, Dome Lid, 16oz Flat/Hot Lid, Single/Double Cup Paper Bag, Butter Flavour, Oat Milk, Cocoa/Matcha/Matcha1000/Smoothie) — added `front_per_box_pcs` to the `Item` model (appflow.md §B.3) so Front uses its own per-box constant instead of Back's. 13 closing-inventory items now also carry `inventory_bag_size_g` (falls back to `bag_size_g`) since Italian/Yirgacheffe Bean and Whipping Cream use a different bag size for the inventory formula than for `loose_sum`. Note: bag sizes marked TBD (§A.7) for Matcha 1000/Jasmine/Ceylon/Pandan/SeaSalt/Cocoa use a 300g placeholder pending confirmation | Claude |
| 2026-06-15 | Confirmed standard loss rates (§B.4): Pandan now `loss_formula: "multiply"`, `loss_rate: 2/7` (same as Matcha Flavoured), default container = jug — removed the old "none"/S-01 hard-warning behavior (Pandan no longer needs a special-case warning in `calculations.ts`/`/count/expired`). Ceylon Black Tea and Jasmine Tea `loss_rate` changed from 0.45 to 1/20 (0.05) | Claude |
| 2026-06-15 | Restructured Material Expired loss model (§A.9): replaced `cream_cheese_premix`/`milk_cheese_premix`/`seasalt_coconut` with two new combined-waste inputs, "Cheese Cap" and "Coconut Cheese Cap" (`loss_formula: "direct"`). Added `LossFormula` variants `"direct"` and `"components"` (replacing `"subtract"`/`"add"`) and `Item.loss_components`/`loss_role`. Material Expired now has 10 input cards and a 12-row read-only summary; Cream, SeaSalt Cheese, Coconut Cream, Frozen Coconut Juice are summary-only rows derived from the two caps, and Milk = own input + Cheese Cap × 8/15. The whipping-cream canister calculator (§A.2) moved from Material Expired's "Cream" card to the Closing page's Whipping Cream card (`ClosingEntry.whipping_cream`), and now feeds the Whipping Cream inventory formula (§A.7) directly instead of via Material Expired's old "Cream" subtract result. Also removed the last stale Pandan/S-01 warning leftover from `/count/closing` | Claude |
| 2026-06-15 | Two UI/calc refinements: (1) §A.1 stage 3 — multiply-formula Material Expired cards now display the rate inline in the row itself (`gross_weight − tare × rate = result`), removing the separate redundant check line. (2) §A.2/§A.7 — Whipping Cream's Closing card: replaced the fixed Vanilla+Sakura preset rows with a single starting canister row (up to 5) where each row has a Vanilla/Sakura flavour dropdown that live-switches the pump/syrup/tare preset (`WhippingCreamVariant.flavour`); added an "Unopened" calc (`stacks × 4 + loose_pcs = unopened_pcs`, `× bag_size_g(1000) = non_coffee`) that now derives `non_coffee` for the Whipping Cream inventory formula instead of a manual entry. New `ClosingEntry.unopened_stacks`/`unopened_loose_pcs` fields | Claude |
| 2026-06-15 | Whipping Cream follow-up (§A.1/§A.7): removed the Ctn row (`closing_per_box_pcs: 8`) from the Whipping Cream item — its total now comes only from the inventory `loose` calc. Also dropped the `× bag_size_g(1000)` step from the Unopened calc: `non_coffee = unopened_pcs` directly (Whipping Cream's unit is "box", same scale as the rest of its `loose` formula), so `1228 − canister − non_coffee − 50` now produces sane values (e.g. stacks=2/loose=3 → non_coffee=11 → 1228 − 530 − 11 − 50 = 637 g → 0.637 box) | Claude |
| 2026-06-15 | Whipping Cream: removed the leftover `1228` constant (§A.7) — it was the old "Section B" inventory bag size from `Counting (1).xlsx`, no longer meaningful after the Unopened/canister split. Formula is now `loose = (non_coffee × bag_size_g(1000)) + canister − cherry(50)`, i.e. unopened stock (in boxes) converted to grams, plus cream currently in canisters, minus the cherry allocation. Removed `inventory_bag_size_g: 1228` from the `whipping_cream` item (`bag_size_g: 1000` is now used directly). Verified via preview: stacks=2/loose=3/canister total=−14 (700−20−694) → `11 × 1000 + (−14) − 50 = 10936 g → 10.936 box` | Claude |
| 2026-06-15 | Whipping Cream: removed the 50g cherry allocation from the `loose` formula (§A.7) — user reported it as wrong; correct formula is just `loose = (non_coffee × bag_size_g(1000)) + canister`, i.e. unopened stock in boxes (× 1000 = g) plus canister total (g), so `loose_sum = non_coffee + canister/1000` gives a sensible combined "box" total (e.g. 11 box + 565 g canister → 11.565 box). Updated `calcClosing`, the Closing check line, and `whipping_cream`'s `notes` field accordingly | Claude |
| 2026-06-15 | Two fixes: (1) §A.2 — a whipping-cream canister row is now flagged with a warning border + inline message if `total_weight < syrup_weight + empty_canister_weight` (cream_weight would be negative). (2) §B.3.4/§A.1 — Cream Charger's Closing calc was wrong (`loose_sum = loose_sleeves × per_bag_pcs(10)` double-counted the per-sleeve multiplier against the "Ctn" row's `closing_per_box_pcs: 1`); changed `closing_input_type` to `"count"` (`loose_sum = loose` directly, in pcs) and `closing_per_box_pcs` to `10` (1 sleeve = 10 pcs), so `total = loose(pcs) + box_count × 10`. Verified via preview: loose=4, boxes=3 → `4 + 30 = 34 pcs` (was previously `40 + 3 = 43`) | Claude |
| 2026-06-15 | §A.6/§A.9: Cheese Cap and Coconut Cheese Cap now subtract a container tare before the split, like other Loss items — added `default_container_id: "pitcher"` (286g) to both items in `seedItems.ts`. `/count/expired` already renders the container selector + gross/tare/result row generically for any item with `default_container_id` regardless of `loss_formula`, so no code change was needed beyond the seed data. `total_volume = gross_weight − 286` now feeds the `direct` result and the downstream Cream/SeaSalt Cheese/etc. component splits. Verified via preview: gross=586 → Cheese Cap=300.00g → Cream=100.00g (300 × 1/3) | Claude |
| 2026-06-15 | New rule (§A.10): Closing's box/bag/bottle factor must always come from `/admin/items` — `calcClosing`'s `box_sum` now uses `closing_per_box_pcs ?? per_bag_pcs ?? per_box_pcs` (was `?? per_box_pcs` only). Removed mismatched `closing_per_box_pcs` overrides from 13 plain-count items (24oz Ice Cup, 20oz Double Wall Cup, SOE Hot/Ice Cup/Hot Lid 12oz, D Drinking Lid 12oz, Soda Water, Cream Charger, UHT Milk, Drinking Lid, Common Cup Holder, Cup Sleeve, Flat Lid, 16oz Ice Cup) so they derive from `per_bag_pcs`; the Closing row is now labelled "Bag" for these (was "Ctn"). Added `closing_per_box_pcs: 1` to Lime Concentrate/Seasalt Syrup/Caramel Syrup so all 6 Syrup bottle items show a "Bottle ×1" row; loose_grid bottle/bag items are now labelled "Bottle"/"Bag" instead of generic "Ctn" based on their `(bottle)`/`(bag)` name suffix or `unit`. Verified via preview: Flat Lid (per_bag_pcs=100), loose=50, bags=3 → `50 + 3×100 = 350 pcs` | Claude |
| 2026-06-15 | Closing per-category restructuring (§A.11), per user spec: added `Item.closing_box_row` (hides the Bag/Ctn/Bottle row entirely — "loose only"), `Item.closing_container_input` (non_coffee derived via container-tare entry instead of typed directly) and `Item.unopened_stack_size` + new `closing_inventory_formula: "stack_box"` (`unopened_stacks × unopened_stack_size + unopened_loose_pcs`, optionally + `loose_g/bag_size_g`). Added `ClosingEntry.container_id`/`gross_weight`. Set ~40 items: Packaging/Syrup/Soda Water/Merch/Coffee Bean/Hanjuku → loose only; Pandan/Ceylon/Jasmine/Sea Salt Cheese → loose only (dropped their inventory calc); Blue Velvet Base/Pistachio Sauce/Matcha Flavoured/Original Smoothie → container-tare `non_coffee` entry; Cocoa Flavoured/Matcha 1000 unchanged; Raw Material UHT Milk/Coconut (stack=4) and Velvet Base/Milky Bev/Butter Flavour/Oat Milk (stack=2) → `stack_box` (UHT Milk has no loose row); Coconut Jelly/Coconut Cream → loose only (`bag_size_g: 1000`). `calcClosing` takes a new `opts: { containers }` param for the container-tare lookup. Verified via preview: Coconut stacks=6/extra=3/loose=420g → `27 + 0.420 = 27.420 box`; Blue Velvet Base container=Small pitcher(138)/gross=500 → `595 − (500−138) = 233g` → `0.466 bag` | Claude |
| 2026-06-15 | Final page reorder + 2 new items (§A.16): added `Item.final_sort_order: number \| null` — `/count/result` now sorts by `final_sort_order` (falling back to `sort_order`) so the Final tab can follow its own 53-row sequence independent of Back/Front/Closing's category-grouped `sort_order`. Added two new Raw Material items "Coconut C (box)" and "Coconut Refreshing (box)" (`appears_in: back/closing/sheet2`, `unit: "box"`, `per_box_pcs: 12`, `bag_size_g: 1000`, loose-only like Coconut Jelly/Coconut Cream), `sort_order` 432/434 placing them next to Coconut on Back/Closing. Verified via `npx tsc --noEmit` and preview: `/count/result` now lists items in the exact requested order (Italian Bean … Coconut Plushie, 53 rows) and both new Coconut items render on `/count/back` | Claude |
| 2026-06-16 | §A.17: (1) `useCountingStore` now persists `record` to `localStorage["luckin_counting"]` (autosave on every set call) and restores it in `loadDate` when the stored date matches today, otherwise starts a fresh empty record — fixes data loss on reload and gives the "resets daily" behavior. (2) Added `CategoryNav` + `cat-<category>` anchors to Back, Closing, and Final for click-to-jump category navigation. (3) Added `NumericInput`/`evalExpression` (`src/lib/expr.ts`) — every editable numeric field on Back, Front, Material Expired, and Closing now accepts arithmetic expressions (e.g. `2*3`, `[8+9]`) evaluated on blur/Enter. Verified via `npx tsc --noEmit` and preview: entering `2*3+1` in a Back input commits as `7` and the value persists across a full page reload | Claude |
| 2026-06-16 | §A.18: (1) Added `Item.back_loose_formula: "stack_box" \| null` and `BackEntry.loose_extra`; for UHT Milk/Coconut/Coconut C, Back's "Loose" row is now `Stacks × unopened_stack_size(4) + Extra = Sum` (`calcBack`), mirroring their Closing `stack_box` formula. (2) `.category-label` is now `position: sticky; top: 82px` and `.category-nav` is `top: 52px` (was `top: 0`, which overlapped the sticky `.topbar`), so the current category's label stays pinned below the topbar/nav while scrolling on Back/Closing/Final. Verified via `npx tsc --noEmit` and preview: UHT Milk Stacks=2/Extra=5 → `2 × 4 + 5 = 13 pack`; "Packaging" label sticks at `top:82px` (below nav at 52–82.5px, below topbar at 0–51.5px) while scrolling through its section | Claude |
| 2026-06-16 | §A.19: (1) `back_loose_formula` gained `"hidden"` (omits Back's Loose/Count row, `calcBack` forces `bag_sum: null`); §A.18's "stack_box" second field renamed "Extra" → "Loose" for consistency. (2) Ceylon Black Tea: added `per_bag_pcs: 300` so Back's Loose row is `Bags × /bag(300) = Sum` instead of a bare unit count (its unit is `g`, 1 bag = 300g). (3) Velvet Base/Milky Bev/Butter Flavour: `back_loose_formula: "hidden"` — Back now shows only the Ctn row. (4) Coconut Cream: `back_loose_formula: "stack_box"` (stack size defaults to 4) — Back's "Count" row is now `Stacks × /stack(4) + Loose = Sum`. Verified via `npx tsc --noEmit` and preview: Ceylon shows `Bags × /bag(300) = Sum`; Velvet Base/Milky Bev/Butter Flavour show only "Ctn"; Coconut Cream Stacks=3/Loose=2 → `3 × 4 + 2 = 14 box` | Claude |
| 2026-06-16 | §A.20: Ceylon Black Tea's Back calc revised again (supersedes the §A.19 `per_bag_pcs: 300` change). `back_loose_formula` gained `"bag_count"`: Loose row is a plain bag-count input (`Loose: Bag = [input]`, `per_bag_pcs` back to `null` so `bag_sum = open_bags`), Ctn row unchanged (`Boxes × /box(20) = Sum`, in bags), and `calcBack`'s `total = (bag_sum + box_sum) × bag_size_g` for this formula — i.e. `(Loose + Ctn×20) × 300`. New check line `(loose + ctn_sum) × bag_size_g = total g`; the generic `checkParts` sum line is suppressed for `"bag_count"` items. Verified via `npx tsc --noEmit` and preview: Loose=2, Ctn=1 → `(2 + 20) × 300 = 6600 g` | Claude |
