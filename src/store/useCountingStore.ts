import { create } from "zustand";
import type {
  DailyRecord,
  BackEntry,
  FrontEntry,
  MaterialLossEntry,
  MaterialInventoryEntry,
  ClosingEntry,
} from "@/lib/types";
import { seedItems } from "@/data/seedItems";
import {
  calcBack,
  calcFront,
  calcMaterialLoss,
  calcMaterialInventory,
  calcClosing,
  calcSheet2,
} from "@/lib/calculations";

function emptyRecord(date: string): DailyRecord {
  return {
    date,
    status: "draft",
    back: {},
    front: {},
    material_loss: {},
    material_inventory: {},
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
    partial: Pick<MaterialLossEntry, "total_volume" | "rate_value">
  ) => void;
  setMaterialInventory: (
    itemId: string,
    partial: Pick<MaterialInventoryEntry, "under_cabinet" | "non_coffee">
  ) => void;
  setClosing: (itemId: string, partial: Pick<ClosingEntry, "loose" | "box_count">) => void;

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

    const entry = calcMaterialLoss(item, partial, addendResult);
    set({
      record: { ...record, material_loss: { ...record.material_loss, [itemId]: entry } },
    });
  },

  setMaterialInventory: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    // Whipping Cream subtracts the Cream-row canister result (E-06)
    const creamLossResult =
      itemId === "whipping_cream" ? record.material_loss["cream"]?.result ?? null : null;

    const entry = calcMaterialInventory(item, partial, creamLossResult);
    set({
      record: {
        ...record,
        material_inventory: { ...record.material_inventory, [itemId]: entry },
      },
    });
  },

  setClosing: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const item = seedItems.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcClosing(item, partial);
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
