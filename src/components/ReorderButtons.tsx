"use client";

import { useItemsStore } from "@/store/useItemsStore";
import type { Item } from "@/lib/types";

type SortField = "sort_order" | "closing_sort_order" | "front_sort_order";

interface Props {
  item: Item;
  items: Item[];
  sortField?: SortField;
}

export default function ReorderButtons({ item, items, sortField = "sort_order" }: Props) {
  const moveItem = useItemsStore((s) => s.moveItem);

  const getVal = (i: Item): number =>
    sortField === "sort_order"
      ? i.sort_order
      : sortField === "closing_sort_order"
      ? (i.closing_sort_order ?? i.sort_order)
      : (i.front_sort_order ?? i.sort_order);

  const peers = items.filter((i) => i.category === item.category).sort((a, b) => getVal(a) - getVal(b));
  const idx = peers.findIndex((i) => i.id === item.id);

  return (
    <div className="reorder-btns">
      <button
        className="reorder-arrow"
        disabled={idx === 0}
        onPointerDown={(e) => { e.preventDefault(); moveItem(item.id, -1, sortField); }}
      >
        ↑
      </button>
      <button
        className="reorder-arrow"
        disabled={idx === peers.length - 1}
        onPointerDown={(e) => { e.preventDefault(); moveItem(item.id, 1, sortField); }}
      >
        ↓
      </button>
    </div>
  );
}
