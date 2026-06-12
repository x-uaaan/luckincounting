// Core data model — see appflow.md §B.3

export type Stage = "back" | "front" | "expired" | "closing" | "sheet2";

export type LossFormula = "multiply" | "subtract" | "add" | "none";

export type ClosingInventoryFormula = "non_coffee" | "under_cabinet" | "whipping_cream";

export interface Item {
  id: string;
  name: string;              // e.g. "Matcha Flavoured (bag)"
  category: string;          // e.g. "Solid Beverage"
  sort_order: number;
  appears_in: Stage[];       // which stages this item appears in

  unit: string | null; // display unit, e.g. "pcs", "bag", "bottle", "box", "pack", "can", "g"

  per_bag_pcs: number | null; // null ("-") => whole-unit item
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
  loss_subtract_ml: number | null; // for "subtract" (e.g. Cream canister 694ml)
  loss_addend_item_id: string | null; // for "add" (e.g. Milk <- Milk-Cheese result)

  // (countingflow.md §A.6) Material Expired container-tare selector — only set for
  // Loss items that have a container preset. null => no container subtraction.
  default_container_id: string | null;

  // (countingflow.md §A.7) Closing inventory calc — only set for the 13 items whose
  // "loose" is derived in Closing instead of entered directly.
  closing_inventory_formula: ClosingInventoryFormula | null;

  // (countingflow.md §A.3) Flexible row×line+loose entry for Raw Material/Syrup/Frozen.
  loose_grid: boolean;

  // Cream Charger style: closing loose measured in sleeves, converted via per_bag_pcs
  closing_input_type: "weight" | "count" | "sleeves";

  notes: string | null;
}

// ---- Containers (countingflow.md §A.6) ----

export interface Container {
  id: string;
  name: string;
  tare_g: number;
}

// ---- Whipping cream variant calculator (countingflow.md §A.2 / appflow.md §A.4) ----

export interface WhippingCreamVariant {
  id: string;
  name: string;                  // "Vanilla", "Sakura", or custom
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
  container_id: string | null;   // (NEW, §A.6) selected container preset
  gross_weight: number | null;   // (NEW, §A.6) container + leftover premix, as weighed
  total_volume: number | null;   // computed = gross_weight - container.tare_g (or = gross_weight if no container)
  rate_value: number | null;     // context-dependent: subtraction ml / addend value
  result: number | null;         // computed

  // (NEW, §A.2/A.4) only present for the Cream item
  whipping_cream?: WhippingCreamCalc;
}

export interface ClosingEntry {
  // (NEW, §A.7) inventory inputs for the 13 items with closing_inventory_formula set
  under_cabinet: number | null;
  non_coffee: number | null;

  // (NEW, §A.3/A.5) row×line+loose grid entry for loose_grid items
  loose_rows: number | null;
  loose_lines: number | null;
  loose_extra: number | null;

  loose: number | null;     // g/ml, pcs, or open sleeves depending on closing_input_type (or derived, §A.7)
  loose_sum: number | null; // computed
  box_count: number | null;
  box_sum: number | null;   // computed
  total: number | null;     // computed
}

export interface Sheet2Entry {
  back: number | null;
  front: number | null;
  closing: number | null;
  total: number | null;     // computed = back + front + closing
}

export type RecordStatus = "draft" | "pending_approval" | "approved";

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
