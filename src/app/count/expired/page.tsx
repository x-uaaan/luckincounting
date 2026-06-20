"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import NumericInput from "@/components/NumericInput";
import type { Item } from "@/lib/types";

// One row in the Loss Calc table
type CalcRow = {
  productId: string;
  productName: string;
  containerId: string | null;
  materialName: string;      // "-" when product IS the material
  materialId: string | null; // null for input_and_summary self-reference
  rate: number;
  rowspan: number; // >0 on first row of product, 0 on subsequent
};

function buildCalcRows(items: Item[]): CalcRow[] {
  const expired = items
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const inputProducts = expired.filter((i) => i.loss_role === "input");
  const ias = expired.filter((i) => i.loss_role === "input_and_summary");
  const summaryItems = expired.filter((i) => i.loss_role === "summary");

  const rows: CalcRow[] = [];

  for (const item of ias) {
    rows.push({
      productId: item.id,
      productName: item.name,
      containerId: item.default_container_id,
      materialName: "-",
      materialId: null,
      rate: item.loss_rate ?? 0,
      rowspan: 1,
    });
  }

  for (const product of inputProducts) {
    const mats = summaryItems.filter((m) =>
      (m.loss_components ?? []).some((c) => c.source_item_id === product.id)
    );

    if (mats.length === 0) {
      rows.push({
        productId: product.id,
        productName: product.name,
        containerId: product.default_container_id,
        materialName: "-",
        materialId: null,
        rate: 1,
        rowspan: 1,
      });
      continue;
    }

    rows.push(
      ...mats.map((mat, mi) => {
        const comp = (mat.loss_components ?? []).find(
          (c) => c.source_item_id === product.id
        );
        return {
          productId: product.id,
          productName: product.name,
          containerId: product.default_container_id,
          materialName: mat.name,
          materialId: mat.id,
          rate: comp?.rate ?? 0,
          rowspan: mi === 0 ? mats.length : 0,
        };
      })
    );
  }

  return rows;
}

// Summary items: "summary" + "input_and_summary"
function buildSummaryItems(items: Item[]) {
  return items
    .filter(
      (i) =>
        i.appears_in.includes("expired") &&
        (i.loss_role === "summary" || i.loss_role === "input_and_summary")
    )
    .sort((a, b) => a.sort_order - b.sort_order);
}

export default function ExpiredPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setMaterialLoss = useCountingStore((s) => s.setMaterialLoss);
  const allItems = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);

  if (!record) return null;

  const activeRecord = record;
  const rows = buildCalcRows(allItems);
  const summaryItems = buildSummaryItems(allItems);

  // Track which productIds we've already rendered the input cell for
  const renderedProductIds = new Set<string>();

  function getProductEntry(productId: string) {
    return activeRecord.material_loss[productId];
  }

  function productTotalVolume(productId: string): number {
    return getProductEntry(productId)?.total_volume ?? 0;
  }

  function rowResult(row: CalcRow): number {
    if (row.materialId) {
      // for "input" products: contribution = product.total_volume × rate
      return productTotalVolume(row.productId) * row.rate;
    }
    // for "input_and_summary": result is stored directly
    return getProductEntry(row.productId)?.result ?? 0;
  }

  return (
    <>
      <div className="category-label" style={{ marginTop: 0 }}>Loss Calc</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="loss-calc-wrap">
          <table className="loss-calc-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Weight (g)</th>
                <th>Material</th>
                <th>Rate</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const entry = getProductEntry(row.productId);
                const selectedContainerId =
                  entry?.container_id ?? row.containerId ?? "";
                const container = containers.find(
                  (c) => c.id === selectedContainerId
                );
                const tare = container?.tare_g ?? 0;
                const totalVol = productTotalVolume(row.productId);
                const result = rowResult(row);

                const isFirstForProduct = row.rowspan > 0;

                return (
                  <tr key={`${row.productId}-${i}`}>
                    {isFirstForProduct && (
                      <>
                        <td rowSpan={row.rowspan} className="lc-product-cell">
                          {row.productName}
                        </td>
                        <td rowSpan={row.rowspan} className="lc-input-cell">
                          <div className="lc-input-wrap">
                            {row.containerId && (
                              <div className="lc-container-row">
                                <select
                                  className="lc-container-select"
                                  value={selectedContainerId}
                                  onChange={(e) =>
                                    setMaterialLoss(row.productId, {
                                      container_id: e.target.value || null,
                                      gross_weight: entry?.gross_weight ?? null,
                                      rate_value: null,
                                    })
                                  }
                                >
                                  {containers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                            <div className="lc-weight-row">
                              <NumericInput
                                value={entry?.gross_weight ?? null}
                                onChange={(v) =>
                                  setMaterialLoss(row.productId, {
                                    container_id: selectedContainerId || null,
                                    gross_weight: v,
                                    rate_value: null,
                                  })
                                }
                              />
                              {row.containerId && tare > 0 && (
                                <span className="lc-tare">−{tare}</span>
                              )}
                            </div>
                            {row.containerId && (
                              <div className="lc-total-vol">
                                = {totalVol.toFixed(1)} g
                              </div>
                            )}
                          </div>
                        </td>
                      </>
                    )}
                    <td className="lc-material-cell">
                      <span className={row.materialName === "-" ? "lc-dash" : ""}>
                        {row.materialName}
                      </span>
                    </td>
                    <td className="lc-rate-cell">{row.rate}</td>
                    <td className="lc-result-cell">
                      {result > 0 ? result.toFixed(2) : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="category-label">Loss Summary</div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="loss-calc-wrap">
          <table className="loss-calc-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Total (g)</th>
              </tr>
            </thead>
            <tbody>
              {summaryItems.map((item) => {
                const entry = activeRecord.material_loss[item.id];
                const result = entry?.result ?? 0;
                return (
                  <tr key={item.id}>
                    <td className="lc-product-cell">{item.name}</td>
                    <td className="lc-result-cell">
                      {result > 0 ? result.toFixed(2) : "0"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
