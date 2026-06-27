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
  DailyRecord,
  ValidationWarning,
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
export function calcBack(
  item: Item,
  entry: Pick<BackEntry, "open_bags" | "box_count" | "loose_extra">
): BackEntry {
  const bag_sum =
    item.back_loose_formula === "hidden"
      ? null
      : item.back_loose_formula === "stack_box"
      ? entry.open_bags != null || entry.loose_extra != null
        ? (entry.open_bags ?? 0) * (item.unopened_stack_size ?? 4) + (entry.loose_extra ?? 0)
        : null
      : item.per_bag_pcs == null
      ? entry.open_bags ?? null // whole-unit item: enter sum directly via open_bags
      : entry.open_bags != null
      ? entry.open_bags * item.per_bag_pcs
      : null;

  const box_sum =
    item.per_box_pcs != null && entry.box_count != null
      ? entry.box_count * item.per_box_pcs
      : null;

  const rawTotal = sumNullable(bag_sum, box_sum);

  return {
    open_bags: entry.open_bags ?? null,
    loose_extra: entry.loose_extra ?? null,
    bag_sum,
    box_count: entry.box_count ?? null,
    box_sum,
    total:
      item.back_loose_formula === "bag_count" ? rawTotal * (item.bag_size_g ?? 1) : rawTotal,
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
  entry: Pick<MaterialLossEntry, "container_id" | "tare_override" | "gross_weight" | "rate_value">,
  opts: {
    containers: Container[];
    // map of every item id -> its current total_volume (own weighed input, before
    // any component split), used by "components" formula items
    componentTotals: Record<string, number | null>;
  }
): MaterialLossEntry {
  const container = entry.container_id
    ? opts.containers.find((c) => c.id === entry.container_id) ?? null
    : null;

  const effectiveTare = entry.tare_override ?? container?.tare_g ?? 0;
  const total_volume =
    entry.gross_weight != null ? entry.gross_weight - effectiveTare : null;

  let result: number | null = null;

  if (item.loss_formula === "multiply") {
    const rate = entry.rate_value ?? item.loss_rate;
    if (total_volume != null && rate != null) {
      result = total_volume * rate;
    }
  } else if (item.loss_formula === "direct") {
    result = total_volume;
  } else if (item.loss_formula === "components") {
    let any = total_volume != null;
    let sum = total_volume ?? 0;
    for (const c of item.loss_components ?? []) {
      const src = opts.componentTotals[c.source_item_id];
      if (src != null) {
        sum += src * c.rate;
        any = true;
      }
    }
    result = any ? sum : null;
  }
  // "none" => result stays null

  return {
    container_id: entry.container_id ?? null,
    tare_override: entry.tare_override ?? null,
    gross_weight: entry.gross_weight ?? null,
    total_volume,
    rate_value: entry.rate_value ?? null,
    result,
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
const UNOPENED_STACK_SIZE = 4;

export function calcClosing(
  item: Item,
  entry: Pick<
    ClosingEntry,
    | "under_cabinet"
    | "non_coffee"
    | "loose_rows"
    | "loose_lines"
    | "loose_extra"
    | "loose"
    | "box_count"
    | "unopened_stacks"
    | "unopened_loose_pcs"
    | "container_id"
    | "gross_weight"
  > & {
    whipping_cream?: WhippingCreamCalc | null;
  },
  opts: { containers: Container[] } = { containers: [] }
): ClosingEntry {
  let loose = entry.loose ?? null;
  let non_coffee = entry.non_coffee ?? null;
  let stack_box_sum: number | null = null;
  let loose_sum_override: number | null | undefined;

  // (§A.2/A.7) Whipping Cream's loose is derived from its own canister calculator
  const whippingCream = entry.whipping_cream
    ? calcWhippingCream(entry.whipping_cream)
    : null;

  // (§A.7) Closing-inventory items derive `loose` instead of entering it directly
  const invBagSize = item.inventory_bag_size_g ?? item.bag_size_g;
  if (item.closing_inventory_formula === "non_coffee" && invBagSize != null) {
    // (§A.10) container-tare entry: non_coffee = gross weight - container tare
    if (item.closing_container_input) {
      const container = entry.container_id
        ? opts.containers.find((c) => c.id === entry.container_id) ?? null
        : null;
      non_coffee = entry.gross_weight != null ? entry.gross_weight - (container?.tare_g ?? 0) : null;
    }
    loose = invBagSize - (non_coffee ?? 0);
  } else if (item.closing_inventory_formula === "container_direct") {
    // (§A.12) container-tare entry, no inventory-bag subtraction: loose = gross - tare directly
    const container = entry.container_id
      ? opts.containers.find((c) => c.id === entry.container_id) ?? null
      : null;
    non_coffee = entry.gross_weight != null ? entry.gross_weight - (container?.tare_g ?? 0) : null;
    loose = non_coffee;
  } else if (item.closing_inventory_formula === "container_plus_loose") {
    // (§A.14) loose_sum = [user-entered bag count] + (gross weight - container tare) / bag_size_g
    const container = entry.container_id
      ? opts.containers.find((c) => c.id === entry.container_id) ?? null
      : null;
    non_coffee = entry.gross_weight != null ? entry.gross_weight - (container?.tare_g ?? 0) : null;
    loose = non_coffee;
    const containerBags = non_coffee != null && item.bag_size_g ? non_coffee / item.bag_size_g : null;
    loose_sum_override =
      entry.loose_extra != null || containerBags != null
        ? (entry.loose_extra ?? 0) + (containerBags ?? 0)
        : null;
  } else if (item.closing_inventory_formula === "under_cabinet" && invBagSize != null) {
    loose = invBagSize - (entry.under_cabinet ?? 0);
  } else if (item.closing_inventory_formula === "whipping_cream" && invBagSize != null) {
    // Unopened boxes come in stacks of 4; loose_pcs is the remainder.
    const totalPcs = (entry.unopened_stacks ?? 0) * UNOPENED_STACK_SIZE + (entry.unopened_loose_pcs ?? 0);
    non_coffee = totalPcs;
    // total g = unopened boxes*1000 + opened box gross weight + cream in canisters
    // loose_sum = loose / 1000 = boxes (since closing_input_type="weight", bag_size_g=1000)
    loose = non_coffee * (item.bag_size_g ?? 0) + (entry.gross_weight ?? 0) + (whippingCream?.total_whipping_cream ?? 0);
  } else if (item.closing_inventory_formula === "stack_box") {
    // (§A.10) Raw Material: stacked boxes + loose remainder pcs = whole-box count,
    // plus any partial loose weight (g) converted via bag_size_g.
    const stackSize = item.unopened_stack_size ?? 0;
    stack_box_sum = (entry.unopened_stacks ?? 0) * stackSize + (entry.unopened_loose_pcs ?? 0);
    non_coffee = stack_box_sum;
  } else if (item.loose_grid) {
    // (§A.3) row × line + loose grid entry
    if (entry.loose_rows != null || entry.loose_lines != null || entry.loose_extra != null) {
      loose = (entry.loose_rows ?? 0) * (entry.loose_lines ?? 0) + (entry.loose_extra ?? 0);
    }
  }

  let loose_sum: number | null = null;
  if (loose_sum_override !== undefined) {
    loose_sum = loose_sum_override;
  } else if (loose != null) {
    if (item.closing_input_type === "weight" && item.bag_size_g) {
      loose_sum = loose / item.bag_size_g;
    } else if (item.closing_input_type === "sleeves" && item.per_bag_pcs) {
      loose_sum = loose * item.per_bag_pcs;
    } else {
      // "count" — pcs items, direct
      loose_sum = loose;
    }
  }

  // (§A.9/A.10) "1 box/bottle/bag" qty must come from admin item data: closing_per_box_pcs
  // is only an explicit override (e.g. loose_grid bottle/bag items, where the Ctn
  // row counts whole bottles/bags = the loose_sum unit, so the factor is always 1).
  // Plain count items derive their "Bag" factor from admin's per_bag_pcs (falling
  // back to per_box_pcs for true cartons with no bag breakdown). Items with
  // closing_box_row === false are "loose only" and never show this row.
  const closing_per_box_pcs = item.closing_box_row
    ? item.closing_per_box_pcs ?? item.per_bag_pcs ?? item.per_box_pcs
    : null;
  const box_sum =
    closing_per_box_pcs != null && entry.box_count != null
      ? entry.box_count * closing_per_box_pcs
      : null;

  return {
    under_cabinet: entry.under_cabinet ?? null,
    non_coffee,
    loose_rows: entry.loose_rows ?? null,
    loose_lines: entry.loose_lines ?? null,
    loose_extra: entry.loose_extra ?? null,
    unopened_stacks: entry.unopened_stacks ?? null,
    unopened_loose_pcs: entry.unopened_loose_pcs ?? null,
    container_id: entry.container_id ?? null,
    gross_weight: entry.gross_weight ?? null,
    loose,
    loose_sum,
    box_count: entry.box_count ?? null,
    box_sum,
    total: sumNullable(loose_sum, box_sum, stack_box_sum),
    whipping_cream: whippingCream,
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

// --- Self-check (countingflow.md S-01/E-03): re-runs every calc and flags
// rows whose computed values look wrong so they can be fixed before submission.
export function runSelfCheck(record: DailyRecord, items: Item[]): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];

  for (const item of items) {
    if (item.appears_in.includes("back")) {
      const total = record.back[item.id]?.total;
      if (total != null && total < 0) {
        warnings.push({
          itemId: item.id,
          stage: "back",
          field: "total",
          message: `${item.name}: Back total is negative (${total})`,
          severity: "error",
        });
      }
    }

    if (item.appears_in.includes("front")) {
      const total = record.front[item.id]?.total;
      if (total != null && total < 0) {
        warnings.push({
          itemId: item.id,
          stage: "front",
          field: "total",
          message: `${item.name}: Front total is negative (${total})`,
          severity: "error",
        });
      }
    }

    if (item.appears_in.includes("expired")) {
      const entry = record.material_loss[item.id];
      if (entry?.result != null && entry.result < 0) {
        warnings.push({
          itemId: item.id,
          stage: "expired",
          field: "result",
          message: `${item.name}: Loss result is negative (${entry.result.toFixed(2)})`,
          severity: "error",
        });
      }
    }

    if (item.appears_in.includes("closing")) {
      const entry = record.closing[item.id];
      if (entry?.loose != null && entry.loose < 0) {
        warnings.push({
          itemId: item.id,
          stage: "closing",
          field: "loose",
          message: `${item.name}: derived loose amount is negative (${entry.loose.toFixed(2)})`,
          severity: "error",
        });
      }
      if (entry?.total != null && entry.total < 0) {
        warnings.push({
          itemId: item.id,
          stage: "closing",
          field: "total",
          message: `${item.name}: Closing total is negative (${entry.total.toFixed(2)})`,
          severity: "error",
        });
      }
    }

    // E-03: every Closing item must have a Sheet2 row
    if (record.closing[item.id] && !record.sheet2[item.id]) {
      warnings.push({
        itemId: item.id,
        stage: "sheet2",
        field: "total",
        message: `${item.name}: missing Sheet2 row for Closing entry (E-03)`,
        severity: "error",
      });
    }
  }

  return warnings;
}
