"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";

export default function FrontPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);
  const setFront = useCountingStore((s) => s.setFront);

  const items = seedItems
    .filter((i) => i.appears_in.includes("front"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stage 2 — Front (Bar Area)</h2>
      <p className="text-sm text-gray-500">
        Count by box/unit only — no loose items at this stage.
      </p>

      <div className="space-y-3">
        {items.map((item) => {
          const entry = record.front[item.id];
          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs uppercase text-gray-400">{item.category}</div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="font-medium">{item.name}</div>
                <div className="text-sm text-gray-500">/box: {item.per_box_pcs ?? "–"}</div>
              </div>

              <label className="mb-1 block text-sm text-gray-600">Box count</label>
              <input
                type="number"
                className="mb-2 w-32 rounded border border-blue-200 bg-input px-2 py-1"
                value={entry?.box_count ?? ""}
                onChange={(e) =>
                  setFront(item.id, {
                    box_count: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              />

              <div className="font-medium">Total: {entry?.total ?? 0} pcs</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
