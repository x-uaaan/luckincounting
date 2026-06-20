"use client";

import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item } from "@/lib/types";

function numOrNull(v: string): number | null {
  return v === "" ? null : Number(v);
}

// One display row in the rate table
type LossRow = {
  productId: string;
  productName: string;
  containerId: string | null;
  materialName: string; // "-" when product IS the material (rate = loss_rate)
  rate: number;
  // how to save: "loss_rate" = updateItem(productId, {loss_rate}),
  //              "comp" = find material item, patch its loss_components
  saveKind: "loss_rate" | "comp";
  materialId?: string;   // for saveKind "comp"
  compIndex?: number;    // index inside loss_components
  rowspan: number;       // >0 on first row of product group, 0 on subsequent
};

function buildRows(items: Item[]): LossRow[] {
  const expired = items
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const inputProducts = expired.filter((i) => i.loss_role === "input");
  const ias = expired.filter((i) => i.loss_role === "input_and_summary");
  const summaryItems = expired.filter((i) => i.loss_role === "summary");

  const rows: LossRow[] = [];

  // "input_and_summary" — product IS the material, rate stored as loss_rate
  for (const item of ias) {
    rows.push({
      productId: item.id,
      productName: item.name,
      containerId: item.default_container_id,
      materialName: "-",
      rate: item.loss_rate ?? 0,
      saveKind: "loss_rate",
      rowspan: 1,
    });
  }

  // "input" products — find summary items that reference them
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
        rate: 1,
        saveKind: "loss_rate",
        rowspan: 1,
      });
      continue;
    }

    rows.push(
      ...mats.map((mat, mi) => {
        const compIndex = (mat.loss_components ?? []).findIndex(
          (c) => c.source_item_id === product.id
        );
        return {
          productId: product.id,
          productName: product.name,
          containerId: product.default_container_id,
          materialName: mat.name,
          rate: mat.loss_components?.[compIndex]?.rate ?? 0,
          saveKind: "comp" as const,
          materialId: mat.id,
          compIndex,
          rowspan: mi === 0 ? mats.length : 0,
        };
      })
    );
  }

  return rows;
}

export default function AdminLossPage() {
  const items = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);
  const updateItem = useItemsStore((s) => s.updateItem);
  const rows = buildRows(items);

  function saveRate(row: LossRow, value: string) {
    const rate = numOrNull(value);
    if (rate === null) return;
    if (row.saveKind === "loss_rate") {
      updateItem(row.productId, { loss_rate: rate });
    } else {
      const mat = items.find((i) => i.id === row.materialId);
      if (!mat) return;
      const comps = (mat.loss_components ?? []).map((c, i) =>
        i === row.compIndex ? { ...c, rate } : c
      );
      updateItem(mat.id, { loss_components: comps });
    }
  }

  return (
    <div className="content">
      <AdminHeader title="Loss" />
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table loss-rate-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Container</th>
                <th>Material</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={`${row.productId}-${i}`} className={row.rowspan > 1 ? "loss-product-group-start" : ""}>
                  {row.rowspan > 0 && (
                    <>
                      <td rowSpan={row.rowspan} className="loss-product-cell">
                        {row.productName}
                      </td>
                      <td rowSpan={row.rowspan} className="loss-container-cell">
                        {row.containerId
                          ? containers.find((c) => c.id === row.containerId)?.name ?? "—"
                          : "—"}
                      </td>
                    </>
                  )}
                  <td className="loss-material-cell">
                    <span className={row.materialName === "-" ? "loss-dash" : ""}>
                      {row.materialName}
                    </span>
                  </td>
                  <td className="loss-rate-cell">
                    <input
                      className="loss-rate-edit"
                      inputMode="decimal"
                      defaultValue={row.rate}
                      key={`${row.productId}-${row.materialName}-${row.rate}`}
                      onBlur={(e) => saveRate(row, e.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
