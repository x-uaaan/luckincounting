import { create } from "zustand";
import type { Item, Container } from "@/lib/types";
import { seedItems } from "@/data/seedItems";
import { CONTAINERS } from "@/data/containers";
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
  loaded: boolean;

  init: () => Promise<void>;

  addItem: (item: Item) => void;
  updateItem: (id: string, partial: Partial<Item>) => void;
  deleteItem: (id: string) => void;

  addContainer: (container: Container) => void;
  updateContainer: (id: string, partial: Partial<Container>) => void;
  deleteContainer: (id: string) => void;
}

export const useItemsStore = create<ItemsState>((set, get) => ({
  items: seedItems,
  containers: CONTAINERS,
  loaded: false,

  init: async () => {
    if (get().loaded) return;

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

      set({ items, containers, loaded: true });
      return;
    }

    const items = loadLocal<Item[]>(ITEMS_KEY, seedItems);
    const containers = loadLocal<Container[]>(CONTAINERS_KEY, CONTAINERS);
    saveLocal(ITEMS_KEY, items);
    saveLocal(CONTAINERS_KEY, containers);
    set({ items, containers, loaded: true });
  },

  addItem: (item) => {
    const items = [...get().items, item];
    set({ items });
    saveLocal(ITEMS_KEY, items);
    void upsertItem(item);
  },

  updateItem: (id, partial) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, ...partial } : i));
    set({ items });
    saveLocal(ITEMS_KEY, items);
    const updated = items.find((i) => i.id === id);
    if (updated) void upsertItem(updated);
  },

  deleteItem: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    set({ items });
    saveLocal(ITEMS_KEY, items);
    void deleteItemRemote(id);
  },

  addContainer: (container) => {
    const containers = [...get().containers, container];
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    void upsertContainer(container);
  },

  updateContainer: (id, partial) => {
    const containers = get().containers.map((c) => (c.id === id ? { ...c, ...partial } : c));
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    const updated = containers.find((c) => c.id === id);
    if (updated) void upsertContainer(updated);
  },

  deleteContainer: (id) => {
    const containers = get().containers.filter((c) => c.id !== id);
    set({ containers });
    saveLocal(CONTAINERS_KEY, containers);
    void deleteContainerRemote(id);
  },
}));
