"use client";

import React from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item } from "@/lib/types";

const BACK_FORMULAS: { value: string; label: string }[] = [
  { value: "",           label: "bags × pcs/bag" },
  { value: "stack_box", label: "stacks × size + loose" },
  { value: "bag_count", label: "bag count × bag_size_g" },
  { value: "hidden",    label: "hidden (no loose row)" },
];

const CLOSING_FORMULAS: { value: string; label: string }[] = [
  { value: "",                     label: "enter directly" },
  { value: "non_coffee",           label: "bag_size − used (non_coffee)" },
  { value: "under_cabinet",        label: "bag_size − stored (under_cabinet)" },
  { value: "container_direct",     label: "gross − tare" },
  { value: "container_plus_loose", label: "loose + (gross−tare)/bag_size" },
  { value: "stack_box",            label: "stacks × size + loose" },
  { value: "whipping_cream",       label: "whipping cream (3-row)" },
];

const CLOSING_INPUT: { value: string; label: string }[] = [
  { value: "count",   label: "count" },
  { value: "weight",  label: "weight ÷ bag_size_g" },
  { value: "sleeves", label: "sleeves × pcs/bag" },
];

const LOSS_FORMULAS: { value: string; label: string }[] = [
  { value: "none",       label: "none" },
  { value: "direct",     label: "direct (gross − tare)" },
  { value: "multiply",   label: "net × rate" },
  { value: "components", label: "components (multi-material)" },
];

function Sel({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <select className="ct-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function NumIn({ value, onChange, placeholder = "—", width = 60 }: {
  value: number | null; onChange: (v: number | null) => void; placeholder?: string; width?: number;
}) {
  return (
    <input
      className="ct-num"
      style={{ width }}
      inputMode="numeric"
      value={value ?? ""}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
    />
  );
}

