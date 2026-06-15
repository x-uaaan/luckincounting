import { create } from "zustand";
import type {
  DailyRecord,
  BackEntry,
  FrontEntry,
  MaterialLossEntry,
  ClosingEntry,
  WhippingCreamCalc,
  ValidationWarning,
} from "@/lib/types";
import { useItemsStore } from "@/store/useItemsStore";
import {
  calcBack,
  calcFront,
  calcMaterialLoss,
  calcClosing,
  calcSheet2,
  runSelfCheck,
} from "@/lib/calculations";

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
  selfCheckWarnings: ValidationWarning[];
  selfCheckRan: boolean;

  loadDate: (date: string) => void;
  runSelfCheck: () => void;

  setBack: (itemId: string, partial: Pick<BackEntry, "open_bags" | "box_count">) => void;
  setFront: (itemId: string, partial: Pick<FrontEntry, "box_count">) => void;
  setMaterialLoss: (
    itemId: string,
    partial: Pick<MaterialLossEntry, "container_id" | "gross_weight" | "rate_value">
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
      | "unopened_stacks"
      | "unopened_loose_pcs"
    > & {
      whipping_cream?: WhippingCreamCalc | null;
    }
  ) => void;

  recomputeSheet2: () => void;
}

export const useCountingStore = create<CountingState>((set, get) => ({
  date: null,
  record: null,
  selfCheckWarnings: [],
  selfCheckRan: false,

  loadDate: (date) => {
    // TODO: replace with Supabase fetch; falls back to a fresh draft.
    set({ date, record: emptyRecord(date), selfCheckWarnings: [], selfCheckRan: false });
  },

  runSelfCheck: () => {
    const { record } = get();
    if (!record) return;
    const { items } = useItemsStore.getState();
    set({ selfCheckWarnings: runSelfCheck(record, items), selfCheckRan: true });
  },

  setBack: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const { items } = useItemsStore.getState();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcBack(item, partial);
    set({ record: { ...record, back: { ...record.back, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  setFront: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const { items } = useItemsStore.getState();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcFront(item, partial);
    set({ record: { ...record, front: { ...record.front, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  setMaterialLoss: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const { items, containers } = useItemsStore.getState();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const componentTotals: Record<string, number | null> = {};
    for (const i of items) {
      componentTotals[i.id] = record.material_loss[i.id]?.total_volume ?? null;
    }

    const entry = calcMaterialLoss(item, partial, { containers, componentTotals });
    const material_loss = { ...record.material_loss, [itemId]: entry };

    // Recompute every item whose "components" formula sources this item's total_volume
    componentTotals[itemId] = entry.total_volume;
    const dependents = items.filter((i) =>
      i.loss_components?.some((c) => c.source_item_id === itemId)
    );
    for (const dep of dependents) {
      const depPartial = record.material_loss[dep.id] ?? {
        container_id: null,
        gross_weight: null,
        rate_value: null,
      };
      material_loss[dep.id] = calcMaterialLoss(dep, depPartial, { containers, componentTotals });
    }

    set({ record: { ...record, material_loss } });
  },

  setClosing: (itemId, partial) => {
    const { record } = get();
    if (!record) return;
    const { items } = useItemsStore.getState();
    const item = items.find((i) => i.id === itemId);
    if (!item) return;

    const entry = calcClosing(item, partial);
    set({ record: { ...record, closing: { ...record.closing, [itemId]: entry } } });
    get().recomputeSheet2();
  },

  recomputeSheet2: () => {
    const { record } = get();
    if (!record) return;
    const { items } = useItemsStore.getState();

    const sheet2: DailyRecord["sheet2"] = {};
    for (const item of items) {
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
