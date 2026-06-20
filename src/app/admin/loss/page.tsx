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

  const materialItems = items
    .filter((i) => MATERIAL_CATEGORIES.includes(i.category))
    .sort((a, b) => a.name.localeCompare(b.name));

  const allExpired = items
    .filter((i) => i.appears_in.includes("expired"))
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
      const comps = [{ source_item_id: matId, rate: item.loss_rate ?? 0 }];
      updateItem(item.id, { loss_components: comps, loss_role: "input", loss_formula: "direct" });
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
    if (item.loss_role === "input_and_summary") {
      // ias self-row: nothing to remove (single synthetic row)
      return;
    }
    const comps = (item.loss_components ?? []).filter((_, i) => i !== ci);
    updateItem(item.id, { loss_components: comps });
  }

  const renderMoveCell = (idx: number, id: string, rs: number) => (
    <td rowSpan={rs} className="loss-move-cell">
      <div className="loss-move-btns">
        <button className="loss-move-btn" disabled={idx === 0} onPointerDown={(e) => { e.preventDefault(); move(id, -1); }}>↑</button>
        <button className="loss-move-btn" disabled={idx === allExpired.length - 1} onPointerDown={(e) => { e.preventDefault(); move(id, 1); }}>↓</button>
      </div>
    </td>
  );

  const renderNameCell = (item: Item, rs: number) => (
    <td rowSpan={rs} className="loss-product-cell">
      <input
        className="loss-name-edit"
        defaultValue={item.name}
        key={item.name}
        onBlur={(e) => saveName(item.id, e.target.value)}
      />
    </td>
  );

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
                const rs = Math.max(comps.length, 1);

                if (comps.length === 0) {
                  return (
                    <tr key={item.id}>
                      {renderMoveCell(idx, item.id, 1)}
                      {renderNameCell(item, 1)}
                      <td className="loss-material-cell">
                        <button className="loss-add-comp" onClick={() => addComp(item)}>+ add material</button>
                      </td>
                      <td />
                      <td />
                    </tr>
                  );
                }

                return comps.map((comp, ci) => (
                  <tr key={`${item.id}-${ci}`}>
                    {ci === 0 && renderMoveCell(idx, item.id, rs)}
                    {ci === 0 && renderNameCell(item, rs)}
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
                        <button className="loss-add-comp" onClick={() => addComp(item)} title="Add row">+</button>
                      )}
                      {!isIas && (
                        <button className="loss-rm-comp" onClick={() => removeComp(item, ci)} title="Remove">×</button>
                      )}
                    </td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
