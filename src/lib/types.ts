// Core data model — see appflow.md §B.3

export type Stage = "back" | "front" | "expired" | "closing" | "sheet2";

export type LossFormula = "multiply" | "direct" | "components" | "none";

export type ClosingInventoryFormula = "non_coffee" | "under_cabinet" | "whipping_cream" | "stack_box" | "container_direct" | "container_plus_loose";

export interface Item {
  id: string;
  name: string;              // e.g. "Matcha Flavoured (bag)"
  category: string;          // e.g. "Solid Beverage"
  sort_order: number;        // Back/Front/Material Expired/Closing order

  // (NEW) Final (Sheet2/Result) page display order — falls back to sort_order
  // when null. Lets the Final page follow its own sequence independent of the
  // category-grouped Back/Front/Closing order.
  final_sort_order: number | null;

  // (NEW §A.21) Closing page display order — falls back to sort_order when null.
  closing_sort_order: number | null;

  // (NEW §A.22) Front page display order — falls back to sort_order when null.
  front_sort_order: number | null;

  appears_in: Stage[];       // which stages this item appears in

  unit: string | null; // display unit, e.g. "pcs", "bag", "bottle", "box", "pack", "can", "g"

  per_bag_pcs: number | null; // null ("-") => whole-unit item

  // (NEW §A.18/§A.19/§A.20) When "stack_box", Back's "Loose" row becomes
  // `Stacks × unopened_stack_size + Loose = Sum` instead of `Bags × per_bag_pcs = Sum`
  // (mirrors the Closing "stack_box" calc for the same item). When "hidden",
  // the Loose/Count row is omitted entirely (item has only a Ctn row). When
  // "bag_count", the "Loose" row is a plain bag-count input (no per-bag
  // multiply), the "Ctn" row is `Boxes × per_box_pcs = Sum` (also in bags),
  // and `total = (bag_sum + box_sum) × bag_size_g` converts the bag total to
  // the item's display unit (e.g. grams).
  back_loose_formula: "stack_box" | "hidden" | "bag_count" | null;
  per_box_pcs: number | null;       // Back box pcs
  front_per_box_pcs: number | null; // Front box pcs (may differ from Back, countingflow.md §A.8)
  closing_per_box_pcs: number | null; // Closing storage-box pcs (appflow.md §A.6.5)

  bag_size_g: number | null;  // for powder/liquid closing loose_sum conversion (loose / bag_size_g)

  // (NEW) bag size used by closing_inventory_formula (countingflow.md §A.7), which can
  // differ from bag_size_g (e.g. Italian Bean: inventory bag = 600g, but loose_sum
  // conversion uses 1000g). Falls back to bag_size_g when null.
  inventory_bag_size_g: number | null;

  loss_formula: LossFormula;
  loss_rate: number | null;        // for "multiply"

  // (NEW) for "components" — sum of componentTotals[source_item_id] * rate,
  // added to this item's own total_volume (if any)
  loss_components: { source_item_id: string; rate: number }[] | null;

  // (NEW) controls Material Expired rendering: "input" = input card only,
  // "summary" = summary row only, "input_and_summary" = both (default)
  loss_role: "input" | "input_and_summary" | "summary";

  // (countingflow.md §A.6) Material Expired container-tare selector — only set for
  // Loss items that have a container preset. null => no container subtraction.
  default_container_id: string | null;

  // (countingflow.md §A.7) Closing inventory calc — only set for the 13 items whose
  // "loose" is derived in Closing instead of entered directly.
  closing_inventory_formula: ClosingInventoryFormula | null;

  // (§A.10) When true, the "non_coffee" inventory input on Closing is entered via a
  // container-tare selector (gross weight − container tare) instead of a raw number.
  closing_container_input: boolean;

  // (§A.10) Stack size for the "stack_box" closing_inventory_formula — Raw Material
  // boxes are stacked N-per-stack; total = stacks * unopened_stack_size + extra pcs.
  unopened_stack_size: number | null;

  // (§A.10) Whether Closing shows the Bag/Ctn/Bottle box-count row at all. Many
  // categories (Packaging, Syrup, Coffee Bean, Soda, Merch, etc.) are "loose only".
  closing_box_row: boolean;

  // (countingflow.md §A.3) Flexible row×line+loose entry for Raw Material/Syrup/Frozen.
  loose_grid: boolean;

  // Cream Charger style: closing loose measured in sleeves, converted via per_bag_pcs
  closing_input_type: "weight" | "count" | "sleeves";

