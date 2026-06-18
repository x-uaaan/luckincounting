"use client";

import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";

function numOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function AdminLossPage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);
  const deleteItem = useItemsStore((s) => s.deleteItem);

  const HIDDEN_IDS = new Set(["soda_loss", "cheese_cap", "coconut_cheese_cap"]);
  const lossItems = items
    .filter((i) => i.appears_in.includes("expired") && !HIDDEN_IDS.has(i.id))
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="content">
      <AdminHeader title="Loss" />
      <p className="check">
        Material Expired items — edit name, category, loss rate, or delete.
      </p>

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
              {lossItems.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input
                      className="name-input"
                      value={item.name}
                      onChange={(e) => updateItem(item.id, { name: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="name-input"
                      value={item.category}
                      onChange={(e) => updateItem(item.id, { category: e.target.value })}
                    />
                  </td>
                  <td>
                    {item.loss_formula === "multiply" && (
                      <input
                        inputMode="decimal"
                        value={item.loss_rate ?? ""}
                        onChange={(e) => updateItem(item.id, { loss_rate: numOrNull(e.target.value) })}
                      />
                    )}
                    {item.loss_formula === "components" &&
                      (item.loss_components ?? []).map((c, idx) => {
                        const srcName = items.find((i) => i.id === c.source_item_id)?.name ?? c.source_item_id;
                        return (
                          <div key={c.source_item_id} className="admin-rate-row">
                            <span className="admin-rate-label">via {srcName}</span>
                            <input
                              inputMode="decimal"
                              value={c.rate}
                              onChange={(e) => {
                                const rate = Number(e.target.value);
                                const loss_components = (item.loss_components ?? []).map((cc, i) =>
                                  i === idx ? { ...cc, rate } : cc
                                );
                                updateItem(item.id, { loss_components });
                              }}
                            />
                          </div>
                        );
                      })}
                    {item.loss_formula === "direct" && "—"}
                  </td>
                  <td>
                    <button
                      className="admin-btn-sm reject-btn"
                      onClick={() => {
                        if (window.confirm(`Delete "${item.name}"?`)) deleteItem(item.id);
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
