"use client";

import { useState } from "react";
import { seedItems } from "@/data/seedItems";

// Starter Items Manager: lists the seeded item catalog.
// TODO: wire to Supabase `items` table for CRUD + delete-confirmation workflow
// (COUNTING_RULES.md section 7: component -> warning -> confirm -> delete).
export default function AdminItemsPage() {
  const [items] = useState(seedItems);

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-6">
      <h1 className="text-xl font-bold">Items Manager</h1>
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left">
              <th className="p-2">Name</th>
              <th className="p-2">Category</th>
              <th className="p-2">Stages</th>
              <th className="p-2 text-right">/bag pcs</th>
              <th className="p-2 text-right">/box pcs</th>
              <th className="p-2 text-right">Bag size (g)</th>
              <th className="p-2">Loss formula</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-100">
                <td className="p-2">{item.name}</td>
                <td className="p-2 text-gray-500">{item.category}</td>
                <td className="p-2 text-gray-500">{item.appears_in.join(", ")}</td>
                <td className="p-2 text-right">{item.per_bag_pcs ?? "–"}</td>
                <td className="p-2 text-right">{item.per_box_pcs ?? "–"}</td>
                <td className="p-2 text-right">{item.bag_size_g ?? "–"}</td>
                <td className="p-2">{item.loss_formula}</td>
                <td className="p-2 text-right">
                  <button className="rounded border border-gray-300 px-2 py-1 text-xs">Edit</button>{" "}
                  <button className="rounded border border-red-300 px-2 py-1 text-xs text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