  // Whipping cream flavour presets — only set on the whipping_cream item.
  // Each entry defines one selectable flavour in the closing canister calc.
  wc_flavours: { id: string; name: string; pump_count: number; ml_per_pump: number }[] | null;

  notes: string | null;
}

// ---- Containers (countingflow.md §A.6) ----

export interface ContainerVariant {
  label: string;  // e.g. "No cover", "With cover"
  tare_g: number;
}

export interface Container {
  id: string;
  name: string;
  tare_g: number;
  sort_order: number;
  tare_variants: ContainerVariant[] | null; // null = no variants, just base tare_g
}

// ---- Whipping cream variant calculator (countingflow.md §A.2 / appflow.md §A.4) ----

export interface WhippingCreamVariant {
  id: string;
  name: string;                  // "Vanilla", "Sakura", or custom
  flavour: string;               // matches wc_flavours[].id on the item
  pump_count: number;            // preset, e.g. 4 (Vanilla), 10 (Sakura)
  ml_per_pump: number;           // preset, default 5
  empty_canister_weight: number; // preset tare weight (g) of this canister type
  total_weight: number | null;   // user-entered gross weight (canister + syrup + cream)
}

export interface WhippingCreamCalc {
  variants: WhippingCreamVariant[]; // up to 5
  total_whipping_cream: number | null; // computed: sum of cream_weight across variants
}

// ---- Per-stage entry shapes (appflow.md §B.3 DailyRecord) ----

export interface BackEntry {
  open_bags: number | null;
  loose_extra: number | null; // (NEW §A.18) extra pcs for "back_loose_formula: stack_box" items
  bag_sum: number | null;   // computed
  box_count: number | null;
  box_sum: number | null;   // computed
  total: number | null;     // computed
}

export interface FrontEntry {
  box_count: number | null;
  total: number | null;     // computed
}

export interface MaterialLossEntry {
  container_id: string | null;    // (NEW, §A.6) selected container preset
  tare_override: number | null;   // selected variant tare (null = use container.tare_g)
  gross_weight: number | null;    // (NEW, §A.6) container + leftover premix, as weighed
  total_volume: number | null;    // computed = gross_weight - effective_tare
  rate_value: number | null;      // context-dependent: subtraction ml / addend value
  result: number | null;          // computed
}

export interface ClosingEntry {
  // (NEW, §A.7) inventory inputs for the 13 items with closing_inventory_formula set
  under_cabinet: number | null;
  non_coffee: number | null;

  // (NEW, §A.3/A.5) row×line+loose grid entry for loose_grid items
  loose_rows: number | null;
  loose_lines: number | null;
  loose_extra: number | null;

  // (NEW, §A.2/A.4) Whipping Cream "unopened" calc — unopened boxes come in
  // stacks of 4; loose_pcs is the remainder that doesn't fill a stack.
  // total pcs = unopened_stacks * 4 + unopened_loose_pcs, converted to grams
  // (× bag_size_g) and used as `non_coffee` in the whipping_cream formula.
  unopened_stacks: number | null;
  unopened_loose_pcs: number | null;

  // (§A.10) container-tare entry for items with closing_container_input — gross
  // weight is weighed with the container still on; non_coffee = gross - tare.
  container_id: string | null;
  gross_weight: number | null;

  loose: number | null;     // g/ml, pcs, or open sleeves depending on closing_input_type (or derived, §A.7)
  loose_sum: number | null; // computed
  box_count: number | null;
  box_sum: number | null;   // computed
  total: number | null;     // computed

  // (NEW, §A.2/A.4) only present for the Whipping Cream item — canister calculator
  whipping_cream: WhippingCreamCalc | null;
}

export interface Sheet2Entry {
  back: number | null;
  front: number | null;
  closing: number | null;
  total: number | null;     // computed = back + front + closing
}

export type RecordStatus = "draft" | "pending_approval" | "approved" | "rejected";

export interface DailyRecord {
  date: string; // YYMMDD
  status: RecordStatus;
  back: Record<string, BackEntry>;
  front: Record<string, FrontEntry>;
  material_loss: Record<string, MaterialLossEntry>;
  closing: Record<string, ClosingEntry>;
  sheet2: Record<string, Sheet2Entry>;
  approved_by: string | null;
  approved_at: string | null; // ISO timestamp
  drive_file_id: string | null;
}

export interface ValidationWarning {
  itemId: string;
  stage: Stage;
  field: string;
  message: string;
  severity: "warning" | "error";
}
