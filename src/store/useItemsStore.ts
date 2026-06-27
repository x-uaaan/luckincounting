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
  moveClosingCategory: (category: string, direction: number) => void;

  addContainer: (container: Container) => void;
  updateContainer: (id: string, partial: Partial<Container>) => void;
  deleteContainer: (id: string) => void;
  moveContainer: (id: string, direction: number) => void;

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

  moveClosingCategory: (category, direction) => {
    const allItems = get().items;
    const closingItems = allItems
      .filter((i) => i.appears_in.includes("closing"))
      .sort((a, b) => (a.closing_sort_order ?? a.sort_order) - (b.closing_sort_order ?? b.sort_order));

    const cats = [...new Set(closingItems.map((i) => i.category))];
    const catIdx = cats.indexOf(category);
    const swapIdx = catIdx + direction;
    if (catIdx < 0 || swapIdx < 0 || swapIdx >= cats.length) return;

    const swapCat = cats[swapIdx];
    const catItems = closingItems.filter((i) => i.category === category);
    const swapItems = closingItems.filter((i) => i.category === swapCat);

    const merged = [
      ...catItems.map((i) => i.closing_sort_order ?? i.sort_order),
      ...swapItems.map((i) => i.closing_sort_order ?? i.sort_order),
    ].sort((a, b) => a - b);

    // direction < 0 = move up: catItems take the earlier slots
    // direction > 0 = move down: swapItems take the earlier slots
    const [firstGroup, secondGroup] =
      direction < 0 ? [catItems, swapItems] : [swapItems, catItems];
    firstGroup.forEach((item, i) => get().updateItem(item.id, { closing_sort_order: merged[i] }));
    secondGroup.forEach((item, i) =>
      get().updateItem(item.id, { closing_sort_order: merged[firstGroup.length + i] })
    );
  },

  moveContainer: (id, direction) => {
    const sorted = [...get().containers].sort((a, b) => a.sort_order - b.sort_order);
    const idx = sorted.findIndex((c) => c.id === id);
    const swapIdx = idx + direction;
    if (idx < 0 || swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    get().updateContainer(a.id, { sort_order: b.sort_order });
    get().updateContainer(b.id, { sort_order: a.sort_order });
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
    const current = get().items;
    const seedLossOnlyIds = new Set(
      seedItems.filter((i) => i.appears_in.every((s) => s === "expired")).map((i) => i.id)
    );
    // Old summary items no longer in seed — delete them
    const oldSummaryIds = ["cocoa_loss","soda_loss","milk_loss","sea_salt_cheese_loss","whipping_cream_loss","coconut_cream_loss","coconut_juice_loss"];
    const toDelete = [
      ...current.filter((i) => i.appears_in.every((s) => s === "expired") && !seedLossOnlyIds.has(i.id)).map((i) => i.id),
      ...oldSummaryIds,
    ];
    for (const id of [...new Set(toDelete)]) await deleteItemRemote(id);

    let kept = current.filter(
      (i) => !toDelete.includes(i.id)
    );
    // Patch multi-stage items' loss config from seed
    kept = kept.map((item) => {
      const sv = seedItems.find((s) => s.id === item.id);
      if (!sv) return item;
      return { ...item, appears_in: sv.appears_in, loss_formula: sv.loss_formula, loss_rate: sv.loss_rate, loss_components: sv.loss_components, loss_role: sv.loss_role };
    });
    for (const item of kept) await upsertItem(item);

    const lossSeeds = seedItems.filter((i) => seedLossOnlyIds.has(i.id));
    for (const item of lossSeeds) await upsertItem(item);

    const items = [...kept.filter((i) => !seedLossOnlyIds.has(i.id)), ...lossSeeds];
    set({ items });
    saveLocal(ITEMS_KEY, items);
  },
}));
