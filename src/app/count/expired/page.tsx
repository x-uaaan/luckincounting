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

  const products = allItems
    .filter((i) => i.appears_in.includes("expired") &&
      (i.loss_role === "input_and_summary" || i.loss_role === "input"))
    .sort((a, b) => a.sort_order - b.sort_order);

  function getGross(id: string): number | null {
    return activeRecord.material_loss[id]?.gross_weight ?? null;
  }

  function getContainerId(id: string): string {
    return activeRecord.material_loss[id]?.container_id
      ?? allItems.find(i => i.id === id)?.default_container_id
      ?? "";
  }

  function getTare(containerId: string): number {
    return containers.find((c) => c.id === containerId)?.tare_g ?? 0;
  }

  function getNet(id: string): number | null {
    const gross = getGross(id);
    if (gross == null) return null;
    return gross - getTare(getContainerId(id));
  }

  function setEntry(id: string, containerId: string | null, gross: number | null) {
    setMaterialLoss(id, { container_id: containerId || null, gross_weight: gross, rate_value: null });
  }

  // Aggregate material totals for summary
  function computeSummary(): Map<string, number> {
    const totals = new Map<string, number>();
    for (const p of products) {
      const net = getNet(p.id);
      if (net == null) continue;
      if (p.loss_role === "input_and_summary") {
        totals.set(p.id, (totals.get(p.id) ?? 0) + net * (p.loss_rate ?? 0));
      } else {
        for (const c of p.loss_components ?? []) {
          if (!c.source_item_id) continue;
          totals.set(c.source_item_id, (totals.get(c.source_item_id) ?? 0) + net * c.rate);
        }
      }
    }
    return totals;
  }

  const summary = computeSummary();

  const summaryItemIds = new Set<string>();
  for (const p of products) {
    if (p.loss_role === "input_and_summary") summaryItemIds.add(p.id);
    else for (const c of p.loss_components ?? []) if (c.source_item_id) summaryItemIds.add(c.source_item_id);
  }
  const summaryRows = [...summaryItemIds]
    .map((id) => ({ id, item: allItems.find((i) => i.id === id), total: summary.get(id) ?? 0 }))
    .filter((r) => r.item != null) as { id: string; item: Item; total: number }[];

  return (
    <>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="loss-exp-table">
          <thead>
            <tr>
              {reorderMode && <th className="loss-move-th"></th>}
              <th>Product</th>
              <th className="lexp-input-th">Input (g)</th>
              <th className="lexp-ctn-th">Container</th>
              <th>Material</th>
              <th className="lexp-rate-th">Rate</th>
              <th className="lexp-result-th">Result (g)</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => {
              const isIas = product.loss_role === "input_and_summary";
              const comps = isIas
                ? [{ source_item_id: product.id, rate: product.loss_rate ?? 0 }]
                : product.loss_components ?? [];
              const rs = Math.max(comps.length, 1);
              const gross = getGross(product.id);
              const containerId = getContainerId(product.id);
              const tare = getTare(containerId);
              const net = gross != null ? gross - tare : null;

              if (comps.length === 0) {
                return (
                  <tr key={product.id}>
                    {reorderMode && (
                      <td className="loss-move-cell">
                        <ReorderButtons item={product} items={products} sortField="sort_order" />
                      </td>
                    )}
                    <td className="lexp-product-cell">{product.name}</td>
                    <td className="lexp-input-cell">
                      <NumericInput value={gross} onChange={(v) => setEntry(product.id, containerId || null, v)} />
                    </td>
                    <td className="lexp-ctn-cell">
                      <select className="lexp-ctn-select" value={containerId}
                        onChange={(e) => setEntry(product.id, e.target.value || null, gross)}>
                        <option value="">— none —</option>
                        {containers.map((c) => (
                          <option key={c.id} value={c.id}>{c.name} ({c.tare_g}g)</option>
                        ))}
                      </select>
                    </td>
                    <td colSpan={3} className="lexp-mat-cell" style={{ color: "var(--text-secondary)" }}>—</td>
                  </tr>
                );
              }

              return comps.map((comp, ci) => {
                const matItem = allItems.find((i) => i.id === comp.source_item_id);
                const result = net != null ? net * comp.rate : null;
                return (
                  <tr key={`${product.id}-${ci}`}>
                    {ci === 0 && reorderMode && (
                      <td rowSpan={rs} className="loss-move-cell">
                        <ReorderButtons item={product} items={products} sortField="sort_order" />
                      </td>
                    )}
                    {ci === 0 && (
                      <td rowSpan={rs} className="lexp-product-cell">{product.name}</td>
                    )}
                    {ci === 0 && (
                      <td rowSpan={rs} className="lexp-input-cell">
                        <NumericInput value={gross} onChange={(v) => setEntry(product.id, containerId || null, v)} />
                        {gross != null && (
                          <div className="lexp-net">{gross} − {tare} = {net} g</div>
                        )}
                      </td>
                    )}
                    {ci === 0 && (
                      <td rowSpan={rs} className="lexp-ctn-cell">
                        <select
                          className="lexp-ctn-select"
                          value={containerId}
                          onChange={(e) => setEntry(product.id, e.target.value || null, gross)}
                        >
                          <option value="">— none —</option>
                          {containers.map((c) => (
                            <option key={c.id} value={c.id}>{c.name} ({c.tare_g}g)</option>
                          ))}
                        </select>
                      </td>
                    )}
                    <td className="lexp-mat-cell">
                      {isIas ? "—" : (matItem?.name ?? comp.source_item_id)}
                    </td>
                    <td className="lexp-rate-cell">{toFraction(comp.rate)}</td>
                    <td className="lexp-result-cell">{result != null ? fmt(result) : "—"}</td>
                  </tr>
                );
              });
            })}
          </tbody>
        </table>
      </div>

      <div className="category-label">Loss Summary</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="loss-exp-table">
          <thead>
            <tr>
              <th>Material</th>
              <th className="lexp-result-th">Total (g)</th>
            </tr>
          </thead>
          <tbody>
            {summaryRows.map(({ id, item, total }) => (
              <tr key={id}>
                <td className="lexp-mat-cell">{item.name}</td>
                <td className="lexp-result-cell">{total > 0 ? fmt(total) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
