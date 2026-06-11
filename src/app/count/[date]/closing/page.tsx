"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";

const looseLabel: Record<string, string> = {
  weight: "Loose (g/ml, from scale)",
  count: "Loose (pcs)",
  sleeves: "Open sleeves",
};

export default function ClosingPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);
  const setClosing = useCountingStore((s) => s.setClosing);

  const items = seedItems
    .filter((i) => i.appears_in.includes("closing"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stage 4 — Closing</h2>
      <p className="text-sm text-gray-500">
        Fields can be left empty — this only triggers a warning before final submission, not a hard
        block.
      </p>

      <div className="space-y-3">
        {items.map((item) => {
          const entry = record.closing[item.id];
          const isPandanWarning = item.id === "pandan" && entry?.loose == null;

          return (
            <div
              key={item.id}
              className={`rounded-lg border bg-white p-3 shadow-sm ${
                isPandanWarning ? "border-warn" : "border-gray-200"
              }`}
            >
              <div className="mb-2 text-xs uppercase text-gray-400">{item.category}</div>
              <div className="mb-2 font-medium">{item.name}</div>

              {isPandanWarning && (
                <div className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                  ⚠ Container measurement missing — see COUNTING_RULES.md S-01
                </div>
              )}

              <label className="mb-1 block text-sm text-gray-600">
                {looseLabel[item.closing_input_type]}
              </label>
              <input
                type="number"
                className="mb-2 w-32 rounded border border-blue-200 bg-input px-2 py-1"
                value={entry?.loose ?? ""}
                onChange={(e) =>
                  setClosing(item.id, {
                    loose: e.target.value === "" ? null : Number(e.target.value),
                    box_count: entry?.box_count ?? null,
                  })
                }
              />
              <div className="mb-2 text-sm text-gray-500">
                Loose sum: {entry?.loose_sum != null ? entry.loose_sum.toFixed(3) : "–"} (auto)
              </div>

              {item.per_box_pcs != null && (
                <>
                  <label className="mb-1 block text-sm text-gray-600">Full boxes</label>
                  <input
                    type="number"
                    className="mb-2 w-32 rounded border border-blue-200 bg-input px-2 py-1"
                    value={entry?.box_count ?? ""}
                    onChange={(e) =>
                      setClosing(item.id, {
                        loose: entry?.loose ?? null,
                        box_count: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                  <div className="mb-2 text-sm text-gray-500">
                    Box sum: {entry?.box_sum ?? 0} pcs (auto)
                  </div>
                </>
              )}

              <div className="font-medium">Total: {entry?.total?.toFixed(3) ?? 0}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
