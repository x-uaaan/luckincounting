"use client";

import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item } from "@/lib/types";

const MATERIAL_CATEGORIES = ["Solid Beverage", "Dairy & Soda", "Syrup", "Raw Material", "Frozen"];

function toFraction(n: number): string {
  if (n === 0) return "0";
  if (n === 1) return "1";
  for (let d = 1; d <= 500; d++) {
    const num = Math.round(n * d);
    if (Math.abs(num / d - n) < 1e-9) {
      return num === d ? "1" : `${num}/${d}`;
    }
  }
  return n.toPrecision(6).replace(/\.?0+$/, "");
}

function parseFraction(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  if (t.includes("/")) {
    const [a, b] = t.split("/");
    const num = parseFloat(a), den = parseFloat(b);
    if (isNaN(num) || isNaN(den) || den === 0) return null;
    return num / den;
  }
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

export default function AdminLossPage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);
  const reseedLossItems = useItemsStore((s) => s.reseedLossItems);

  const materialItems = items
    .filter((i) => MATERIAL_CATEGORIES.includes(i.category))
    .sort((a, b) => a.name.localeCompare(b.name));

  const expired = items.filter((i) => i.appears_in.includes("expired"));
  const ias = expired.filter((i) => i.loss_role === "input_and_summary").sort((a, b) => a.sort_order - b.sort_order);
  const inputs = expired.filter((i) => i.loss_role === "input").sort((a, b) => a.sort_order - b.sort_order);

  function moveIas(id: string, dir: number) {
    const idx = ias.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= ias.length) return;
    updateItem(ias[idx].id, { sort_order: ias[j].sort_order });
    updateItem(ias[j].id, { sort_order: ias[idx].sort_order });
  }

  function moveInput(id: string, dir: number) {
    const idx = inputs.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= inputs.length) return;
    updateItem(inputs[idx].id, { sort_order: inputs[j].sort_order });
    updateItem(inputs[j].id, { sort_order: inputs[idx].sort_order });
  }

  function saveName(id: string, val: string) {
    if (val.trim()) updateItem(id, { name: val.trim() });
  }

  function saveIasRate(id: string, val: string) {
    const r = parseFraction(val);
    if (r !== null) updateItem(id, { loss_rate: r });
  }

  function saveCompRate(productId: string, ci: number, val: string) {
    const r = parseFraction(val);
    if (r === null) return;
    const p = items.find((i) => i.id === productId);
    if (!p) return;
    const comps = (p.loss_components ?? []).map((c, i) => (i === ci ? { ...c, rate: r } : c));
    updateItem(productId, { loss_components: comps });
  }

  function saveCompMaterial(productId: string, ci: number, matId: string) {
    const p = items.find((i) => i.id === productId);
    if (!p) return;
    const comps = (p.loss_components ?? []).map((c, i) =>
      i === ci ? { ...c, source_item_id: matId } : c
    );
    updateItem(productId, { loss_components: comps });
  }

  function addComp(productId: string) {
    const p = items.find((i) => i.id === productId);
    if (!p) return;
    const comps = [...(p.loss_components ?? []), { source_item_id: "", rate: 1 }];
    updateItem(productId, { loss_components: comps });
  }

  function removeComp(productId: string, ci: number) {
    const p = items.find((i) => i.id === productId);
    if (!p) return;
    const comps = (p.loss_components ?? []).filter((_, i) => i !== ci);
    updateItem(productId, { loss_components: comps });
  }

  const renderMoveCell = (rowspan: number, onLeft: () => void, onRight: () => void, isFirst: boolean, isLast: boolean) => (
    <td rowSpan={rowspan} className="loss-move-cell">
      <div className="loss-move-btns">
        <button className="loss-move-btn" disabled={isFirst} onPointerDown={(e) => { e.preventDefault(); onLeft(); }}>←</button>
        <button className="loss-move-btn" disabled={isLast} onPointerDown={(e) => { e.preventDefault(); onRight(); }}>→</button>
      </div>
    </td>
  );

  const renderNameCell = (item: Item, rowspan: number) => (
    <td rowSpan={rowspan} className="loss-product-cell">
      <input
        className="loss-name-edit"
        defaultValue={item.name}
        key={item.name}
        onBlur={(e) => saveName(item.id, e.target.value)}
      />
    </td>
  );

  return (
    <div className="content">
      <AdminHeader title="Loss" />
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table loss-rate-table">
            <thead>
              <tr>
                <th style={{ width: 64 }}></th>
                <th>Product</th>
                <th>Material</th>
                <th>Rate</th>
                <th style={{ width: 32 }}></th>
              </tr>
            </thead>
            <tbody>
              {/* ias items — product IS the material */}
              {ias.map((item, idx) => (
                <tr key={item.id}>
                  {renderMoveCell(1, () => moveIas(item.id, -1), () => moveIas(item.id, 1), idx === 0, idx === ias.length - 1)}
                  {renderNameCell(item, 1)}
                  <td className="loss-material-cell loss-dash">—</td>
                  <td className="loss-rate-cell">
                    <input
                      className="loss-rate-edit"
                      inputMode="decimal"
                      defaultValue={toFraction(item.loss_rate ?? 0)}
                      key={`${item.id}-${item.loss_rate}`}
                      onBlur={(e) => saveIasRate(item.id, e.target.value)}
                    />
                  </td>
                  <td />
                </tr>
              ))}

              {/* input products — each comp is a material row */}
              {inputs.map((product, pidx) => {
                const comps = product.loss_components ?? [];
                const rs = Math.max(comps.length, 1);
                if (comps.length === 0) {
                  return (
                    <tr key={product.id}>
                      {renderMoveCell(1, () => moveInput(product.id, -1), () => moveInput(product.id, 1), pidx === 0, pidx === inputs.length - 1)}
                      {renderNameCell(product, 1)}
                      <td className="loss-material-cell">
                        <button className="loss-add-comp" onClick={() => addComp(product.id)}>+ add material</button>
                      </td>
                      <td />
                      <td />
                    </tr>
                  );
                }
                return comps.map((comp, ci) => (
                  <tr key={`${product.id}-${ci}`}>
                    {ci === 0 && renderMoveCell(rs, () => moveInput(product.id, -1), () => moveInput(product.id, 1), pidx === 0, pidx === inputs.length - 1)}
                    {ci === 0 && renderNameCell(product, rs)}
                    <td className="loss-material-cell">
                      <select
                        className="loss-mat-select"
                        value={comp.source_item_id}
                        onChange={(e) => saveCompMaterial(product.id, ci, e.target.value)}
                      >
                        <option value="">— none —</option>
                        {MATERIAL_CATEGORIES.map((cat) => {
                          const catItems = materialItems.filter((m) => m.category === cat);
                          if (!catItems.length) return null;
                          return (
                            <optgroup key={cat} label={cat}>
                              {catItems.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </td>
                    <td className="loss-rate-cell">
                      <input
                        className="loss-rate-edit"
                        inputMode="decimal"
                        defaultValue={toFraction(comp.rate)}
                        key={`${product.id}-${ci}-${comp.rate}`}
                        onBlur={(e) => saveCompRate(product.id, ci, e.target.value)}
                      />
                    </td>
                    <td className="loss-action-cell">
                      {ci === comps.length - 1 && (
                        <button className="loss-add-comp" onClick={() => addComp(product.id)} title="Add row">+</button>
                      )}
                      <button className="loss-rm-comp" onClick={() => removeComp(product.id, ci)} title="Remove">×</button>
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn-secondary" style={{ fontSize: 12 }} onClick={() => reseedLossItems()}>
          Reseed Loss Items
        </button>
      </div>
    </div>
  );
}
