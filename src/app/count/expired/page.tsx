"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import NumericInput from "@/components/NumericInput";

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

  const inputItems = items.filter(
    (i) => i.loss_role === "input" || i.loss_role === "input_and_summary"
  );
  const summaryItems = items.filter(
    (i) => i.loss_role === "summary" || i.loss_role === "input_and_summary"
  );

  return (
    <>
      {inputItems.map((item) => {
        const entry = record.material_loss[item.id];

        const containerOptions = item.default_container_id ? containers : null;
        const selectedContainerId = entry?.container_id ?? item.default_container_id ?? "";
        const tare = selectedContainerId
          ? containers.find((c) => c.id === selectedContainerId)?.tare_g ?? 0
          : 0;

        let formulaCheck = "";
        if (item.loss_formula === "components") {
          const parts: string[] = [`${entry?.gross_weight ?? 0}`];
          for (const c of item.loss_components ?? []) {
            const src = record.material_loss[c.source_item_id]?.total_volume ?? 0;
            const srcName = items.find((i) => i.id === c.source_item_id)?.name ?? c.source_item_id;
            parts.push(`${srcName}(${src}) × ${c.rate.toFixed(3)}`);
          }
          formulaCheck = `${parts.join(" + ")} = ${
            entry?.result != null ? entry.result.toFixed(2) : 0
          } g`;
        }

        return (
          <div key={item.id} className={`card ${errorItemIds.has(item.id) || (entry?.result != null && entry.result < 0) ? "warn" : ""}`}>
            <div className="card-head">
              <div>
                <div className="title">{item.name}</div>
                <div className="subtitle">{item.category} · g</div>
              </div>
              <div className="total">{entry?.result != null ? entry.result.toFixed(2) : 0} g</div>
            </div>

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
                <div className="lbl">{containerOptions ? "Gross wt" : "Weight (g)"}</div>
                <NumericInput
                  value={entry?.gross_weight ?? null}
                  onChange={(v) =>
                    setMaterialLoss(item.id, {
                      container_id: selectedContainerId || null,
                      gross_weight: v,
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
              {item.loss_formula === "multiply" && (
                <>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">Rate</div>
                    <div className="const">{item.loss_rate?.toFixed(3)}</div>
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

      <div className="category-label">Summary</div>
      {summaryItems.map((item) => {
        const entry = record.material_loss[item.id];

        let derivation = "";
        if (item.loss_formula === "components" && (item.loss_components?.length ?? 0) > 0) {
          const parts: string[] = [];
          if (entry?.total_volume != null) parts.push(`${entry.total_volume}`);
          for (const c of item.loss_components ?? []) {
            const src = record.material_loss[c.source_item_id]?.total_volume ?? 0;
            const srcName = items.find((i) => i.id === c.source_item_id)?.name ?? c.source_item_id;
            parts.push(`${srcName}(${src}) × ${c.rate.toFixed(3)}`);
          }
          derivation = `${parts.join(" + ")} = ${entry?.result != null ? entry.result.toFixed(2) : 0} g`;
        }

        return (
          <div key={item.id} className="card">
            <div className="card-head">
              <div>
                <div className="title">{item.name}</div>
                <div className="subtitle">{item.category} · g</div>
              </div>
              <div className="total">{entry?.result != null ? entry.result.toFixed(2) : 0} g</div>
            </div>
            {derivation && <div className="check">{derivation}</div>}
          </div>
        );
      })}
    </>
  );
}
