"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item } from "@/lib/types";

// Fields shown per item row
const BACK_FORMULAS = [
  { value: "",          label: "Default (bags × pcs)" },
  { value: "stack_box", label: "Stack × size + loose" },
  { value: "bag_count", label: "Bag count (→ weight)" },
  { value: "hidden",    label: "Hidden (no loose row)" },
] as const;

const CLOSING_FORMULAS = [
  { value: "",                    label: "Default (enter directly)" },
  { value: "non_coffee",          label: "non_coffee (bag_size − used)" },
  { value: "under_cabinet",       label: "under_cabinet (bag_size − stored)" },
  { value: "container_direct",    label: "container_direct (gross − tare)" },
  { value: "container_plus_loose",label: "container_plus_loose (loose + container)" },
  { value: "stack_box",           label: "stack_box (stacks × size + loose)" },
  { value: "whipping_cream",      label: "whipping_cream (3-row calc)" },
] as const;

const CLOSING_INPUT_TYPES = [
  { value: "count",   label: "count (pcs)" },
  { value: "weight",  label: "weight (g → boxes)" },
  { value: "sleeves", label: "sleeves (× pcs/bag)" },
] as const;

export default function AdminCalcTypePage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);

  const [expandedWcId, setExpandedWcId] = useState<string | null>(null);

  const categories = Array.from(new Set(
    items.filter(i => i.category !== "Loss").map(i => i.category)
  )).sort((a, b) => {
    const aMin = Math.min(...items.filter(i => i.category === a).map(i => i.sort_order));
    const bMin = Math.min(...items.filter(i => i.category === b).map(i => i.sort_order));
    return aMin - bMin;
  });

  function setField<K extends keyof Item>(id: string, field: K, val: Item[K]) {
    updateItem(id, { [field]: val } as Partial<Item>);
  }

  return (
    <div className="content">
      <AdminHeader title="Calc Type" />
      <p className="check">
        Configure how each item is calculated in each counting stage.
        All changes persist to Supabase and flow through immediately.
      </p>

      {categories.map((cat) => {
        const catItems = items
          .filter(i => i.category === cat && i.category !== "Loss")
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <div key={cat} className="card ct-card">
            <div className="card-head"><div className="title">{cat}</div></div>
            <div className="admin-table-wrap">
              <table className="admin-table ct-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Back formula</th>
                    <th>Stack size</th>
                    <th>Closing formula</th>
                    <th>Closing input</th>
                    <th>Box row</th>
                    <th>Loose grid</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map((item) => (
                    <>
                      <tr key={item.id}>
                        <td className="ct-name-cell">{item.name}</td>

                        {/* Back formula */}
                        <td>
                          <select
                            className="ct-select"
                            value={item.back_loose_formula ?? ""}
                            onChange={(e) =>
                              setField(item.id, "back_loose_formula", (e.target.value || null) as Item["back_loose_formula"])
                            }
                          >
                            {BACK_FORMULAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </td>

                        {/* Stack size */}
                        <td>
                          <input
                            className="ct-num"
                            inputMode="numeric"
                            value={item.unopened_stack_size ?? ""}
                            placeholder="—"
                            onChange={(e) =>
                              setField(item.id, "unopened_stack_size", e.target.value === "" ? null : Number(e.target.value))
                            }
                          />
                        </td>

                        {/* Closing formula */}
                        <td>
                          <select
                            className="ct-select"
                            value={item.closing_inventory_formula ?? ""}
                            onChange={(e) =>
                              setField(item.id, "closing_inventory_formula", (e.target.value || null) as Item["closing_inventory_formula"])
                            }
                          >
                            {CLOSING_FORMULAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </td>

                        {/* Closing input type */}
                        <td>
                          <select
                            className="ct-select"
                            value={item.closing_input_type}
                            onChange={(e) =>
                              setField(item.id, "closing_input_type", e.target.value as Item["closing_input_type"])
                            }
                          >
                            {CLOSING_INPUT_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                          </select>
                        </td>

                        {/* Box row toggle */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={item.closing_box_row}
                            onChange={(e) => setField(item.id, "closing_box_row", e.target.checked)}
                            style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer" }}
                          />
                        </td>

                        {/* Loose grid toggle */}
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={item.loose_grid}
                            onChange={(e) => setField(item.id, "loose_grid", e.target.checked)}
                            style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer" }}
                          />
                        </td>
                      </tr>

                      {/* Whipping cream flavour presets sub-row */}
                      {item.closing_inventory_formula === "whipping_cream" && (
                        <tr key={`${item.id}_wc`} className="ct-wc-row">
                          <td colSpan={7}>
                            <div className="ct-wc-block">
                              <button
                                className="ct-wc-toggle"
                                onClick={() => setExpandedWcId(expandedWcId === item.id ? null : item.id)}
                              >
                                {expandedWcId === item.id ? "▲" : "▼"} Flavour weight presets ({(item.wc_flavours ?? []).length} flavours)
                              </button>
                              {expandedWcId === item.id && (
                                <div className="ct-wc-flavours">
                                  <div className="ct-wc-header">
                                    <span>Flavour name</span>
                                    <span>Pumps</span>
                                    <span>ml/pump</span>
                                    <span>Syrup (g)</span>
                                    <span></span>
                                  </div>
                                  {(item.wc_flavours ?? []).map((f, fi) => {
                                    const syrup = f.pump_count * f.ml_per_pump;
                                    return (
                                      <div key={f.id} className="ct-wc-flavour-row">
                                        <input
                                          value={f.name}
                                          placeholder="Name"
                                          onChange={(e) => {
                                            const wc_flavours = (item.wc_flavours ?? []).map((ff, i) =>
                                              i === fi ? { ...ff, name: e.target.value } : ff
                                            );
                                            updateItem(item.id, { wc_flavours });
                                          }}
                                        />
                                        <input
                                          inputMode="numeric"
                                          value={f.pump_count}
                                          onChange={(e) => {
                                            const wc_flavours = (item.wc_flavours ?? []).map((ff, i) =>
                                              i === fi ? { ...ff, pump_count: Number(e.target.value) } : ff
                                            );
                                            updateItem(item.id, { wc_flavours });
                                          }}
                                        />
                                        <input
                                          inputMode="decimal"
                                          value={f.ml_per_pump}
                                          onChange={(e) => {
                                            const wc_flavours = (item.wc_flavours ?? []).map((ff, i) =>
                                              i === fi ? { ...ff, ml_per_pump: Number(e.target.value) } : ff
                                            );
                                            updateItem(item.id, { wc_flavours });
                                          }}
                                        />
                                        <span className="ct-wc-syrup">{syrup} g</span>
                                        <button
                                          className="ct-wc-rm"
                                          onClick={() => {
                                            const wc_flavours = (item.wc_flavours ?? []).filter((_, i) => i !== fi);
                                            updateItem(item.id, { wc_flavours: wc_flavours.length > 0 ? wc_flavours : null });
                                          }}
                                        >✕</button>
                                      </div>
                                    );
                                  })}
                                  <button
                                    className="add-variant-btn"
                                    onClick={() => {
                                      const wc_flavours = [
                                        ...(item.wc_flavours ?? []),
                                        { id: `flavour_${Date.now()}`, name: "", pump_count: 0, ml_per_pump: 5 },
                                      ];
                                      updateItem(item.id, { wc_flavours });
                                    }}
                                  >+ Add flavour</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
