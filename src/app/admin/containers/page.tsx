"use client";

import { useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";
import type { Container } from "@/lib/types";

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

  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ name: "", tare_g: "" });

  const handleAdd = () => {
    if (!draft.name.trim() || draft.tare_g === "") return;

    const newContainer: Container = {
      id: `${slugify(draft.name)}_${Date.now()}`,
      name: draft.name.trim(),
      tare_g: Number(draft.tare_g),
    };

    addContainer(newContainer);
    setDraft({ name: "", tare_g: "" });
  };

  return (
    <div className="content">
      <AdminHeader title="Containers" />
      <p className="check">
        Edits to container tare weights flow through to the Material Expired calculations immediately.
      </p>

      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Tare (g)</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {containers.map((c) => (
                <tr key={c.id}>
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
