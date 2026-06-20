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
  const containers = useItemsStore((s) => s.containers);
  const reorderMode = useItemsStore((s) => s.reorderMode);

  if (!record) return null;
  const activeRecord = record;

  const expiredItems = allItems
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const products = expiredItems.filter(
    (i) => i.loss_role === "input_and_summary" || i.loss_role === "input"
  );

  function getEntry(productId: string) {
    return activeRecord.material_loss[productId] ?? null;
  }

  function getGross(productId: string): number | null {
    return getEntry(productId)?.gross_weight ?? null;
  }

  function getContainerId(productId: string): string {
    return getEntry(productId)?.container_id ?? allItems.find(i => i.id === productId)?.default_container_id ?? "";
  }

  function getTare(containerId: string): number {
    return containers.find((c) => c.id === containerId)?.tare_g ?? 0;
  }

  function getNetWeight(productId: string): number | null {
    const gross = getGross(productId);
    if (gross == null) return null;
    const tare = getTare(getContainerId(productId));
    return gross - tare;
  }

  function setEntry(productId: string, containerId: string | null, gross: number | null) {
    setMaterialLoss(productId, { container_id: containerId || null, gross_weight: gross, rate_value: null });
  }

  // Compute material totals: inventoryItemId -> total used (g)
  function computeSummary(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const product of products) {
      const net = getNetWeight(product.id);
      if (net == null) continue;
      if (product.loss_role === "input_and_summary") {
        const rate = product.loss_rate ?? 0;
        totals.set(product.id, (totals.get(product.id) ?? 0) + net * rate);
      } else {
        for (const comp of product.loss_components ?? []) {
          if (!comp.source_item_id) continue;
          totals.set(comp.source_item_id, (totals.get(comp.source_item_id) ?? 0) + net * comp.rate);
        }
      }
    }
    return totals;
  }

  const summary = computeSummary();

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
        const isIas = product.loss_role === "input_and_summary";
        const comps = product.loss_components ?? [];
        const gross = getGross(product.id);
        const containerId = getContainerId(product.id);
        const tare = getTare(containerId);
        const net = gross != null ? gross - tare : null;

        // card total
        let cardTotal: number | null = null;
        if (net != null) {
          if (isIas) {
            cardTotal = net * (product.loss_rate ?? 0);
          } else {
            cardTotal = comps.reduce((sum, c) => sum + net * c.rate, 0);
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

              {/* Weight + container row */}
              <div className="row">
                <div className="w105">
                  <div className="name">Weight (g)</div>
                </div>
                <div className="field w70">
                  <div className="lbl">Gross</div>
                  <NumericInput
                    value={gross}
                    onChange={(v) => setEntry(product.id, containerId || null, v)}
                  />
                </div>
                <div className="op">−</div>
                <div className="field w44">
                  <div className="lbl">Container</div>
                  <select
                    className="lc-container-select"
                    value={containerId}
                    onChange={(e) => setEntry(product.id, e.target.value || null, gross)}
                  >
                    <option value="">— none —</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.tare_g}g)</option>
                    ))}
                  </select>
                </div>
                <div className="op">=</div>
                <div className="field w70">
                  <div className="lbl">Net</div>
                  <input className="auto" disabled value={net != null ? String(net) : ""} />
                </div>
              </div>

              {/* Calc check line */}
              {gross != null && (
                <div className="check">
                  {gross} − {tare} = {net} g
                </div>
              )}

              {/* Material rows */}
              {isIas ? (
                <div className="row lc-mat-row">
                  <div className="w105 name lc-mat-name">—</div>
                  <div className="lc-rate">{toFraction(product.loss_rate ?? 0)}</div>
                  <div className="lc-result">{net != null ? fmt(net * (product.loss_rate ?? 0)) : "—"} g</div>
                </div>
              ) : (
                comps.map((comp, ci) => {
                  const matItem = allItems.find((i) => i.id === comp.source_item_id);
                  const result = net != null ? net * comp.rate : null;
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
