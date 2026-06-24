"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item, Stage } from "@/lib/types";

const STAGES: { id: Stage; label: string }[] = [
  { id: "back", label: "Back" },
  { id: "expired", label: "Mat. Exp" },
  { id: "closing", label: "Closing" },
];

// Per-category numeric columns shown in the admin Items table. "Loss" is
// excluded entirely — its items are managed on /admin/loss instead.
type NumericField = "per_bag_pcs" | "per_box_pcs" | "bag_size_g";

const CATEGORY_COLUMNS: Record<string, { field: NumericField; label: string }[]> = {
  Packaging: [
    { field: "per_box_pcs", label: "Bag/ctn" },
    { field: "per_bag_pcs", label: "Pcs/bag" },
  ],
  Syrup: [],
  "Solid Beverage": [
    { field: "per_box_pcs", label: "Bag/ctn" },
    { field: "bag_size_g", label: "g/bag" },
  ],
  "Coffee Bean": [
    { field: "per_box_pcs", label: "Bag/ctn" },
    { field: "bag_size_g", label: "g/bag" },
  ],
  Frozen: [
    { field: "per_box_pcs", label: "Pcs/ctn" },
  ],
  "Raw Material": [
    { field: "per_box_pcs", label: "Box/ctn" },
  ],
  "Dairy & Soda": [
    { field: "per_bag_pcs", label: "/bag" },
    { field: "per_box_pcs", label: "/ctn" },
  ],
  Merch: [{ field: "per_box_pcs", label: "Pcs/ctn" }],
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function numOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

function NumberCell({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <input
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => onChange(numOrNull(e.target.value))}
    />
  );
}

