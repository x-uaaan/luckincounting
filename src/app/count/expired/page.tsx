"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import NumericInput from "@/components/NumericInput";
import ReorderButtons from "@/components/ReorderButtons";

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

  return (
    <>
      {/* Product input table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="admin-table lexp-table">
            <thead>
              <tr>
                {reorderMode && <th className="lexp-move-th"></th>}
                <th className="lexp-product-th">Product</th>
                <th className="lexp-input-th">Weight (g)</th>
                <th className="lexp-ctn-th">Container</th>
                <th className="lexp-net-th">Net Weight (g)</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const gross = getGross(product.id);
                const containerId = getContainerId(product.id);
                const tare = getTare(containerId);
                const net = gross != null ? gross - tare : null;
                return (
                  <tr key={product.id}>
                    {reorderMode && (
                      <td className="lexp-move-cell">
                        <div className="reorder-btns" style={{ flexDirection: "row", padding: 0, gap: 3 }}>
                          <ReorderButtons item={product} items={products} sortField="sort_order" />
                        </div>
                      </td>
                    )}
                    <td className="lexp-product-cell">{product.name}</td>
                    <td className="lexp-input-cell">
                      <NumericInput
                        value={gross}
                        onChange={(v) => setEntry(product.id, containerId || null, v)}
                      />
                    </td>
                    <td className="lexp-ctn-cell">
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
                    <td className="lexp-net-cell">
                      {net != null ? (
                        <>
                          <span className="lexp-net-val">{net}</span>
                          <div className="lexp-net">{gross} − {tare} = {net} g</div>
                        </>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Loss Report table — grouped by material, individual calc rows per product */}
      <div className="category-label">Loss Report</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="admin-table-wrap" style={{ border: "none", borderRadius: 0 }}>
          <table className="admin-table lexp-table">
            <thead>
              <tr>
                <th className="lexp-product-th">Material</th>
                <th className="lexp-net-th">Net Weight (g)</th>
                <th className="lexp-rate-th">Rate</th>
                <th className="lexp-result-th">Result (g)</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                // Build ordered map: materialId → { name, rows: [{net, rate, result}] }
                const matMap = new Map<string, { name: string; rows: { net: number | null; rate: number; result: number | null; productName: string }[] }>();
                for (const product of products) {
                  const isIas = product.loss_role === "input_and_summary";
                  const comps = isIas
                    ? [{ source_item_id: product.id, rate: product.loss_rate ?? 0 }]
                    : product.loss_components ?? [];
                  const net = getNet(product.id);
                  for (const comp of comps) {
                    if (!comp.source_item_id) continue;
                    const matItem = allItems.find((i) => i.id === comp.source_item_id);
                    const name = isIas ? product.name : (matItem?.name ?? comp.source_item_id);
                    const result = net != null ? net * comp.rate : null;
                    const existing = matMap.get(comp.source_item_id);
                    if (existing) {
                      existing.rows.push({ net, rate: comp.rate, result, productName: product.name });
                    } else {
                      matMap.set(comp.source_item_id, { name, rows: [{ net, rate: comp.rate, result, productName: product.name }] });
                    }
                  }
                }
                return [...matMap.entries()].flatMap(([matId, { name, rows }]) => {
                  const total = rows.reduce((s, r) => s + (r.result ?? 0), 0);
                  const hasAnyResult = rows.some((r) => r.result != null);
                  return rows.map((row, ri) => (
                    <tr key={`${matId}-${ri}`} className={ri === 0 ? "lexp-group-start" : "lexp-group-cont"}>
                      <td className="lexp-product-cell">
                        {rows.length > 1 ? `${name} (${row.productName})` : name}
                      </td>
                      <td className="lexp-net-cell">{row.net != null ? row.net : "—"}</td>
                      <td className="lexp-rate-cell">{toFraction(row.rate)}</td>
                      {ri === 0 && (
                        <td rowSpan={rows.length} className="lexp-result-cell" style={{ verticalAlign: "middle" }}>
                          {hasAnyResult ? fmt(total) : "—"}
                        </td>
                      )}
                    </tr>
                  ));
                });
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
