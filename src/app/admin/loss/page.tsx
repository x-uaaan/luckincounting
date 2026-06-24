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
  const addItem = useItemsStore((s) => s.addItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);

  const materialItems = items
    .filter((i) => MATERIAL_CATEGORIES.includes(i.category))
    .sort((a, b) => a.name.localeCompare(b.name));

  const allExpired = items
    .filter((i) => i.appears_in.includes("expired") && i.loss_role === "input")
    .sort((a, b) => a.sort_order - b.sort_order);

  function move(id: string, dir: number) {
    const idx = allExpired.findIndex((i) => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= allExpired.length) return;
    updateItem(allExpired[idx].id, { sort_order: allExpired[j].sort_order });
    updateItem(allExpired[j].id, { sort_order: allExpired[idx].sort_order });
  }

  function saveName(id: string, val: string) {
    if (val.trim()) updateItem(id, { name: val.trim() });
  }

  function getComps(item: Item) {
    if (item.loss_role === "input_and_summary") {
      return [{ source_item_id: item.id, rate: item.loss_rate ?? 0 }];
    }
    return item.loss_components ?? [];
  }

  function saveCompRate(item: Item, ci: number, val: string) {
    const r = parseFraction(val);
    if (r === null) return;
    if (item.loss_role === "input_and_summary") {
      updateItem(item.id, { loss_rate: r });
    } else {
      const comps = (item.loss_components ?? []).map((c, i) => (i === ci ? { ...c, rate: r } : c));
      updateItem(item.id, { loss_components: comps });
    }
  }

  function saveCompMaterial(item: Item, ci: number, matId: string) {
    if (item.loss_role === "input_and_summary") {
      if (!matId || matId === item.id) return;
      updateItem(item.id, { loss_components: [{ source_item_id: matId, rate: item.loss_rate ?? 0 }], loss_role: "input", loss_formula: "direct" });
    } else {
      const comps = (item.loss_components ?? []).map((c, i) =>
        i === ci ? { ...c, source_item_id: matId } : c
      );
      updateItem(item.id, { loss_components: comps });
    }
  }

  function addComp(item: Item) {
    if (item.loss_role === "input_and_summary") {
      const comps = [...getComps(item), { source_item_id: "", rate: 0 }];
      updateItem(item.id, { loss_components: comps, loss_role: "input", loss_formula: "direct" });
    } else {
      const comps = [...(item.loss_components ?? []), { source_item_id: "", rate: 0 }];
      updateItem(item.id, { loss_components: comps });
    }
  }

  function removeComp(item: Item, ci: number) {
    if (item.loss_role === "input_and_summary") return;
    const comps = (item.loss_components ?? []).filter((_, i) => i !== ci);
    updateItem(item.id, { loss_components: comps });
  }

  function addProduct() {
    const maxOrder = allExpired.reduce((m, i) => Math.max(m, i.sort_order), 500);
    const id = `loss_${Date.now()}`;
    addItem({
      id,
      name: "",
      category: "Loss",
      sort_order: maxOrder + 10,
      final_sort_order: null,
      closing_sort_order: null,
      front_sort_order: null,
      appears_in: ["expired"],
      unit: "g",
      per_bag_pcs: null,
      back_loose_formula: null,
      per_box_pcs: null,
      front_per_box_pcs: null,
      closing_per_box_pcs: null,
      bag_size_g: null,
      inventory_bag_size_g: null,
      loss_formula: "direct",
      loss_rate: null,
      loss_components: [],
      loss_role: "input",
      default_container_id: null,
      closing_inventory_formula: null,
      closing_container_input: false,
      unopened_stack_size: null,
      closing_box_row: true,
      loose_grid: false,
      closing_input_type: "count",
      notes: null,
    });
  }

  function removeProduct(item: Item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;
    // Loss-only items: delete entirely. Multi-stage items: remove "expired" from appears_in.
    if (item.appears_in.every((s) => s === "expired")) {
      deleteItem(item.id);
    } else {
      updateItem(item.id, { appears_in: item.appears_in.filter((s) => s !== "expired") });
    }
  }

  const matSelect = (item: Item, comp: { source_item_id: string; rate: number }, ci: number) => (
    <select
      className="loss-mat-select"
      value={comp.source_item_id}
      onChange={(e) => saveCompMaterial(item, ci, e.target.value)}
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
  );

  return (
    <div className="content">
      <AdminHeader title="Loss" />
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table loss-rate-table">
            <thead>
              <tr>
                <th className="loss-move-th"></th>
                <th>Product</th>
                <th>Material</th>
                <th>Rate</th>
                <th className="loss-action-th"></th>
              </tr>
            </thead>
            <tbody>
              {allExpired.map((item, idx) => {
                const comps = getComps(item);
                const isIas = item.loss_role === "input_and_summary";
                const isLossOnly = item.appears_in.every((s) => s === "expired");
                const rs = Math.max(comps.length, 1);
                const rateSum = comps.reduce((s, c) => s + c.rate, 0);
                const rateWarn = rateSum > 1 + 1e-6;

                const moveCell = (
                  <td rowSpan={rs} className="reorder-cell loss-move-cell">
                    <div className="reorder-btns" style={{ flexDirection: "column", padding: 0, gap: 3 }}>
                      <button
                        className="reorder-arrow"
                        disabled={idx === 0}
                        onPointerDown={(e) => { e.preventDefault(); move(item.id, -1); }}
                      >↑</button>
                      <button
                        className="reorder-arrow"
                        disabled={idx === allExpired.length - 1}
                        onPointerDown={(e) => { e.preventDefault(); move(item.id, 1); }}
                      >↓</button>
                    </div>
                  </td>
                );

                const nameCell = (
                  <td rowSpan={rs} className="loss-product-cell">
                    <input
                      className="loss-name-edit"
                      defaultValue={item.name}
                      placeholder="Product name"
                      key={item.id + item.name}
                      onBlur={(e) => saveName(item.id, e.target.value)}
                    />
                    {rateWarn && (
                      <span className="loss-rate-warn" title={`Rate sum = ${rateSum.toFixed(4)} > 1`}>⚠</span>
                    )}
                  </td>
                );

                if (comps.length === 0) {
                  return (
                    <tr key={item.id} className="loss-product-group-start">
                      {moveCell}
                      {nameCell}
                      <td className="loss-material-cell">
                        <button className="loss-add-comp" onClick={() => addComp(item)}>+ add material</button>
                      </td>
                      <td />
                      <td className="loss-action-cell">
                        {isLossOnly && (
                          <button className="loss-rm-comp" onClick={() => removeProduct(item)} title="Delete product">🗑</button>
                        )}
                      </td>
                    </tr>
                  );
                }

                return comps.map((comp, ci) => (
                  <tr key={`${item.id}-${ci}`} className={ci === 0 ? "loss-product-group-start" : ""}>
                    {ci === 0 && moveCell}
                    {ci === 0 && nameCell}
                    <td className="loss-material-cell">
                      {matSelect(item, comp, ci)}
                    </td>
                    <td className="loss-rate-cell">
                      <input
                        className="loss-rate-edit"
                        inputMode="decimal"
                        defaultValue={toFraction(comp.rate)}
                        key={`${item.id}-${ci}-${comp.rate}`}
                        onBlur={(e) => saveCompRate(item, ci, e.target.value)}
                      />
                    </td>
                    <td className="loss-action-cell">
                      {ci === comps.length - 1 && (
                        <button className="loss-add-comp" onClick={() => addComp(item)} title="Add material row">+</button>
                      )}
                      {!isIas && (
                        <button className="loss-rm-comp" onClick={() => removeComp(item, ci)} title="Remove material">×</button>
                      )}
                      {ci === 0 && isLossOnly && (
                        <button className="loss-rm-comp" onClick={() => removeProduct(item)} title="Delete product" style={{ marginLeft: 4 }}>🗑</button>
                      )}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn-secondary" onClick={addProduct}>+ Add product</button>
      </div>
    </div>
  );
}
