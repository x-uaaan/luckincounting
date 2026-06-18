"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item, LossFormula } from "@/lib/types";

const HIDDEN_IDS = new Set(["soda_loss", "cheese_cap", "coconut_cheese_cap"]);

function numOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

function makeId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return slug + "_" + Date.now().toString(36);
}

function nextSortOrder(items: Item[]): number {
  return items.reduce((m, i) => Math.max(m, i.sort_order), 0) + 1;
}

const ITEM_DEFAULTS = {
  final_sort_order: null as null,
  closing_sort_order: null as null,
  front_sort_order: null as null,
  unit: "g",
  per_bag_pcs: null as null,
  back_loose_formula: null as null,
  per_box_pcs: null as null,
  front_per_box_pcs: null as null,
  closing_per_box_pcs: null as null,
  bag_size_g: null as null,
  inventory_bag_size_g: null as null,
  loss_rate: null as null,
  loss_components: null as null,
  default_container_id: null as null,
  closing_inventory_formula: null as null,
  closing_container_input: false,
  unopened_stack_size: null as null,
  closing_box_row: false,
  loose_grid: false,
  closing_input_type: "weight" as const,
  notes: null as null,
};

type LossComp = { source_item_id: string; rate: number };

/* ── Add Product form ── */
function AddProductForm({ onDone }: { onDone: () => void }) {
  const allItems = useItemsStore((s) => s.items);
  const addItem = useItemsStore((s) => s.addItem);
  const containers = useItemsStore((s) => s.containers);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [formula, setFormula] = useState("direct");
  const [rate, setRate] = useState("");
  const [containerId, setContainerId] = useState("");

  function handleAdd() {
    if (!name.trim()) return;
    const item: Item = {
      ...ITEM_DEFAULTS,
      id: makeId(name),
      name: name.trim(),
      category: category.trim() || "Uncategorised",
      sort_order: nextSortOrder(allItems),
      appears_in: ["expired"],
      loss_formula: formula as LossFormula,
      loss_rate: formula === "multiply" ? numOrNull(rate) : null,
      loss_role: "input",
      default_container_id: containerId || null,
    };
    addItem(item);
    onDone();
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
        <div className="field" style={{ flex: "1 1 120px" }}>
          <div className="lbl">Name</div>
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Product name"
          />
        </div>
        <div className="field" style={{ flex: "1 1 100px" }}>
          <div className="lbl">Category</div>
          <input
            className="name-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
          />
        </div>
        <div className="field" style={{ flex: "0 0 100px" }}>
          <div className="lbl">Formula</div>
          <select value={formula} onChange={(e) => setFormula(e.target.value)}>
            <option value="direct">Direct</option>
            <option value="multiply">x Rate</option>
          </select>
        </div>
        {formula === "multiply" && (
          <div className="field w70">
            <div className="lbl">Rate</div>
            <input
              inputMode="decimal"
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="0.000"
            />
          </div>
        )}
        <div className="field" style={{ flex: "0 0 120px" }}>
          <div className="lbl">Container (opt.)</div>
          <select value={containerId} onChange={(e) => setContainerId(e.target.value)}>
            <option value="">None</option>
            {containers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.tare_g})</option>
            ))}
          </select>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="admin-btn-sm" onClick={handleAdd} disabled={!name.trim()}>Add</button>
        <button className="clear-btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Add Material form ── */
