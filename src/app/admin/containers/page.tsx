"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Container, ContainerVariant } from "@/lib/types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export default function AdminContainersPage() {
  const containers = useItemsStore((s) => s.containers);
  const updateContainer = useItemsStore((s) => s.updateContainer);
  const deleteContainer = useItemsStore((s) => s.deleteContainer);
  const addContainer = useItemsStore((s) => s.addContainer);
  const moveContainer = useItemsStore((s) => s.moveContainer);

  const sorted = [...containers].sort((a, b) => a.sort_order - b.sort_order);

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", tare_g: "" });

  function handleAdd() {
    if (!draft.name.trim() || draft.tare_g === "") return;
    const maxOrder = sorted.length > 0 ? sorted[sorted.length - 1].sort_order : 0;
    const newContainer: Container = {
      id: `${slugify(draft.name)}_${Date.now()}`,
      name: draft.name.trim(),
      tare_g: Number(draft.tare_g),
      sort_order: maxOrder + 10,
      tare_variants: null,
    };
    addContainer(newContainer);
    setDraft({ name: "", tare_g: "" });
  }

  function addVariant(c: Container) {
    const variants: ContainerVariant[] = [
      ...(c.tare_variants ?? []),
      { label: "", tare_g: c.tare_g },
    ];
    updateContainer(c.id, { tare_variants: variants });
    setExpandedId(c.id);
  }

  function updateVariant(c: Container, idx: number, partial: Partial<ContainerVariant>) {
    const variants = (c.tare_variants ?? []).map((v, i) => (i === idx ? { ...v, ...partial } : v));
    updateContainer(c.id, { tare_variants: variants });
  }

  function removeVariant(c: Container, idx: number) {
    const variants = (c.tare_variants ?? []).filter((_, i) => i !== idx);
    updateContainer(c.id, { tare_variants: variants.length > 0 ? variants : null });
  }

  return (
    <div className="content">
      <AdminHeader title="Containers" />
      <p className="check">
        Tare weights flow through to Material Expired calculations immediately.
        Container selection order follows the sequence below.
        Expand a container to add weight variants (e.g. with/without cover).
      </p>

      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ width: 68 }}></th>
                <th>Name</th>
                <th>Tare (g)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, idx) => (
                <>
                  <tr key={c.id}>
                    <td style={{ padding: "4px 6px", textAlign: "center" }}>
                      <div className="reorder-pair">
                        <button
                          disabled={idx === 0}
                          onPointerDown={(e) => { e.preventDefault(); moveContainer(c.id, -1); }}
                        >↑</button>
                        <button
                          disabled={idx === sorted.length - 1}
                          onPointerDown={(e) => { e.preventDefault(); moveContainer(c.id, 1); }}
                        >↓</button>
                      </div>
                    </td>
                    <td>
                      <input
                        className="name-input"
                        value={c.name}
                        onChange={(e) => updateContainer(c.id, { name: e.target.value })}
                      />
                    </td>
                    <td>
                      <input
                        inputMode="decimal"
                        value={c.tare_g}
                        onChange={(e) =>
                          updateContainer(c.id, { tare_g: e.target.value === "" ? 0 : Number(e.target.value) })
                        }
                      />
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          style={{ fontSize: 11, padding: "2px 7px" }}
                          onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        >
                          {expandedId === c.id ? "▲" : "▼"} Variants {c.tare_variants?.length ? `(${c.tare_variants.length})` : ""}
                        </button>
                        {confirmingId === c.id ? (
                          <button className="confirm" onClick={() => deleteContainer(c.id)}>
                            Confirm?
                          </button>
                        ) : (
                          <button onClick={() => setConfirmingId(c.id)}>Delete</button>
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedId === c.id && (
                    <tr key={`${c.id}_variants`} className="variant-row">
                      <td />
                      <td colSpan={3}>
                        <div className="variant-block">
                          <div className="variant-header">Weight variants (each gives a selectable tare in counting)</div>
                          {(c.tare_variants ?? []).map((v, vi) => (
                            <div key={vi} className="variant-line">
                              <input
                                className="name-input"
                                placeholder="Label (e.g. With cover)"
                                value={v.label}
                                onChange={(e) => updateVariant(c, vi, { label: e.target.value })}
                              />
                              <input
                                inputMode="decimal"
                                placeholder="Tare (g)"
                                value={v.tare_g}
                                onChange={(e) =>
                                  updateVariant(c, vi, { tare_g: e.target.value === "" ? 0 : Number(e.target.value) })
                                }
                              />
                              <button onClick={() => removeVariant(c, vi)}>✕</button>
                            </div>
                          ))}
                          <button className="add-variant-btn" onClick={() => addVariant(c)}>
                            + Add weight variant
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
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
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="field">
            <div className="lbl">Tare (g)</div>
            <input
              inputMode="decimal"
              value={draft.tare_g}
              onChange={(e) => setDraft({ ...draft, tare_g: e.target.value })}
            />
          </div>
          <button onClick={handleAdd} disabled={!draft.name.trim() || draft.tare_g === ""}>
            + Add container
          </button>
        </div>
      </div>
    </div>
  );
}
