"use client";

import AdminHeader from "@/components/AdminHeader";
import { useItemsStore } from "@/store/useItemsStore";

function numOrNull(value: string): number | null {
  return value === "" ? null : Number(value);
}

export default function AdminLossPage() {
  const items = useItemsStore((s) => s.items);
  const updateItem = useItemsStore((s) => s.updateItem);

  const lossItems = items
    .filter((i) => i.appears_in.includes("expired"))
    .sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="content">
      <AdminHeader title="Loss" />
      <p className="check">
        All items counted in Material Expired, with their loss-rate fraction (e.g. 0.45 = 45%).
      </p>

      <div className="card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Loss rate</th>
              </tr>
            </thead>
            <tbody>
              {lossItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{item.category}</td>
                  <td>
                    <input
                      inputMode="decimal"
                      value={item.loss_rate ?? ""}
                      onChange={(e) => updateItem(item.id, { loss_rate: numOrNull(e.target.value) })}
                    />
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
