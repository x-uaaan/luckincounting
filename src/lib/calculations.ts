// Calculation rules — see COUNTING_RULES.md section 3 and APP_ARCHITECTURE.md section 4
import type {
  Item,
  BackEntry,
  FrontEntry,
  MaterialLossEntry,
  MaterialInventoryEntry,
  ClosingEntry,
  Sheet2Entry,
} from "./types";

const sumNullable = (...vals: (number | null | undefined)[]): number =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

// --- Stage 1: Back ---
export function calcBack(item: Item, entry: Pick<BackEntry, "open_bags" | "box_count">): BackEntry {
  const bag_sum =
    item.per_bag_pcs == null
      ? entry.open_bags ?? null // whole-unit item: enter sum directly via open_bags
      : entry.open_bags != null
      ? entry.open_bags * item.per_bag_pcs
      : null;

  const box_sum =
    item.per_box_pcs != null && entry.box_count != null
      ? entry.box_count * item.per_box_pcs
      : null;

  return {
    open_bags: entry.open_bags ?? null,
    bag_sum,
    box_count: entry.box_count ?? null,
    box_sum,
    total: sumNullable(bag_sum, box_sum),
  };
}

// --- Stage 2: Front ---
export function calcFront(item: Item, entry: Pick<FrontEntry, "box_count">): FrontEntry {
  const total =
    item.per_box_pcs != null && entry.box_count != null
      ? entry.box_count * item.per_box_pcs
      : null;

  return { box_count: entry.box_count ?? null, total };
}

// --- Stage 3A: Material Expired - Loss ---
export function calcMaterialLoss(
  item: Item,
  entry: Pick<MaterialLossEntry, "total_volume" | "rate_value">,
  addendResult?: number | null
): MaterialLossEntry {
  let result: number | null = null;

  if (item.loss_formula === "multiply") {
    if (entry.total_volume != null && (entry.rate_value ?? item.loss_rate) != null) {
      result = entry.total_volume * (entry.rate_value ?? item.loss_rate!);
    }
  } else if (item.loss_formula === "subtract") {
    const subtractFrom = entry.rate_value ?? item.loss_subtract_ml;
    if (entry.total_volume != null && subtractFrom != null) {
      result = entry.total_volume - subtractFrom;
    }
  } else if (item.loss_formula === "add") {
    if (entry.total_volume != null && addendResult != null) {
      result = entry.total_volume + addendResult;
    }
  }
  // "none" => result stays null (e.g. Pandan — triggers hard warning)

  return {
    total_volume: entry.total_volume ?? null,
    rate_value: entry.rate_value ?? null,
    result,
  };
}

// --- Stage 3B: Material Expired - Inventory ---
export function calcMaterialInventory(
  item: Item,
  entry: Pick<MaterialInventoryEntry, "under_cabinet" | "non_coffee">,
  // Cream-style items subtract a container volume carried over from the Loss section
  creamLossResult?: number | null
): MaterialInventoryEntry {
  let result: number | null = null;

  if (item.bag_size_g != null) {
    const subtractCanister = creamLossResult ?? 0;
    result =
      item.bag_size_g - (entry.under_cabinet ?? 0) - (entry.non_coffee ?? 0) - subtractCanister;
  }

  return {
    under_cabinet: entry.under_cabinet ?? null,
    non_coffee: entry.non_coffee ?? null,
    result,
  };
}

// --- Stage 4: Closing ---
export function calcClosing(
  item: Item,
  entry: Pick<ClosingEntry, "loose" | "box_count">
): ClosingEntry {
  let loose_sum: number | null = null;

  if (entry.loose != null) {
    if (item.closing_input_type === "weight" && item.bag_size_g) {
      loose_sum = entry.loose / item.bag_size_g;
    } else if (item.closing_input_type === "sleeves" && item.per_bag_pcs) {
      loose_sum = entry.loose * item.per_bag_pcs;
    } else {
      // "count" — pcs items, direct
      loose_sum = entry.loose;
    }
  }

  const box_sum =
    item.per_box_pcs != null && entry.box_count != null
      ? entry.box_count * item.per_box_pcs
      : null;

  return {
    loose: entry.loose ?? null,
    loose_sum,
    box_count: entry.box_count ?? null,
    box_sum,
    total: sumNullable(loose_sum, box_sum),
  };
}

// --- Stage 5: Sheet2 (Final) ---
export function calcSheet2(
  back: number | null | undefined,
  front: number | null | undefined,
  closing: number | null | undefined
): Sheet2Entry {
  return {
    back: back ?? 0,
    front: front ?? 0,
    closing: closing ?? 0,
    total: sumNullable(back, front, closing),
  };
}

// --- Validation helpers — see COUNTING_RULES.md section 7 / ARCHITECTURE section 5 ---
export function checkBoxSumMismatch(
  box: number | null,
  per_box_pcs: number | null,
  recordedBoxSum: number | null
): boolean {
  if (box == null || per_box_pcs == null || recordedBoxSum == null) return false;
  return box * per_box_pcs !== recordedBoxSum;
}
