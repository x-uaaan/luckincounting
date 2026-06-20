"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import NumericInput from "@/components/NumericInput";
import ReorderButtons from "@/components/ReorderButtons";
import type { Item } from "@/lib/types";

function toFraction(n: number): string {
  if (n === 0) return "0";
  if (n === 1) return "1";
  for (let d = 1; d <= 500; d++) {
    const num = Math.round(n * d);
    if (Math.abs(num / d - n) < 1e-9) {
      return num === d ? "1" : `${num}/${d}`;
    }
  }
  return n.toPrecision(4).replace(/\.?0+$/, "");
}

function fmt(v: number | null): string {
  if (v == null || v === 0) return "—";
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function ExpiredPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setMaterialLoss = useCountingStore((s) => s.setMaterialLoss);
  const allItems = useItemsStore((s) => s.items);
  const reorderMode = useItemsStore((s) => s.reorderMode);

  if (!record) return null;
  const activeRecord = record;

  const expiredItems = allItems
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const products = expiredItems.filter(
    (i) => i.loss_role === "input_and_summary" || i.loss_role === "input"
  );

  function getWeight(productId: string): number | null {
    return activeRecord.material_loss[productId]?.gross_weight ?? null;
  }

  function setWeight(productId: string, v: number | null) {
    setMaterialLoss(productId, { container_id: null, gross_weight: v, rate_value: null });
  }

  // Compute material totals from product inputs
  // Returns map: inventoryItemId -> total used (g)
  function computeSummary(): Map<string, number> {
    const totals = new Map<string, number>();

    for (const product of products) {
      const weight = getWeight(product.id);
      if (weight == null) continue;

      if (product.loss_role === "input_and_summary") {
        // product IS the material; rate from loss_rate
        const rate = product.loss_rate ?? 0;
        totals.set(product.id, (totals.get(product.id) ?? 0) + weight * rate);
      } else {
        // input product — each loss_component references an inventory item
        for (const comp of product.loss_components ?? []) {
          const matId = comp.source_item_id;
          totals.set(matId, (totals.get(matId) ?? 0) + weight * comp.rate);
        }
      }
    }
    return totals;
  }

  const summary = computeSummary();

  // Summary rows: ias items + unique material item IDs from input products
  const summaryItemIds = new Set<string>();
  for (const product of products) {
    if (product.loss_role === "input_and_summary") {
      summaryItemIds.add(product.id);
    } else {
      for (const comp of product.loss_components ?? []) {
        if (comp.source_item_id) summaryItemIds.add(comp.source_item_id);
      }
    }
  }

  const summaryRows = [...summaryItemIds]
    .map((id) => ({ id, item: allItems.find((i) => i.id === id), total: summary.get(id) ?? 0 }))
    .filter((r) => r.item != null) as { id: string; item: Item; total: number }[];

  return (
    <>
      {products.map((product) => {
        const weight = getWeight(product.id);
        const isIas = product.loss_role === "input_and_summary";
        const comps = product.loss_components ?? [];

        // total result for this product card header
        let cardTotal: number | null = null;
        if (weight != null) {
          if (isIas) {
            cardTotal = weight * (product.loss_rate ?? 0);
          } else {
            cardTotal = comps.reduce((sum, c) => sum + weight * c.rate, 0);
          }
        }

        return (
          <div key={product.id}>
            <div className={`card ${reorderMode ? "card-reordering" : ""}`}>
              {reorderMode && (
                <ReorderButtons item={product} items={products} sortField="sort_order" />
              )}
              <div className="card-head">
                <div>
                  <div className="title">{product.name}</div>
                  <div className="subtitle">{product.unit ?? "g"}</div>
                </div>
                <div className="total">
                  {cardTotal != null ? fmt(cardTotal) : "—"} g
                </div>
              </div>

              {/* Weight input row */}
              <div className="row">
                <div className="w105">
                  <div className="name">Weight (g)</div>
                </div>
                <div className="field">
                  <NumericInput
                    value={weight}
                    onChange={(v) => setWeight(product.id, v)}
                  />
                </div>
              </div>

              {/* Material rows */}
              {isIas ? (
                <div className="row lc-mat-row">
                  <div className="w105 name lc-mat-name">—</div>
                  <div className="lc-rate">{toFraction(product.loss_rate ?? 0)}</div>
                  <div className="lc-result">{weight != null ? fmt(weight * (product.loss_rate ?? 0)) : "—"} g</div>
                </div>
              ) : (
                comps.map((comp, ci) => {
                  const matItem = allItems.find((i) => i.id === comp.source_item_id);
                  const result = weight != null ? weight * comp.rate : null;
                  return (
                    <div key={ci} className="row lc-mat-row">
                      <div className="w105 name lc-mat-name">{matItem?.name ?? comp.source_item_id}</div>
                      <div className="lc-rate">{toFraction(comp.rate)}</div>
                      <div className="lc-result">{result != null ? fmt(result) : "—"} g</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Loss Summary */}
      <div className="category-label">Loss Summary</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="loss-calc-table">
          <thead>
            <tr>
              <th>Material</th>
              <th>Total (g)</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(({ id, item, total }) => (
              <tr key={id}>
                <td className="lc-product-cell">{item.name}</td>
                <td className="lc-result-cell">{total > 0 ? fmt(total) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
