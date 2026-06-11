"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";

const formulaLabel: Record<string, string> = {
  multiply: "result = total × loss_rate",
  subtract: "result = total − container ml",
  add: "result = total + linked item result",
  none: "not measured / not applicable",
};

export default function ExpiredPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);
  const setMaterialLoss = useCountingStore((s) => s.setMaterialLoss);
  const setMaterialInventory = useCountingStore((s) => s.setMaterialInventory);

  const lossItems = seedItems
    .filter((i) => i.appears_in.includes("expired") && i.loss_formula !== "none")
    .sort((a, b) => a.sort_order - b.sort_order);

  const pandanWarn = seedItems.find((i) => i.id === "pandan");

  const inventoryItems = seedItems
    .filter((i) => i.appears_in.includes("expired") && i.bag_size_g != null)
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  return (
    <div className="space-y-8">
      <h2 className="text-lg font-semibold">Stage 3 — Material Expired</h2>

      {/* Section A: Loss */}
      <section className="space-y-3">
        <h3 className="font-medium">A. Loss (Thrown Premix)</h3>

        {pandanWarn && record.material_loss["pandan"]?.result == null && (
          <div className="rounded border border-warn bg-red-50 px-3 py-2 text-sm text-red-700">
            ⚠ Pandan: container not measured — measure before disposal (S-01)
          </div>
        )}

        {lossItems.map((item) => {
          const entry = record.material_loss[item.id];
          const needsRateInput = item.loss_formula === "multiply" || item.loss_formula === "subtract";

          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-1 font-medium">{item.name}</div>
              <div className="mb-2 text-xs text-gray-400">{formulaLabel[item.loss_formula]}</div>

              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Total (ml/g)</label>
                  <input
                    type="number"
                    className="w-28 rounded border border-blue-200 bg-input px-2 py-1"
                    value={entry?.total_volume ?? ""}
                    onChange={(e) =>
                      setMaterialLoss(item.id, {
                        total_volume: e.target.value === "" ? null : Number(e.target.value),
                        rate_value: entry?.rate_value ?? null,
                      })
                    }
                  />
                </div>

                {needsRateInput && (
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">
                      {item.loss_formula === "multiply"
                        ? `Rate (default ${item.loss_rate?.toFixed(4)})`
                        : `Container ml (default ${item.loss_subtract_ml})`}
                    </label>
                    <input
                      type="number"
                      step="any"
                      className="w-28 rounded border border-blue-200 bg-input px-2 py-1"
                      placeholder={String(
                        item.loss_formula === "multiply" ? item.loss_rate : item.loss_subtract_ml
                      )}
                      value={entry?.rate_value ?? ""}
                      onChange={(e) =>
                        setMaterialLoss(item.id, {
                          total_volume: entry?.total_volume ?? null,
                          rate_value: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-sm text-gray-600">Result</label>
                  <div className="w-28 rounded border border-gray-100 bg-computed px-2 py-1 text-right">
                    {entry?.result != null ? entry.result.toFixed(2) : "–"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Section B: Inventory */}
      <section className="space-y-3">
        <h3 className="font-medium">B. Inventory (Remaining in Working Containers)</h3>
        <p className="text-sm text-gray-500">
          result = bag_size − under_cabinet − non_coffee. Feeds Closing &quot;loose&quot; (g).
        </p>

        {inventoryItems.map((item) => {
          const entry = record.material_inventory[item.id];
          return (
            <div key={item.id} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
              <div className="mb-1 font-medium">{item.name}</div>
              <div className="mb-2 text-xs text-gray-400">Bag size: {item.bag_size_g} g</div>

              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Under cabinet (g)</label>
                  <input
                    type="number"
                    className="w-28 rounded border border-blue-200 bg-input px-2 py-1"
                    value={entry?.under_cabinet ?? ""}
                    onChange={(e) =>
                      setMaterialInventory(item.id, {
                        under_cabinet: e.target.value === "" ? null : Number(e.target.value),
                        non_coffee: entry?.non_coffee ?? null,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Non-coffee (g)</label>
                  <input
                    type="number"
                    className="w-28 rounded border border-blue-200 bg-input px-2 py-1"
                    value={entry?.non_coffee ?? ""}
                    onChange={(e) =>
                      setMaterialInventory(item.id, {
                        under_cabinet: entry?.under_cabinet ?? null,
                        non_coffee: e.target.value === "" ? null : Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">Result (g)</label>
                  <div className="w-28 rounded border border-gray-100 bg-computed px-2 py-1 text-right">
                    {entry?.result != null ? entry.result.toFixed(2) : "–"}
                  </div>
                </div>
              </div>

              {item.id === "whipping_cream" && (
                <p className="mt-2 text-xs text-gray-400">
                  Subtracts Cream loss-section canister result automatically (E-06).
                </p>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
