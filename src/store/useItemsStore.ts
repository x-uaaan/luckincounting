import { create } from "zustand";
import type { Item, Container } from "@/lib/types";
import { seedItems } from "@/data/seedItems";
import { CONTAINERS } from "@/data/containers";
import { logActivity } from "@/lib/activityLog";
import {
  isSupabaseConfigured,
  fetchItems,
  fetchContainers,
  upsertItem,
  deleteItem as deleteItemRemote,
  upsertContainer,
  deleteContainer as deleteContainerRemote,
} from "@/lib/itemsRepo";

const ITEMS_KEY = "luckin_items";
const CONTAINERS_KEY = "luckin_containers";
const DELETED_ITEMS_KEY = "luckin_deleted_items";

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

interface ItemsState {
  items: Item[];
  containers: Container[];
  deletedItems: Item[];
  loaded: boolean;
  reorderMode: boolean;

  init: () => Promise<void>;

  addItem: (item: Item) => void;
  updateItem: (id: string, partial: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  restoreItem: (id: string) => void;
  purgeDeletedItem: (id: string) => void;

  moveItem: (id: string, direction: number, sortField: "sort_order" | "closing_sort_order" | "front_sort_order" | "final_sort_order") => void;

  addContainer: (container: Container) => void;
  updateContainer: (id: string, partial: Partial<Container>) => void;
  deleteContainer: (id: string) => void;

  setReorderMode: (on: boolean) => void;
  reseedLossItems: () => Promise<void>;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: seedItems,
  containers: CONTAINERS,
  deletedItems: [],
  loaded: false,
  reorderMode: false,

  init: async () => {
    if (get().loaded) return;

    const deletedItems = loadLocal<Item[]>(DELETED_ITEMS_KEY, []);

    if (isSupabaseConfigured()) {
      let items = await fetchItems();
      let containers = await fetchContainers();

      if (!items || items.length === 0) {
        for (const item of seedItems) await upsertItem(item);
        items = seedItems;
      }
      if (!containers || containers.length === 0) {
        for (const c of CONTAINERS) await upsertContainer(c);
        containers = CONTAINERS;
      }

      set({ items, containers, deletedItems, loaded: true });
      return;
    }

    const items = loadLocal<Item[]>(ITEMS_KEY, seedItems);
    const containers = loadLocal<Container[]>(CONTAINERS_KEY, CONTAINERS);
    saveLocal(ITEMS_KEY, items);
    saveLocal(CONTAINERS_KEY, containers);
    set({ items, containers, deletedItems, loaded: true });
  },

  addItem: (item) => {
    const items = [...get().items, item];
    set({ items });
    saveLocal(ITEMS_KEY, items);
    void upsertItem(item);
    logActivity({ action: "add", kind: "item", label: item.name, id: item.id });
  },

  updateItem: (id, partial) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, ...partial } : i));
    set({ items });
    saveLocal(ITEMS_KEY, items);
    const updated = items.find((i) => i.id === id);
    if (updated) void upsertItem(updated);
  },

  deleteItem: (id) => {
    const target = get().items.find((i) => i.id === id);
    const items = get().items.filter((i) => i.id !== id);
    set({ items });
    saveLocal(ITEMS_KEY, items);

    // Save to recently deleted (keep last 20)
    if (target) {
      const deletedItems = [target, ...get().deletedItems.filter((i) => i.id !== id)].slice(0, 20);
      set({ deletedItems });
      saveLocal(DELETED_ITEMS_KEY, deletedItems);
    }

    if (target) logActivity({ action: "delete", kind: "item", label: target.name, id: target.id });
    void deleteItemRemote(id);
  },

  restoreItem: (id) => {
    const target = get().deletedItems.find((i) => i.id === id);
    if (!target) return;
    const deletedItems = get().deletedItems.filter((i) => i.id !== id);
    const items = [...get().items, target];
    set({ items, deletedItems });
    saveLocal(ITEMS_KEY, items);
    saveLocal(DELETED_ITEMS_KEY, deletedItems);
    void upsertItem(target);
  },

  purgeDeletedItem: (id) => {
    const deletedItems = get().deletedItems.filter((i) => i.id !== id);
    set({ deletedItems });
    saveLocal(DELETED_ITEMS_KEY, deletedItems);
  },

  moveItem: (id, direction, sortField) => {
    const allItems = get().items;
    const item = allItems.find((i) => i.id === id);
    if (!item) return;

    const getVal = (i: Item): number =>
      sortField === "sort_order" ? i.sort_order
      : sortField === "closing_sort_order" ? (i.closing_sort_order ?? i.sort_order)
      : sortField === "front_sort_order" ? (i.front_sort_order ?? i.sort_order)
      : (i.final_sort_order ?? i.sort_order);

    // final_sort_order: move globally across all sheet2 items (enables category reorder)
    const peers = sortField === "final_sort_order"
      ? allItems.filter((i) => i.appears_in.includes("sheet2")).sort((a, b) => getVal(a) - getVal(b))
      : allItems
          .filter((i) => i.category === item.category && i.appears_in.some((s) => item.appears_in.includes(s)))
          .sort((a, b) => getVal(a) - getVal(b));

    const idx = peers.findIndex((i) => i.id === id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= peers.length) return;

    const other = peers[swapIdx];
    const myVal = getVal(item);
    const otherVal = getVal(other);

    // Swap the sort values
    get().updateItem(id, { [sortField]: otherVal } as Partial<Item>);
    get().updateItem(other.id, { [sortField]: myVal } as Partial<Item>);
  },

  addContainer: (container) => {
    const containers = [...get().containers, container];
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    void upsertContainer(container);
    logActivity({ action: "add", kind: "container", label: container.name, id: container.id });
  },

  updateContainer: (id, partial) => {
    const containers = get().containers.map((c) => (c.id === id ? { ...c, ...partial } : c));
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    const updated = containers.find((c) => c.id === id);
    if (updated) void upsertContainer(updated);
  },

  deleteContainer: (id) => {
    const target = get().containers.find((c) => c.id === id);
    const containers = get().containers.filter((c) => c.id !== id);
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    if (target) logActivity({ action: "delete", kind: "container", label: target.name, id: target.id });
    void deleteContainerRemote(id);
  },

  setReorderMode: (on) => set({ reorderMode: on }),

  reseedLossItems: async () => {
    const lossOnlyIds = new Set(
      seedItems.filter((i) => i.appears_in.every((s) => s === "expired")).map((i) => i.id)
    );
    const current = get().items;
    // Remove any expired-only item (old or new seed)
    const expiredOnlyIds = current
      .filter((i) => i.appears_in.every((s) => s === "expired"))
      .map((i) => i.id);
    for (const id of expiredOnlyIds) {
      await deleteItemRemote(id);
    }
    let kept = current.filter((i) => !expiredOnlyIds.includes(i.id));
    // Patch multi-stage items whose loss config must match new seed
    kept = kept.map((item) => {
      const seedVersion = seedItems.find((s) => s.id === item.id);
      if (!seedVersion) return item;
      // Sync loss-related fields from seed if they differ
      return {
        ...item,
        appears_in: seedVersion.appears_in,
        loss_formula: seedVersion.loss_formula,
        loss_rate: seedVersion.loss_rate,
        loss_components: seedVersion.loss_components,
        loss_role: seedVersion.loss_role,
      };
    });
    for (const item of kept) await upsertItem(item);
    // Add fresh seed loss items
    const lossSeeds = seedItems.filter((i) => lossOnlyIds.has(i.id));
    for (const item of lossSeeds) await upsertItem(item);
    const items = [...kept, ...lossSeeds];
    set({ items });
    saveLocal(ITEMS_KEY, items);
  },
}));
