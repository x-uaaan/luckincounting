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
3. Material Expired (Loss ONLY — during/end of service) (REVISED, see §A.6/§A.7)
   - Staff weighs the container being thrown (gross weight, container + leftover premix)
   - Staff selects which container was used from a dropdown (§A.6) → app subtracts
     the container's known tare weight automatically: total = gross_weight − tare_g
   - multiply: result = total × rate          (Chocolate, Matcha, Matcha1000, Ceylon, Jasmine, SeaSalt, Cream-cheese)
   - subtract: result = total − rate           (Cream; rate = ml left in canister, e.g. 694)
   - add:      result = total + addend_result  (Milk; addend = Milk-Cheese result)
   - none:     result = null → warning (Pandan must be measured, hard warning)
   → the "Cream" subtract result (canister ml) feeds the Whipping Cream inventory
     formula in Closing (§A.7) — Inventory (open working containers) is NO LONGER
     a Material Expired sub-section; it has moved into Closing.
        ↓
4. Closing (after service)
   - Inventory items (13 items, §A.7): loose = bag_size − under_cabinet − non_coffee
     (under_cabinet/non_coffee entered inline on the Closing card for these items —
     this is the former Material Expired "Inventory" section, now part of Closing)
   - powder/liquid: loose_sum = loose_g / bag_size_g
   - pieces:        loose_sum = loose_count   (see A.3 — flexible row×line+loose entry)
   - sleeves:       loose_sum = loose_sleeves × per_bag_pcs (e.g. Cream Charger)
   box_sum = box_count × per_box_pcs
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

**Known variants:**
| Variant | Pumps | ml/pump | syrup_weight | empty_canister_weight |
|---------|-------|---------|---------------|------------------------|
| Vanilla whipping cream | 4 | 5 | 20 g | 150 g (preset) |
| Sakura whipping cream  | 10 | 5 | 50 g | 150 g (preset) |

- `pump_count`, `ml_per_pump` (= 5), and `empty_canister_weight` (tare) are **presets** per variant — not entered by the user.
- `total_weight` is the **only field the user keys in** — the gross weight of that canister (canister + syrup + cream) as measured on the scale.

**Multi-variant sum:**
- The 2 preset variants (Vanilla, Sakura) count toward the limit. User can add custom variants/canisters (custom name, pump count, ml/pump, tare weight, total weight) until **5 canisters total** are present (i.e. up to 3 additional beyond the 2 presets) — the "Add canister" control becomes disabled at 5.
- App sums the cream-only weight across all canisters:
```
total_whipping_cream = Σ cream_weight   (for i = 1..N, N ≤ 5)
```
- This `total_whipping_cream` (cream only — canister and syrup already excluded) feeds into the Material Expired → Loss "Cream" row as the `total` measurement, per §B.4 / §B section 3.3.

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

- **Cream**: Loss "subtract" result (canister ml, e.g. 694) is reused as the canister value in Whipping Cream's Closing inventory formula (§A.7, formerly "3b"). The whipping cream variant calculator (A.2) is independent — it derives `cream_weight` per canister from `total_weight − syrup_weight − empty_canister_weight`, and `total_whipping_cream` (cream-only) feeds the Cream loss row's `total` (after container-tare subtraction, §A.6). Don't conflate the two canister concepts.
- **Milk**: Loss "add" result depends on Milk-Cheese's result being computed first. Order of evaluation matters.
- **Pandan**: Loss formula = "none" → must trigger a hard warning if container measurement is blank (per APP_ARCHITECTURE.md validation rules).
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
| pitcher | 286 | Chocolate |
| jug | 281.5 | Matcha |
| powder container | 191 | Matcha 1000 |
| squeezer | 31.5 | Ceylon Black Tea |
| canister | 694 | Jasmine Tea, Cream |
| small pitcher | 138 | SeaSalt (Cheese premix) |
| coffee tupperware | 268 | Cream (Cheese premix) |

- Each Loss item has a **default** container preselected (above), but staff can change it via dropdown if a different container was actually used that day.
- Items without a listed container (Pandan, Soda, Milk, Milk-Cheese, Coconut Cream, Frozen Coconut Juice, Seasalt-Coconut) keep entering `total` directly (no container subtraction) — Pandan still triggers the S-01 hard warning if blank.
- Data model: each Loss item gets a `container_options: { name, tare_g }[]` (or a shared lookup keyed by container name) plus a `default_container` and a per-record `container_id` selection (see appflow.md §B.3).

