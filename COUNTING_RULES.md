# Luckin Coffee Shop — Daily Inventory Counting Rules

> **Last updated:** 2026-06-11
> **Source file:** `Counting (1).xlsx`

---

## 1. Overview

Daily inventory counting captures the stock remaining at the end of each operation day. The final result is consolidated in **Sheet2 (Final Result)** which is the only sheet to be keyed into the system.

**Final formula:** `Sheet2 Total = Back + Front + Closing`

---

## 2. Counting Stages & Flow

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

---

## 3. Sheet-by-Sheet Rules

### 3.1 Back Sheet

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

### 3.2 Front Sheet

| Column | Description | Formula |
|--------|-------------|---------|
| per_box_pcs | Pieces per box placed at bar | — |
| box | Number of boxes at bar | — |
| total | Total pieces | `box × per_box_pcs` |

### 3.3 Material Expired Sheet

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

### 3.4 Closing Sheet

Items counted per remaining physical stock after closing.

- Liquid/powder items: `loose` = measured grams/ml → `loose_sum = loose / bag_size`
- Piece items: `loose` = count → `loose_sum = loose` (direct)
- Cream Charger (special): `loose` = number of open sleeves → `loose_sum = loose × per_sleeve_pcs`

### 3.5 Sheet2 (Final)

Auto-sum: `Total = Back + Front + Closing`

Items not present in a stage are treated as **0** (not NaN).

---

## 4. Standard Loss Rates

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

---

## 5. Confirmed Errors

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

---

## 6. Suspected Errors

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

---

## 7. App Design Notes

> See separate app architecture document. Key rules for app implementation:

- **Sheet2 is auto-generated** — never allow direct input into Sheet2; it must be calculated from Back + Front + Closing
- **Closing fields must allow empty** with a warning prompt before final submission
- **Material Expired rate column** must be replaced with clearly labeled formula cells per item (proportion, subtraction, or addition)
- **Pandan** must show a hard warning if the container measurement is blank
- File saved to Google Drive as `YYMMDD.xlsx` upon final approval by admin
- Admin can CRUD all items and sections (except stage names/order)
- Delete workflow: component → confirmation warning → confirmed delete

---

## 8. Change Log

| Date | Change | By |
|------|--------|----|
| 2026-06-11 | Initial document created from `Counting (1).xlsx` audit | Claude |
