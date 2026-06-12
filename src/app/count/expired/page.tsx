"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import { calcWhippingCream } from "@/lib/calculations";
import type { WhippingCreamCalc } from "@/lib/types";

const DEFAULT_WHIPPING_CREAM: WhippingCreamCalc = {
  variants: [
    { id: "vanilla", name: "Vanilla", pump_count: 4, ml_per_pump: 5, empty_canister_weight: 150, total_weight: null },
    { id: "sakura", name: "Sakura", pump_count: 10, ml_per_pump: 5, empty_canister_weight: 150, total_weight: null },
  ],
  total_whipping_cream: null,
};

const MAX_CANISTERS = 5;

export default function ExpiredPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setMaterialLoss = useCountingStore((s) => s.setMaterialLoss);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);

  const items = allItems
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  const errorItemIds = new Set(
    selfCheckWarnings.filter((w) => w.stage === "expired").map((w) => w.itemId)
  );

  const creamEntry = record.material_loss["cream"];
  const whippingCream = creamEntry?.whipping_cream ?? DEFAULT_WHIPPING_CREAM;
  const totalCream = whippingCream.total_whipping_cream ?? calcWhippingCream(whippingCream).total_whipping_cream;

  return (
    <>
      <div className="summary">
        <div className="label">Total cream</div>
        <div className="value">{totalCream ?? 0} g</div>
      </div>

      {items.map((item) => {
        const entry = record.material_loss[item.id];
        const isPandanWarning = item.id === "pandan" && entry?.result == null;

        if (item.id === "cream") {
          return (
            <div key={item.id} className={`card ${errorItemIds.has(item.id) ? "warn" : ""}`}>
              <div className="card-head">
                <div>
                  <div className="title">{item.name}</div>
                  <div className="subtitle">{item.category} · g</div>
                </div>
                <div className="total">{entry?.result ?? 0} g</div>
              </div>

              {whippingCream.variants.map((v, idx) => {
                const syrup = v.pump_count * v.ml_per_pump;
                const cream = v.total_weight != null ? v.total_weight - syrup - v.empty_canister_weight : 0;
                return (
                  <div key={v.id} className="canister-block">
                    <div className="ref">
                      Syrup {syrup} · Container {v.empty_canister_weight}
                    </div>
                    <div className="row">
                      <div className="w105">
                        <div className="name">{v.name}</div>
                      </div>
                      <div className="field w70">
                        <div className="lbl">Total wt</div>
                        <input
                          inputMode="numeric"
                          value={v.total_weight ?? ""}
                          onChange={(e) => {
                            const variants = whippingCream.variants.map((vv, i) =>
                              i === idx
                                ? { ...vv, total_weight: e.target.value === "" ? null : Number(e.target.value) }
                                : vv
                            );
                            setMaterialLoss("cream", {
                              container_id: entry?.container_id ?? null,
                              gross_weight: entry?.gross_weight ?? null,
                              rate_value: entry?.rate_value ?? null,
                              whipping_cream: { variants, total_whipping_cream: null },
                            });
                          }}
                        />
                      </div>
                      <div className="op">→</div>
                      <div className="field w70">
                        <div className="lbl">Cream</div>
                        <input className="auto" disabled value={v.total_weight != null ? cream : ""} />
                      </div>
                    </div>
                    <div className="check">
                      {v.total_weight ?? 0} − {syrup} − {v.empty_canister_weight} = {v.total_weight != null ? cream : 0} g
                    </div>
                  </div>
                );
              })}

              <button
                className="add-btn"
                disabled={whippingCream.variants.length >= MAX_CANISTERS}
                onClick={() => {
                  const n = whippingCream.variants.length + 1;
                  const variants = [
                    ...whippingCream.variants,
                    {
                      id: `custom_${n}`,
                      name: `Custom ${n}`,
                      pump_count: 0,
                      ml_per_pump: 5,
                      empty_canister_weight: 150,
                      total_weight: null,
                    },
                  ];
                  setMaterialLoss("cream", {
                    container_id: entry?.container_id ?? null,
                    gross_weight: entry?.gross_weight ?? null,
                    rate_value: entry?.rate_value ?? null,
                    whipping_cream: { variants, total_whipping_cream: null },
                  });
                }}
              >
                + Add canister · {whippingCream.variants.length}/{MAX_CANISTERS}
              </button>

              <div className="check">
                {totalCream ?? 0} − 694 = {entry?.result ?? 0} g (feeds Whipping Cream closing, §A.7)
              </div>
            </div>
          );
        }

        const containerOptions = item.default_container_id
          ? containers
          : null;
        const selectedContainerId = entry?.container_id ?? item.default_container_id ?? "";
        const tare = selectedContainerId
          ? containers.find((c) => c.id === selectedContainerId)?.tare_g ?? 0
          : 0;

        let formulaCheck = "";
        if (item.loss_formula === "multiply") {
          formulaCheck = `(${entry?.gross_weight ?? 0} − ${tare}) × ${item.loss_rate?.toFixed(3)} = ${
            entry?.result != null ? entry.result.toFixed(2) : 0
          } g`;
        } else if (item.loss_formula === "add") {
          const addend = item.loss_addend_item_id
            ? record.material_loss[item.loss_addend_item_id]?.result ?? 0
            : 0;
          formulaCheck = `${entry?.gross_weight ?? 0} + ${addend.toFixed(2)} = ${
            entry?.result != null ? entry.result.toFixed(2) : 0
          } g`;
        }

        return (
          <div key={item.id} className={`card ${isPandanWarning || errorItemIds.has(item.id) ? "warn" : ""}`}>
            <div className="card-head">
              <div>
                <div className="title">{item.name}</div>
                <div className="subtitle">{item.category} · g</div>
              </div>
              <div className="total">{entry?.result != null ? entry.result.toFixed(2) : 0} g</div>
            </div>

            {isPandanWarning && (
              <div className="warning">⚠ Container measurement missing — measure before disposal (S-01)</div>
            )}

            <div className="row">
              {containerOptions && (
                <div className="field w105">
                  <div className="lbl">Container</div>
                  <select
                    value={selectedContainerId}
                    onChange={(e) =>
                      setMaterialLoss(item.id, {
                        container_id: e.target.value || null,
                        gross_weight: entry?.gross_weight ?? null,
                        rate_value: entry?.rate_value ?? null,
                      })
                    }
                  >
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.tare_g})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="field w70">
                <div className="lbl">Gross wt</div>
                <input
                  inputMode="numeric"
                  value={entry?.gross_weight ?? ""}
                  onChange={(e) =>
                    setMaterialLoss(item.id, {
                      container_id: selectedContainerId || null,
                      gross_weight: e.target.value === "" ? null : Number(e.target.value),
                      rate_value: entry?.rate_value ?? null,
                    })
                  }
                />
              </div>
              {containerOptions && (
                <>
                  <div className="op">−</div>
                  <div className="field w44">
                    <div className="lbl">Tare</div>
                    <div className="const">{tare}</div>
                  </div>
                </>
              )}
              <div className="op">=</div>
              <div className="field w70">
                <div className="lbl">Result</div>
                <input className="auto" disabled value={entry?.result != null ? entry.result.toFixed(2) : ""} />
              </div>
            </div>

            {formulaCheck && <div className="check">{formulaCheck}</div>}
          </div>
        );
      })}
    </>
  );
}