## A.7 Inventory moved into Closing (NEW, from `Counting (2).xlsx`)

The former Material Expired "Inventory" sub-section (3b) is **removed from Material Expired**. For the 13 items below, the `under_cabinet` / `non_coffee` inputs and the resulting `loose` value now live **inline on the Closing card** for that item — Material Expired is Loss-only (§A.6).

```
loose = bag_size − under_cabinet − non_coffee   (solid beverage / frozen items)
loose = bag_size − under_cabinet                (coffee beans)
loose = 1228 − canister(from Loss "Cream" subtract result) − non_coffee − cherry_allocation(50)   (Whipping Cream)
```

| Item | Bag size (g) | Closing inventory formula |
|------|--------------|----------------------------|
| Matcha Flavoured (bag) | 280 | 280 − non_coffee |
| Matcha 1000 (bag) | TBD | bag_size − non_coffee |
| Pistachio Sauce (bag) | 513 | 513 − non_coffee |
| Original Smoothie (bag) | 268 | 268 − non_coffee |
| Blue Velvet Base (bag) | 595 | 595 − non_coffee |
| Jasmine Tea (bag) | TBD | bag_size − non_coffee |
| Ceylon Black Tea (g) | TBD | bag_size − non_coffee |
| Pandan (bag) | TBD | bag_size − non_coffee (S-01 hard warning if Loss unmeasured) |
| Sea Salt Cheese (bag) | TBD | bag_size − non_coffee |
| Cocoa Flavoured (bag) | TBD | bag_size − non_coffee |
| Italian Bean (bag) | 600 | 600 − under_cabinet |
| Yirgacheffe Bean (bag) | 566 | 566 − under_cabinet |
| Whipping Cream (box) | 1228 | 1228 − canister(694, from Loss "Cream") − non_coffee(20) − cherry(50) = 464 |

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

**Material Expired — Loss only** (15 items, unchanged list, see §A.6): Chocolate, Matcha, Matcha 1000, Ceylon, Jasmine, Pandan, SeaSalt (Cheese), Cream (Cheese), Cream, Soda, Milk, Milk (Cheese), Coconut Cream, Frozen Coconut Juice, Seasalt (Coconut). These items are **Material-Expired-only** — they do not have Back/Front/Closing/Sheet2 rows (except where the same name also appears as a separate Back/Closing item, e.g. "Coconut Cream (box)" in Raw Material is a distinct item from Loss's "Coconut Cream").

**Closing** (51 items): same as Back, plus Whipping Cream (box) — i.e. Whipping Cream has no Back/Front row in `Counting (2).xlsx` but does have a Closing + Sheet2 row, plus its 13-item inventory calc (§A.7).

**Sheet2 / Final**: mirrors the Closing item set (51–52 items; verify exact set against the xlsx during implementation — at minimum every Closing item must have a Sheet2 row, per E-03).

---

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
- Cream Charger (special): `loose` = number of open sleeves → `loose_sum = loose × per_sleeve_pcs`

### B.3.5 Sheet2 (Final)

Auto-sum: `Total = Back + Front + Closing`

Items not present in a stage are treated as **0** (not NaN).

## B.4 Standard Loss Rates

| Item | Rate | Notes |
|------|------|-------|
| Chocolate | 0.5 (50%) | Standard |
| Matcha | 2/7 ≈ 0.2857 | Standard |
| Matcha 1000 | 1/3 ≈ 0.3333 | Standard |
| Ceylon Black Tea | 0.45 (45%) | Standard |
| Jasmine Tea | 0.45 (45%) | Standard |
| SeaSalt (Cheese premix) | 2/15 ≈ 0.1333 | Standard |
| Cream (Cheese premix) | 1/3 ≈ 0.3333 | Standard |
| Milk (Cheese premix) | 8/15 ≈ 0.5333 | Standard |
| Pandan | Not measured — see errors | ⚠ |

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
- **Material Expired rate column** must be replaced with clearly labeled formula cells per item (proportion, subtraction, or addition)
- **Material Expired container measurement** must let staff pick a container preset (§A.6) and enter the gross weight; the app subtracts the tare automatically — staff should never need to do this subtraction by hand
- **Material Expired is Loss-only** (§A.6/§A.8) — the former Inventory sub-section now lives inline on the relevant Closing item cards (§A.7)
- **Pandan** must show a hard warning if the container measurement is blank
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
