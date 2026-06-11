# Luckin Counting App — Architecture & Design Spec

> **Last updated:** 2026-06-11
> **Companion to:** `COUNTING_RULES.md`

---

## 1. Modes

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

---

## 2. Stage Architecture

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

---

## 3. Data Model

### Item
```
{
  id: uuid,
  name: string,               // e.g. "Matcha Flavoured (bag)"
  category: string,           // e.g. "Solid Beverage"
  appears_in: [Stage],        // which stages this item appears in
  per_bag_pcs: number | null, // null if "-" (whole unit)
  per_box_pcs: number | null,
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

---

## 4. Calculation Rules (Frontend Logic)

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

---

## 5. Validation Rules

| Rule | Trigger | Severity |
|------|---------|----------|
| Closing field left blank | Any Closing field = null on submit | Warning (not block) |
| Pandan container not measured | Loss result = null for Pandan | Warning (highlight red) |
| box_sum ≠ box × per_box_pcs | Auto-check on input | Warning inline |
| Sheet2 Total < 0 | Any total turns negative | Error (block submit) |
| Duplicate date record | Attempting to create record for existing date | Error (block) |
| Approve without all 4 stages completed | Admin approval attempted | Warning: "Stages X not completed" |

---

## 6. UI Structure

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

---

## 7. Google Drive Integration

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

---

## 8. Tech Stack Recommendation

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

---

## 9. Page Routes

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

---

## 10. Change Log

| Date | Change | By |
|------|--------|----|
| 2026-06-11 | Initial architecture document | Claude |
