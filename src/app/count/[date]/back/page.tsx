"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";
import { checkBoxSumMismatch } from "@/lib/calculations";

export default function BackPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);
  const setBack = useCountingStore((s) => s.setBack);

  const items = seedItems
    .filter((i) => i.appears_in.includes("back"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  let currentCategory = "";

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stage 1 — Back (Store Room)</h2>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="p-2">Item</th>
              <th className="p-2 text-right">/bag pcs</th>
              <th className="p-2 text-right">Open</th>
              <th className="p-2 text-right">Bag Sum</th>
              <th className="p-2 text-right">/box pcs</th>
              <th className="p-2 text-right">Box</th>
              <th className="p-2 text-right">Box Sum</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const entry = record.back[item.id];
              const showCategory = item.category !== currentCategory;
              currentCategory = item.category;

              const mismatch = checkBoxSumMismatch(
                entry?.box_count ?? null,
                item.per_box_pcs,
                entry?.box_sum ?? null
              );

              return (
                <>
                  {showCategory && (
                    <tr key={`${item.category}-hdr`} className="bg-gray-100">
                      <td colSpan={8} className="p-2 font-medium text-gray-600">
                        {item.category}
                      </td>
                    </tr>
                  )}
                  <tr key={item.id} className="border-b border-gray-100">
                    <td className="p-2">{item.name}</td>
                    <td className="p-2 text-right text-gray-500">
                      {item.per_bag_pcs ?? "–"}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        className="w-20 rounded border border-blue-200 bg-input px-2 py-1 text-right"
                        value={entry?.open_bags ?? ""}
                        onChange={(e) =>
                          setBack(item.id, {
                            open_bags: e.target.value === "" ? null : Number(e.target.value),
                            box_count: entry?.box_count ?? null,
                          })
                        }
                      />
                    </td>
                    <td className="p-2 text-right text-gray-500">
                      {entry?.bag_sum ?? (item.per_bag_pcs == null ? "–" : 0)}
                    </td>
                    <td className="p-2 text-right text-gray-500">
                      {item.per_box_pcs ?? "–"}
                    </td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        className="w-20 rounded border border-blue-200 bg-input px-2 py-1 text-right"
                        value={entry?.box_count ?? ""}
                        onChange={(e) =>
                          setBack(item.id, {
                            open_bags: entry?.open_bags ?? null,
                            box_count: e.target.value === "" ? null : Number(e.target.value),
                          })
                        }
                      />
                    </td>
                    <td
                      className={`p-2 text-right ${
                        mismatch ? "rounded border border-warn bg-red-50" : "text-gray-500"
                      }`}
                    >
                      {entry?.box_sum ?? (item.per_box_pcs == null ? "–" : 0)}
                    </td>
                    <td className="p-2 text-right font-medium">{entry?.total ?? 0}</td>
                  </tr>
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {items.map((item) => {
          const entry = record.back[item.id];
          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-xs uppercase text-gray-400">{item.category}</div>
              <div className="mb-2 font-medium">{item.name}</div>

              <label className="mb-1 block text-sm text-gray-600">
                Open bags{item.per_bag_pcs == null ? " (whole units)" : ""}
              </label>
              <input
                type="number"
                className="mb-2 w-full rounded border border-blue-200 bg-input px-2 py-1"
                value={entry?.open_bags ?? ""}
                onChange={(e) =>
                  setBack(item.id, {
                    open_bags: e.target.value === "" ? null : Number(e.target.value),
                    box_count: entry?.box_count ?? null,
                  })
                }
              />
              <div className="mb-2 text-sm text-gray-500">
                Bag sum: {entry?.bag_sum ?? (item.per_bag_pcs == null ? "–" : 0)} pcs (auto)
              </div>

              {item.per_box_pcs != null && (
                <>
                  <label className="mb-1 block text-sm text-gray-600">Full boxes</label>
                  <input
                    type="number"
                    className="mb-2 w-full rounded border border-blue-200 bg-input px-2 py-1"
                    value={entry?.box_count ?? ""}
                    onChange={(e) =>
                      setBack(item.id, {
                        open_bags: entry?.open_bags ?? null,
                        box_count: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <div className="mb-2 text-sm text-gray-500">
                    Box sum: {entry?.box_sum ?? 0} pcs (auto)
                  </div>
                </>
              )}

              <div className="font-medium">Total: {entry?.total ?? 0} pcs</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
