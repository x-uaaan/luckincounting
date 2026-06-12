// Calculation rules — see countingflow.md §A / appflow.md §B.4
import type {
  Item,
  Container,
  BackEntry,
  FrontEntry,
  MaterialLossEntry,
  ClosingEntry,
  Sheet2Entry,
  WhippingCreamCalc,
} from "./types";

const sumNullable = (...vals: (number | null | undefined)[]): number =>
  vals.reduce((acc: number, v) => acc + (v ?? 0), 0);

// Round to 1 decimal place for display only (Sheet2/Final). Full precision is
// retained internally — only call this where a value is rendered.
export function round1(n: number | null | undefined): number | null {
  if (n == null) return null;
  return Math.round(n * 10) / 10;
}

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
  const per_box_pcs = item.front_per_box_pcs ?? item.per_box_pcs;
  const total =
    per_box_pcs != null && entry.box_count != null ? entry.box_count * per_box_pcs : null;

  return { box_count: entry.box_count ?? null, total };
}

// --- Stage 3: Material Expired — Loss (countingflow.md §A.6/§A.2) ---
export function calcMaterialLoss(
  item: Item,
  entry: Pick<MaterialLossEntry, "container_id" | "gross_weight" | "rate_value"> & {
    whipping_cream?: WhippingCreamCalc;
  },
  opts: {
    addendResult?: number | null;
    containers: Container[];
  }
): MaterialLossEntry {
  const container = entry.container_id
    ? opts.containers.find((c) => c.id === entry.container_id) ?? null
    : null;

  // Cream uses the whipping-cream canister calculator instead of a single gross weight
  const whippingCream = entry.whipping_cream
    ? calcWhippingCream(entry.whipping_cream)
    : undefined;

  const total_volume =
    whippingCream?.total_whipping_cream ??
    (entry.gross_weight != null ? entry.gross_weight - (container?.tare_g ?? 0) : null);

  let result: number | null = null;

  if (item.loss_formula === "multiply") {
    const rate = entry.rate_value ?? item.loss_rate;
    if (total_volume != null && rate != null) {
      result = total_volume * rate;
    }
  } else if (item.loss_formula === "subtract") {
    const subtractFrom = entry.rate_value ?? item.loss_subtract_ml;
    if (total_volume != null && subtractFrom != null) {
      result = total_volume - subtractFrom;
    }
  } else if (item.loss_formula === "add") {
    if (total_volume != null && opts.addendResult != null) {
      result = total_volume + opts.addendResult;
    }
  }
  // "none" => result stays null (e.g. Pandan — triggers hard warning)

  return {
    container_id: entry.container_id ?? null,
    gross_weight: entry.gross_weight ?? null,
    total_volume,
    rate_value: entry.rate_value ?? null,
    result,
    ...(whippingCream ? { whipping_cream: whippingCream } : {}),
  };
}

// --- Whipping cream pump-based variant calculator (countingflow.md §A.2) ---
export function calcWhippingCream(calc: WhippingCreamCalc): WhippingCreamCalc {
  let total_whipping_cream = 0;
  let any = false;

  for (const v of calc.variants) {
    if (v.total_weight == null) continue;
    any = true;
    const syrup_weight = v.pump_count * v.ml_per_pump;
    const cream_weight = v.total_weight - syrup_weight - v.empty_canister_weight;
    total_whipping_cream += cream_weight;
  }

  return {
    variants: calc.variants,
    total_whipping_cream: any ? total_whipping_cream : null,
  };
}

// --- Stage 4: Closing (countingflow.md §A.1/§A.3/§A.7) ---
export function calcClosing(
  item: Item,
  entry: Pick<
    ClosingEntry,
    "under_cabinet" | "non_coffee" | "loose_rows" | "loose_lines" | "loose_extra" | "loose" | "box_count"
  >,
  // (§A.7) only used for Whipping Cream: the "canister" value from Cream's Loss row
  creamCanisterValue?: number | null
): ClosingEntry {
  let loose = entry.loose ?? null;

  // (§A.7) Closing-inventory items derive `loose` instead of entering it directly
  const invBagSize = item.inventory_bag_size_g ?? item.bag_size_g;
  if (item.closing_inventory_formula && invBagSize != null) {
    if (item.closing_inventory_formula === "non_coffee") {
      loose = invBagSize - (entry.non_coffee ?? 0);
    } else if (item.closing_inventory_formula === "under_cabinet") {
      loose = invBagSize - (entry.under_cabinet ?? 0);
    } else if (item.closing_inventory_formula === "whipping_cream") {
      loose = invBagSize - (creamCanisterValue ?? 0) - (entry.non_coffee ?? 0) - 50;
    }
  } else if (item.loose_grid) {
    // (§A.3) row × line + loose grid entry
    if (entry.loose_rows != null || entry.loose_lines != null || entry.loose_extra != null) {
      loose = (entry.loose_rows ?? 0) * (entry.loose_lines ?? 0) + (entry.loose_extra ?? 0);
    }
  }

  let loose_sum: number | null = null;
  if (loose != null) {
    if (item.closing_input_type === "weight" && item.bag_size_g) {
      loose_sum = loose / item.bag_size_g;
    } else if (item.closing_input_type === "sleeves" && item.per_bag_pcs) {
      loose_sum = loose * item.per_bag_pcs;
    } else {
      // "count" — pcs items, direct
      loose_sum = loose;
    }
  }

  const closing_per_box_pcs = item.closing_per_box_pcs ?? item.per_box_pcs;
  const box_sum =
    closing_per_box_pcs != null && entry.box_count != null
      ? entry.box_count * closing_per_box_pcs
      : null;

  return {
    under_cabinet: entry.under_cabinet ?? null,
    non_coffee: entry.non_coffee ?? null,
    loose_rows: entry.loose_rows ?? null,
    loose_lines: entry.loose_lines ?? null,
    loose_extra: entry.loose_extra ?? null,
    loose,
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

// --- Validation helpers ---
export function checkBoxSumMismatch(
  box: number | null,
  per_box_pcs: number | null,
  recordedBoxSum: number | null
): boolean {
  if (box == null || per_box_pcs == null || recordedBoxSum == null) return false;
  return box * per_box_pcs !== recordedBoxSum;
}