export default function AdminItemsPage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);
  const addItem = useItemsStore((s) => s.addItem);

  function moveItem(category: string, id: string, dir: number) {
    const catItems = items.filter(i => i.category === category).sort((a, b) => a.sort_order - b.sort_order);
    const idx = catItems.findIndex(i => i.id === id);
    const j = idx + dir;
    if (j < 0 || j >= catItems.length) return;
    const a = catItems[idx], b = catItems[j];
    updateItem(a.id, { sort_order: b.sort_order });
    updateItem(b.id, { sort_order: a.sort_order });
  }

  function moveCategory(catName: string, dir: number) {
    const catIdx = categories.indexOf(catName);
    const j = catIdx + dir;
    if (j < 0 || j >= categories.length) return;
    const catA = categories[catIdx];
    const catB = categories[j];
    const itemsA = items.filter(i => i.category === catA).sort((a, b) => a.sort_order - b.sort_order);
    const itemsB = items.filter(i => i.category === catB).sort((a, b) => a.sort_order - b.sort_order);
    const allOrders = [...itemsA, ...itemsB].map(i => i.sort_order).sort((a, b) => a - b);
    const upper = dir > 0 ? itemsB : itemsA;
    const lower = dir > 0 ? itemsA : itemsB;
    upper.forEach((item, i) => updateItem(item.id, { sort_order: allOrders[i] }));
    lower.forEach((item, i) => updateItem(item.id, { sort_order: allOrders[upper.length + i] }));
  }

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newItemDrafts, setNewItemDrafts] = useState<
    Record<string, { name: string; unit: string; appears_in: Stage[] }>
  >({});

  const categories = Array.from(new Set(items.map((i) => i.category)))
    .filter((c) => c !== "Loss")
    .sort((a, b) => {
      const aMin = Math.min(...items.filter((i) => i.category === a).map((i) => i.sort_order));
      const bMin = Math.min(...items.filter((i) => i.category === b).map((i) => i.sort_order));
      return aMin - bMin;
    });

  const draftFor = (category: string) =>
    newItemDrafts[category] ?? { name: "", unit: "", appears_in: [] as Stage[] };

  const setDraft = (category: string, draft: { name: string; unit: string; appears_in: Stage[] }) => {
    setNewItemDrafts((prev) => ({ ...prev, [category]: draft }));
  };

  const toggleStage = (category: string, stage: Stage) => {
    const draft = draftFor(category);
    const appears_in = draft.appears_in.includes(stage)
      ? draft.appears_in.filter((s) => s !== stage)
      : [...draft.appears_in, stage];
    setDraft(category, { ...draft, appears_in });
  };

  const handleAdd = (category: string) => {
    const draft = draftFor(category);
    if (!draft.name.trim()) return;

    const categoryItems = items.filter((i) => i.category === category);
    const maxSort = categoryItems.length > 0 ? Math.max(...categoryItems.map((i) => i.sort_order)) : 0;

    const newItem: Item = {
      id: `${slugify(draft.name)}_${Date.now()}`,
      name: draft.name.trim(),
      category,
      sort_order: maxSort + 10,
      final_sort_order: null,
      closing_sort_order: null,
      front_sort_order: null,
      appears_in: Array.from(new Set([...draft.appears_in, "sheet2" as Stage])),
      unit: draft.unit.trim() || null,
      per_bag_pcs: null,
      back_loose_formula: null,
      per_box_pcs: null,
      front_per_box_pcs: null,
      closing_per_box_pcs: null,
      bag_size_g: null,
      inventory_bag_size_g: null,
      loss_formula: "none",
      loss_rate: null,
      loss_components: null,
      loss_role: "input_and_summary",
      default_container_id: null,
      closing_inventory_formula: null,
      closing_container_input: false,
      unopened_stack_size: null,
      closing_box_row: true,
      loose_grid: false,
      closing_input_type: "count",
      notes: null,
    };

    addItem(newItem);
    setDraft(category, { name: "", unit: "", appears_in: [] });
  };

  return (
    <div className="content">
      <AdminHeader title="Items" />
      <p className="check">
        Edits to weights and calc factors flow through to the counting sheet immediately.
        New items are always added to the Final (Sheet2) sheet.
      </p>


      {categories.map((category, catIdx) => {
        const categoryItems = items
          .filter((i) => i.category === category)
          .sort((a, b) => a.sort_order - b.sort_order);
        const draft = draftFor(category);
        const columns = CATEGORY_COLUMNS[category] ?? [];

        return (
          <div key={category} className="card">
            <div className="card-head">
              <div className="title">{category}</div>
              <div className="reorder-pair">
                <button disabled={catIdx === 0} onPointerDown={(e) => { e.preventDefault(); moveCategory(category, -1); }}>↑</button>
                <button disabled={catIdx === categories.length - 1} onPointerDown={(e) => { e.preventDefault(); moveCategory(category, 1); }}>↓</button>
              </div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th style={{ width: 68, textAlign: "center" }}></th>
                    <th>Name</th>
                    <th>Unit</th>
                    {columns.map((col) => (
                      <th key={col.field}>{col.label}</th>
                    ))}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item, itemIdx) => (
                    <tr key={item.id}>
                      <td style={{ padding: "4px 6px", textAlign: "center", verticalAlign: "middle" }}>
                        <div className="reorder-pair">
                          <button disabled={itemIdx === 0} onPointerDown={(e) => { e.preventDefault(); moveItem(category, item.id, -1); }}>↑</button>
                          <button disabled={itemIdx === categoryItems.length - 1} onPointerDown={(e) => { e.preventDefault(); moveItem(category, item.id, 1); }}>↓</button>
                        </div>
                      </td>
                      <td>
                        <input
                          className="name-input"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          value={item.unit ?? ""}
                          onChange={(e) => updateItem(item.id, { unit: e.target.value || null })}
                        />
                      </td>
                      {columns.map((col) => (
                        <td key={col.field}>
                          <NumberCell
                            value={item[col.field]}
                            onChange={(v) => updateItem(item.id, { [col.field]: v })}
                          />
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          {confirmingId === item.id ? (
                            <button className="confirm" onClick={() => deleteItem(item.id)}>
                              Confirm?
                            </button>
                          ) : (
                            <button onClick={() => setConfirmingId(item.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="add-row-form">
              <div className="field">
                <div className="lbl">Name</div>
                <input
                  className="name-input"
                  value={draft.name}
                  onChange={(e) => setDraft(category, { ...draft, name: e.target.value })}
                />
              </div>
              <div className="field">
                <div className="lbl">Unit</div>
                <input
                  value={draft.unit}
                  onChange={(e) => setDraft(category, { ...draft, unit: e.target.value })}
                />
              </div>
              <div className="checkbox-group">
                {STAGES.map((stage) => (
                  <label key={stage.id}>
                    <input
                      type="checkbox"
                      checked={draft.appears_in.includes(stage.id)}
                      onChange={() => toggleStage(category, stage.id)}
                    />
                    {stage.label}
                  </label>
                ))}
              </div>
              <button onClick={() => handleAdd(category)} disabled={!draft.name.trim()}>
                + Add item
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
