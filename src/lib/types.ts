// Core data model — see APP_ARCHITECTURE.md section 3

export type Stage = "back" | "front" | "expired" | "closing" | "sheet2";

export type LossFormula = "multiply" | "subtract" | "add" | "none";

export interface Item {
  id: string;
  name: string;              // e.g. "Matcha Flavoured (bag)"
  category: string;          // e.g. "Solid Beverage"
  sort_order: number;
  appears_in: Stage[];       // which stages this item appears in

  unit: string | null; // display unit, e.g. "pcs", "bag", "bottle", "box", "pack", "can", "g"

  per_bag_pcs: number | null; // null ("-") => whole-unit item
  per_box_pcs: number | null;

  bag_size_g: number | null;  // for powder/liquid closing conversion

  loss_formula: LossFormula;
  loss_rate: number | null;        // for "multiply"
  loss_subtract_ml: number | null; // for "subtract" (e.g. Cream canister 694ml)
  loss_addend_item_id: string | null; // for "add" (e.g. Milk <- Milk-Cheese result)

  // Cream Charger style: closing loose measured in sleeves, converted via per_bag_pcs
  closing_input_type: "weight" | "count" | "sleeves";

  notes: string | null;
}

// ---- Per-stage entry shapes (APP_ARCHITECTURE.md section 3 DailyRecord) ----

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
  total_volume: number | null; // ml or g measured before disposal
  rate_value: number | null;   // context-dependent: proportion / subtraction ml / addend value
  result: number | null;       // computed
}

export interface MaterialInventoryEntry {
  under_cabinet: number | null;
  non_coffee: number | null;
  result: number | null;       // computed, feeds Closing.loose
}

export interface ClosingEntry {
  loose: number | null;     // g/ml, pcs, or open sleeves depending on closing_input_type
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
  material_inventory: Record<string, MaterialInventoryEntry>;
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
