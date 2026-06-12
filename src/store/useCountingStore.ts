import { create } from "zustand";
import type {
  DailyRecord,
  BackEntry,
  FrontEntry,
  MaterialLossEntry,
  ClosingEntry,
  WhippingCreamCalc,
} from "@/lib/types";
import { seedItems } from "@/data/seedItems";
import { CONTAINERS } from "@/data/containers";
import { calcBack, calcFront, calcMaterialLoss, calcClosing, calcSheet2 } from "@/lib/calculations";

function emptyRecord(date: string): DailyRecord {
  return {
    date,
    status: "draft",
    back: {},
    front: {},
    material_loss: {},
    closing: {},
    sheet2: {},
    approved_by: null,
    approved_at: null,
    drive_file_id: null,
  };
}

interface CountingState {
  date: string | null;
  record: DailyRecord | null;

  loadDate: (date: string) => void;

  setBack: (itemId: string, partial: Pick<BackEntry, "open_bags" | "box_count">) => void;
  setFront: (itemId: string, partial: Pick<FrontEntry, "box_count">) => void;
  setMaterialLoss: (
    itemId: string,
    partial: Pick<MaterialLossEntry, "container_id" | "gross_weight" | "rate_value"> & {
      whipping_cream?: WhippingCreamCalc;
    }
  ) => void;
  setClosing: (
    itemId: string,
    partial: Pick<
      ClosingEntry,
      | "under_cabinet"
      | "non_coffee"
      | "loose_rows"
      | "loose_lines"
      | "loose_extra"
      | "loose"
      | "box_count"
    >
  ) => void;

  recomputeSheet2: () => void;
}

export const useCountingStore = create<CountingState>((set, get) => ({
  date: null,
  record: null,

  loadDate: (date) => {
    // TODO: replace with Supabase fetch; falls back to a fresh draft.
    set({ date, record: emptyRecord(date) });
  },

  setBack: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcBack(item, partial);
    set({ record: { ...record, back: { ...record.back, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  setFront: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcFront(item, partial);
    set({ record: { ...record, front: { ...record.front, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  setMaterialLoss: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    // "add" formula items (e.g. Milk) depend on another item's Loss result
    const addendResult =
      item.loss_addend_item_id != null
        ? record.material_loss[item.loss_addend_item_id]?.result ?? null
        : null;

    const entry = calcMaterialLoss(item, partial, { addendResult, containers: CONTAINERS });
    const material_loss = { ...record.material_loss, [itemId]: entry };

    // "add" formula items consuming this item's result (e.g. Milk <- Milk-Cheese) recompute
    const dependent = seedItems.find((i) => i.loss_addend_item_id === itemId);
    if (dependent) {
      const depEntry = record.material_loss[dependent.id];
      if (depEntry) {
        material_loss[dependent.id] = calcMaterialLoss(dependent, depEntry, {
          addendResult: entry.result,
          containers: CONTAINERS,
        });
      }
    }

    set({ record: { ...record, material_loss } });

    // Whipping Cream's closing total derives from Cream's loss result (§A.7)
    if (itemId === "cream") {
      get().setClosing("whipping_cream", record.closing["whipping_cream"] ?? {
        under_cabinet: null,
        non_coffee: null,
        loose_rows: null,
        loose_lines: null,
        loose_extra: null,
        loose: null,
        box_count: null,
      });
    }
  },

  setClosing: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    const creamCanisterValue =
      item.closing_inventory_formula === "whipping_cream"
        ? record.material_loss["cream"]?.result ?? null
        : null;

    const entry = calcClosing(item, partial, creamCanisterValue);
    set({ record: { ...record, closing: { ...record.closing, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  recomputeSheet2: () => {
    const { record } = get();
    if (!record) return;

    const sheet2: DailyRecord["sheet2"] = {};
    for (const item of seedItems) {
      const back = record.back[item.id]?.total ?? null;
      const front = record.front[item.id]?.total ?? null;
      const closing = record.closing[item.id]?.total ?? null;

      // Items not present in a stage are treated as 0 (COUNTING_RULES.md 3.5)
      if (back == null && front == null && closing == null) continue;
      sheet2[item.id] = calcSheet2(back, front, closing);
    }

    set({ record: { ...record, sheet2 } });
  },
}));
