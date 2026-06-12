"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Item, Stage } from "@/lib/types";

const STAGES: { id: Stage; label: string }[] = [
  { id: "back", label: "Back" },
  { id: "front", label: "Front" },
  { id: "expired", label: "Mat. Exp" },
  { id: "closing", label: "Closing" },
];

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

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [newItemDrafts, setNewItemDrafts] = useState<
    Record<string, { name: string; unit: string; appears_in: Stage[] }>
  >({});

  const categories = Array.from(new Set(items.map((i) => i.category))).sort((a, b) => {
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
      appears_in: Array.from(new Set([...draft.appears_in, "sheet2" as Stage])),
      unit: draft.unit.trim() || null,
      per_bag_pcs: null,
      per_box_pcs: null,
      front_per_box_pcs: null,
      closing_per_box_pcs: null,
      bag_size_g: null,
      inventory_bag_size_g: null,
      loss_formula: "none",
      loss_rate: null,
      loss_subtract_ml: null,
      loss_addend_item_id: null,
      default_container_id: null,
      closing_inventory_formula: null,
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

      {categories.map((category) => {
        const categoryItems = items
          .filter((i) => i.category === category)
          .sort((a, b) => a.sort_order - b.sort_order);
        const draft = draftFor(category);
        const isSyrup = category === "Syrup";

        return (
          <div key={category} className="card">
            <div className="card-head">
              <div className="title">{category}</div>
            </div>

            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    {isSyrup ? (
                      <th>ml</th>
                    ) : (
                      <>
                        <th>Unit</th>
                        <th>/bag</th>
                        <th>/box(B)</th>
                        <th>/box(F)</th>
                        <th>/box(C)</th>
                        <th>Bag g</th>
                        <th>Inv bag g</th>
                      </>
                    )}
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {categoryItems.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <input
                          className="name-input"
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      </td>
                      {isSyrup ? (
                        <td>
                          <NumberCell
                            value={item.bag_size_g}
                            onChange={(v) => updateItem(item.id, { bag_size_g: v })}
                          />
                        </td>
                      ) : (
                        <>
                          <td>
                            <input
                              value={item.unit ?? ""}
                              onChange={(e) => updateItem(item.id, { unit: e.target.value || null })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.per_bag_pcs}
                              onChange={(v) => updateItem(item.id, { per_bag_pcs: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.per_box_pcs}
                              onChange={(v) => updateItem(item.id, { per_box_pcs: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.front_per_box_pcs}
                              onChange={(v) => updateItem(item.id, { front_per_box_pcs: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.closing_per_box_pcs}
                              onChange={(v) => updateItem(item.id, { closing_per_box_pcs: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.bag_size_g}
                              onChange={(v) => updateItem(item.id, { bag_size_g: v })}
                            />
                          </td>
                          <td>
                            <NumberCell
                              value={item.inventory_bag_size_g}
                              onChange={(v) => updateItem(item.id, { inventory_bag_size_g: v })}
                            />
                          </td>
                        </>
                      )}
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