export default function AdminCalcTypePage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);

  function set<K extends keyof Item>(id: string, k: K, v: Item[K]) {
    updateItem(id, { [k]: v } as Partial<Item>);
  }

  const backItems = items
    .filter((i) => i.appears_in.includes("back"))
    .sort((a, b) => a.sort_order - b.sort_order);

  const matExpItems = items
    .filter((i) => i.appears_in.includes("expired") && i.loss_role === "input")
    .sort((a, b) => a.sort_order - b.sort_order);

  const closingItems = items
    .filter((i) => i.appears_in.includes("closing"))
    .sort((a, b) => (a.closing_sort_order ?? a.sort_order) - (b.closing_sort_order ?? b.sort_order));

  return (
    <div className="content">
      <AdminHeader title="Calc Type" />
      <p className="check">
        Configure how each item is calculated per stage.
        Changes persist immediately. Edit stack size and whipping cream flavours here.
      </p>

      {/* ── BACK ── */}
      <div className="category-label" style={{ marginTop: 0 }}>Back</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table ct-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Formula</th>
                <th>Stack size</th>
                <th>Pcs/bag</th>
                <th>Pcs/box</th>
              </tr>
            </thead>
            <tbody>
              {backItems.map((item) => (
                <tr key={item.id}>
                  <td className="ct-name-cell">{item.name}</td>
                  <td>
                    <Sel
                      value={item.back_loose_formula ?? ""}
                      options={BACK_FORMULAS}
                      onChange={(v) => set(item.id, "back_loose_formula", (v || null) as Item["back_loose_formula"])}
                    />
                  </td>
                  <td><NumIn value={item.unopened_stack_size} onChange={(v) => set(item.id, "unopened_stack_size", v)} /></td>
                  <td><NumIn value={item.per_bag_pcs} onChange={(v) => set(item.id, "per_bag_pcs", v)} /></td>
                  <td><NumIn value={item.per_box_pcs} onChange={(v) => set(item.id, "per_box_pcs", v)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MAT EXP ── */}
      <div className="category-label">Mat Exp</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table ct-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Loss formula</th>
                <th>Rate</th>
              </tr>
            </thead>
            <tbody>
              {matExpItems.map((item) => (
                <tr key={item.id}>
                  <td className="ct-name-cell">{item.name}</td>
                  <td>
                    <Sel
                      value={item.loss_formula}
                      options={LOSS_FORMULAS}
                      onChange={(v) => set(item.id, "loss_formula", v as Item["loss_formula"])}
                    />
                  </td>
                  <td>
                    <NumIn
                      value={item.loss_rate}
                      onChange={(v) => set(item.id, "loss_rate", v)}
                      width={70}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CLOSING ── */}
      <div className="category-label">Closing</div>
      <div className="card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table ct-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Formula</th>
                <th>Input type</th>
                <th style={{ textAlign: "center" }}>Box row</th>
                <th style={{ textAlign: "center" }}>Loose grid</th>
                <th>Bag size (g)</th>
              </tr>
            </thead>
            <tbody>
              {closingItems.map((item) => (
                <React.Fragment key={item.id}>
                  <tr>
                    <td className="ct-name-cell">{item.name}</td>
                    <td>
                      <Sel
                        value={item.closing_inventory_formula ?? ""}
                        options={CLOSING_FORMULAS}
                        onChange={(v) => set(item.id, "closing_inventory_formula", (v || null) as Item["closing_inventory_formula"])}
                      />
                    </td>
                    <td>
                      <Sel
                        value={item.closing_input_type}
                        options={CLOSING_INPUT}
                        onChange={(v) => set(item.id, "closing_input_type", v as Item["closing_input_type"])}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={item.closing_box_row}
                        onChange={(e) => set(item.id, "closing_box_row", e.target.checked)}
                        style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={item.loose_grid}
                        onChange={(e) => set(item.id, "loose_grid", e.target.checked)}
                        style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer" }}
                      />
                    </td>
                    <td><NumIn value={item.bag_size_g} onChange={(v) => set(item.id, "bag_size_g", v)} width={70} /></td>
                  </tr>

                  {/* Whipping cream flavour presets */}
                  {item.closing_inventory_formula === "whipping_cream" && (
                    <tr className="ct-wc-sub">
                      <td />
                      <td colSpan={5}>
                        <div className="ct-wc-block">
                          <div className="ct-wc-header">
                            <span>Flavour name</span><span>Pumps</span><span>ml/pump</span><span>→ syrup (g)</span><span></span>
                          </div>
                          {(item.wc_flavours ?? []).map((f, fi) => (
                            <div key={f.id} className="ct-wc-flavour-row">
                              <input value={f.name} placeholder="Name"
                                onChange={(e) => {
                                  const wc_flavours = (item.wc_flavours ?? []).map((ff, i) => i === fi ? { ...ff, name: e.target.value } : ff);
                                  updateItem(item.id, { wc_flavours });
                                }} />
                              <input inputMode="numeric" value={f.pump_count}
                                onChange={(e) => {
                                  const wc_flavours = (item.wc_flavours ?? []).map((ff, i) => i === fi ? { ...ff, pump_count: Number(e.target.value) } : ff);
                                  updateItem(item.id, { wc_flavours });
                                }} />
                              <input inputMode="decimal" value={f.ml_per_pump}
                                onChange={(e) => {
                                  const wc_flavours = (item.wc_flavours ?? []).map((ff, i) => i === fi ? { ...ff, ml_per_pump: Number(e.target.value) } : ff);
                                  updateItem(item.id, { wc_flavours });
                                }} />
                              <span className="ct-wc-syrup">{f.pump_count * f.ml_per_pump} g</span>
                              <button className="ct-wc-rm" onClick={() => {
                                const wc_flavours = (item.wc_flavours ?? []).filter((_, i) => i !== fi);
                                updateItem(item.id, { wc_flavours: wc_flavours.length > 0 ? wc_flavours : null });
                              }}>✕</button>
                            </div>
                          ))}
                          <button className="add-variant-btn" style={{ marginTop: 4 }} onClick={() => {
                            const wc_flavours = [...(item.wc_flavours ?? []), { id: `f_${Date.now()}`, name: "", pump_count: 0, ml_per_pump: 5 }];
                            updateItem(item.id, { wc_flavours });
                          }}>+ Add flavour</button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