function AddMaterialForm({ onDone }: { onDone: () => void }) {
  const allItems = useItemsStore((s) => s.items);
  const addItem = useItemsStore((s) => s.addItem);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [comps, setComps] = useState([{ source_item_id: "", rate: 0 }] as LossComp[]);

  function setComp(idx: number, partial: Partial<LossComp>) {
    setComps((prev) => prev.map((c, i) => (i === idx ? { ...c, ...partial } : c)));
  }

  function handleAdd() {
    if (!name.trim()) return;
    const validComps = comps.filter((c) => c.source_item_id);
    const item: Item = {
      ...ITEM_DEFAULTS,
      id: makeId(name),
      name: name.trim(),
      category: category.trim() || "Uncategorised",
      sort_order: nextSortOrder(allItems),
      appears_in: ["expired"],
      loss_formula: "components",
      loss_role: "summary",
      loss_components: validComps.length > 0 ? validComps : null,
    };
    addItem(item);
    onDone();
  }

  return (
    <div className="card" style={{ marginTop: 8 }}>
      <div className="row" style={{ flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        <div className="field" style={{ flex: "1 1 140px" }}>
          <div className="lbl">Name</div>
          <input
            className="name-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Material name"
          />
        </div>
        <div className="field" style={{ flex: "1 1 120px" }}>
          <div className="lbl">Category</div>
          <input
            className="name-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category"
          />
        </div>
      </div>

      <div className="lbl" style={{ marginBottom: 4 }}>Sources (item x rate)</div>
      {comps.map((comp, idx) => (
        <div key={idx} className="row" style={{ gap: 6, marginBottom: 6, alignItems: "center" }}>
          <div className="field" style={{ flex: 1 }}>
            <select
              value={comp.source_item_id}
              onChange={(e) => setComp(idx, { source_item_id: e.target.value })}
            >
              <option value="">-- Select item --</option>
              {allItems.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
          </div>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>x</span>
          <div className="field w70">
            <input
              inputMode="decimal"
              value={comp.rate}
              onChange={(e) => setComp(idx, { rate: Number(e.target.value) })}
              placeholder="0.000"
            />
          </div>
          {comps.length > 1 && (
            <button
              className="cancel-action-btn"
              onClick={() => setComps((prev) => prev.filter((_, i) => i !== idx))}
            >x</button>
          )}
        </div>
      ))}
      <button
        className="add-btn"
        onClick={() => setComps((prev) => [...prev, { source_item_id: "", rate: 0 }])}
      >
        + Add source
      </button>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button className="admin-btn-sm" onClick={handleAdd} disabled={!name.trim()}>Add</button>
        <button className="clear-btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  );
}

/* ── Inline component editor for material rows ── */
function CompEditor({ item }: { item: Item }) {
  const allItems = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);
  const comps = item.loss_components ?? [];

  function save(next: LossComp[]) {
    updateItem(item.id, { loss_components: next.length > 0 ? next : null });
  }

  return (
    <div>
      {comps.map((comp, idx) => (
        <div key={idx} style={{ display: "flex", gap: 4, alignItems: "center", marginBottom: 4 }}>
          <select
            value={comp.source_item_id}
            style={{ flex: 1, fontSize: 11 }}
            onChange={(e) => save(comps.map((c, i) => (i === idx ? { ...c, source_item_id: e.target.value } : c)))}
          >
            <option value="">-- item --</option>
            {allItems.map((i) => (
              <option key={i.id} value={i.id}>{i.name}</option>
            ))}
          </select>
          <span style={{ fontSize: 11 }}>x</span>
          <input
            inputMode="decimal"
            style={{ width: 54, fontSize: 11 }}
            value={comp.rate}
            onChange={(e) => save(comps.map((c, i) => (i === idx ? { ...c, rate: Number(e.target.value) } : c)))}
          />
          <button
            className="cancel-action-btn"
            onClick={() => save(comps.filter((_, i) => i !== idx))}
          >x</button>
        </div>
      ))}
      <button
        className="add-btn"
        style={{ fontSize: 10, padding: "2px 8px" }}
        onClick={() => save([...comps, { source_item_id: "", rate: 0 }])}
      >
        + source
      </button>
    </div>
  );
}

/* ── Main page ── */
export default function AdminLossPage() {
  const items = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);
  const updateItem = useItemsStore((s) => s.updateItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddMaterial, setShowAddMaterial] = useState(false);

  const expired = items
    .filter((i) => i.appears_in.includes("expired") && !HIDDEN_IDS.has(i.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  const lossRateItems = expired.filter((i) => i.loss_role === "input_and_summary");
  const productItems = expired.filter((i) => i.loss_role === "input");
  const materialItems = expired.filter((i) => i.loss_role === "summary");

  function confirmDelete(item: Item) {
    if (window.confirm(`Delete "${item.name}"?`)) deleteItem(item.id);
  }

  return (
    <div className="content">
      <AdminHeader title="Loss" />

      {/* Loss rates */}
      <div className="category-label" style={{ marginTop: 0 }}>Loss rates</div>
      <p className="check">Edit name, category, or loss rate for items that appear in both sections.</p>
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Loss rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {lossRateItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input className="name-input" value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="name-input" value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })} />
                  </td>
                  <td>
                    {item.loss_formula === "multiply" && (
                      <input inputMode="decimal" value={item.loss_rate ?? ""}
                        onChange={(e) => updateItem(item.id, { loss_rate: numOrNull(e.target.value) })} />
                    )}
                    {item.loss_formula === "components" &&
                      (item.loss_components ?? []).map((c, idx) => {
                        const srcName = items.find((i) => i.id === c.source_item_id)?.name ?? c.source_item_id;
                        return (
                          <div key={c.source_item_id} className="admin-rate-row">
                            <span className="admin-rate-label">via {srcName}</span>
                            <input inputMode="decimal" value={c.rate}
                              onChange={(e) => {
                                const rate = Number(e.target.value);
                                const loss_components = (item.loss_components ?? []).map((cc, i) =>
                                  i === idx ? { ...cc, rate } : cc
                                );
                                updateItem(item.id, { loss_components });
                              }} />
                          </div>
                        );
                      })}
                    {item.loss_formula === "direct" && <span style={{ color: "var(--text-secondary)" }}>direct</span>}
                  </td>
                  <td>
                    <button className="admin-btn-sm reject-btn" onClick={() => confirmDelete(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products */}
      <div className="category-label">Products</div>
      <p className="check">Upper section of Material Exp — user enters weight directly.</p>
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Container</th>
                <th>Formula</th>
                <th>Rate</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {productItems.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--text-secondary)", fontSize: 12 }}>No products</td>
                </tr>
              )}
              {productItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input className="name-input" value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="name-input" value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })} />
                  </td>
                  <td>
                    <select
                      value={item.default_container_id ?? ""}
                      onChange={(e) => updateItem(item.id, { default_container_id: e.target.value || null })}
                      style={{ fontSize: 12 }}
                    >
                      <option value="">None</option>
                      {containers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={item.loss_formula}
                      onChange={(e) => updateItem(item.id, { loss_formula: e.target.value as LossFormula })}
                      style={{ fontSize: 12 }}
                    >
                      <option value="direct">Direct</option>
                      <option value="multiply">x Rate</option>
                    </select>
                  </td>
                  <td>
                    {item.loss_formula === "multiply" ? (
                      <input inputMode="decimal" value={item.loss_rate ?? ""}
                        onChange={(e) => updateItem(item.id, { loss_rate: numOrNull(e.target.value) })} />
                    ) : (
                      <span style={{ color: "var(--text-secondary)" }}>—</span>
                    )}
                  </td>
                  <td>
                    <button className="admin-btn-sm reject-btn" onClick={() => confirmDelete(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddProduct ? (
        <AddProductForm onDone={() => setShowAddProduct(false)} />
      ) : (
        <button className="add-btn" style={{ marginTop: 8 }} onClick={() => setShowAddProduct(true)}>
          + Add product
        </button>
      )}

      {/* Materials */}
      <div className="category-label" style={{ marginTop: 20 }}>Materials</div>
      <p className="check">Summary section of Material Exp — derived from other item volumes. Sources must be existing items.</p>
      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Sources (item x rate)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {materialItems.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ color: "var(--text-secondary)", fontSize: 12 }}>No materials</td>
                </tr>
              )}
              {materialItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input className="name-input" value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })} />
                  </td>
                  <td>
                    <input className="name-input" value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })} />
                  </td>
                  <td>
                    <CompEditor item={item} />
                  </td>
                  <td>
                    <button className="admin-btn-sm reject-btn" onClick={() => confirmDelete(item)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddMaterial ? (
        <AddMaterialForm onDone={() => setShowAddMaterial(false)} />
      ) : (
        <button className="add-btn" style={{ marginTop: 8 }} onClick={() => setShowAddMaterial(true)}>
          + Add material
        </button>
      )}
    </div>
  );
}
