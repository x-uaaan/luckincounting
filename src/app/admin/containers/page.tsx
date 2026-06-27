"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Container, ContainerVariant } from "@/lib/types";

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export default function AdminContainersPage() {
  const containers = useItemsStore((s) => s.containers);
  const updateContainer = useItemsStore((s) => s.updateContainer);
  const deleteContainer = useItemsStore((s) => s.deleteContainer);
  const addContainer = useItemsStore((s) => s.addContainer);
  const moveContainer = useItemsStore((s) => s.moveContainer);

  const sorted = [...containers].sort((a, b) => a.sort_order - b.sort_order);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", tare_g: "" });

  function handleAdd() {
    if (!draft.name.trim() || draft.tare_g === "") return;
    const maxOrder = sorted.length > 0 ? sorted[sorted.length - 1].sort_order : 0;
    addContainer({
      id: `${slugify(draft.name)}_${Date.now()}`,
      name: draft.name.trim(),
      tare_g: Number(draft.tare_g),
      sort_order: maxOrder + 10,
      tare_variants: null,
    });
    setDraft({ name: "", tare_g: "" });
  }

  function addVariant(c: Container) {
    const variants: ContainerVariant[] = [...(c.tare_variants ?? []), { label: "", tare_g: c.tare_g }];
    updateContainer(c.id, { tare_variants: variants });
  }

  function updateVariant(c: Container, idx: number, partial: Partial<ContainerVariant>) {
    const variants = (c.tare_variants ?? []).map((v, i) => i === idx ? { ...v, ...partial } : v);
    updateContainer(c.id, { tare_variants: variants });
  }

  function removeVariant(c: Container, idx: number) {
    const variants = (c.tare_variants ?? []).filter((_, i) => i !== idx);
    updateContainer(c.id, { tare_variants: variants.length > 0 ? variants : null });
  }

  // Build flat rows: each container produces 1 base row + N variant rows
  const rows: Array<
    | { kind: "base"; c: Container; cIdx: number; totalRows: number }
    | { kind: "variant"; c: Container; v: ContainerVariant; vi: number }
  > = [];

  for (let ci = 0; ci < sorted.length; ci++) {
    const c = sorted[ci];
    const varCount = c.tare_variants?.length ?? 0;
    rows.push({ kind: "base", c, cIdx: ci, totalRows: 1 + varCount });
    for (let vi = 0; vi < varCount; vi++) {
      rows.push({ kind: "variant", c, v: c.tare_variants![vi], vi });
    }
  }

  return (
    <div className="content">
      <AdminHeader title="Containers" />
      <p className="check">
        Tare weights flow through to Material Expired immediately.
        Variants (e.g. with/without cover) appear as separate options in counting.
      </p>

      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table ct-tbl">
            <thead>
              <tr>
                <th style={{ width: 68 }}></th>
                <th>Container</th>
                <th>Variant</th>
                <th>Weight (g)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => {
                if (row.kind === "base") {
                  const { c, cIdx, totalRows } = row;
                  return (
                    <tr key={`${c.id}_base`} className="ct-base-row">
                      {/* Reorder — only on base row, spans all rows */}
                      <td rowSpan={totalRows} style={{ verticalAlign: "middle", textAlign: "center", padding: "4px 6px" }}>
                        <div className="reorder-pair">
                          <button disabled={cIdx === 0} onPointerDown={(e) => { e.preventDefault(); moveContainer(c.id, -1); }}>↑</button>
                          <button disabled={cIdx === sorted.length - 1} onPointerDown={(e) => { e.preventDefault(); moveContainer(c.id, 1); }}>↓</button>
                        </div>
                      </td>
                      {/* Container name — spans all rows */}
                      <td rowSpan={totalRows} style={{ verticalAlign: "middle" }}>
                        <input
                          className="name-input"
                          value={c.name}
                          onChange={(e) => updateContainer(c.id, { name: e.target.value })}
                        />
                      </td>
                      {/* Variant label — blank for base */}
                      <td className="ct-variant-cell">
                        <span className="ct-base-label">base</span>
                      </td>
                      {/* Base tare */}
                      <td>
                        <input
                          className="ct-weight-input"
                          inputMode="decimal"
                          value={c.tare_g}
                          onChange={(e) => updateContainer(c.id, { tare_g: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </td>
                      {/* Actions — spans all rows */}
                      <td rowSpan={totalRows} style={{ verticalAlign: "middle" }}>
                        <div className="row-actions" style={{ flexDirection: "column", gap: 4 }}>
                          <button
                            className="ct-add-variant-btn"
                            onClick={() => addVariant(c)}
                          >+ variant</button>
                          {confirmingId === c.id ? (
                            <button className="confirm" onClick={() => deleteContainer(c.id)}>Confirm?</button>
                          ) : (
                            <button onClick={() => setConfirmingId(c.id)}>Delete</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  const { c, v, vi } = row;
                  return (
                    <tr key={`${c.id}_v${vi}`} className="ct-variant-row">
                      <td className="ct-variant-cell">
                        <input
                          className="name-input ct-variant-name"
                          placeholder="Label"
                          value={v.label}
                          onChange={(e) => updateVariant(c, vi, { label: e.target.value })}
                        />
                      </td>
                      <td>
                        <input
                          className="ct-weight-input"
                          inputMode="decimal"
                          value={v.tare_g}
                          onChange={(e) => updateVariant(c, vi, { tare_g: e.target.value === "" ? 0 : Number(e.target.value) })}
                        />
                      </td>
                      <td style={{ verticalAlign: "middle", paddingLeft: 8 }}>
                        <button className="ct-rm-variant" onClick={() => removeVariant(c, vi)}>✕</button>
                      </td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>

        <div className="add-row-form">
          <div className="field">
            <div className="lbl">Name</div>
            <input className="name-input" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div className="field">
            <div className="lbl">Base weight (g)</div>
            <input inputMode="decimal" value={draft.tare_g} onChange={(e) => setDraft({ ...draft, tare_g: e.target.value })} />
          </div>
          <button onClick={handleAdd} disabled={!draft.name.trim() || draft.tare_g === ""}>+ Add container</button>
        </div>
      </div>
    </div>
  );
}
