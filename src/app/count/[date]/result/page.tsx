"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";
import { exportSheet2 } from "@/lib/xlsxExport";

export default function ResultPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);

  const items = seedItems
    .filter((i) => i.appears_in.includes("sheet2"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Stage 5 — Final Result (Sheet2)</h2>
      <p className="text-sm text-gray-500">
        Auto-calculated only: Total = Back + Front + Closing. Items absent from a stage count as 0.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left">
              <th className="p-2">Item</th>
              <th className="p-2 text-right">Back</th>
              <th className="p-2 text-right">Front</th>
              <th className="p-2 text-right">Closing</th>
              <th className="p-2 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const entry = record.sheet2[item.id];
              const isNegative = (entry?.total ?? 0) < 0;
              return (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="p-2">{item.name}</td>
                  <td className="p-2 text-right text-gray-500">{entry?.back ?? 0}</td>
                  <td className="p-2 text-right text-gray-500">{entry?.front ?? 0}</td>
                  <td className="p-2 text-right text-gray-500">
                    {entry?.closing != null ? entry.closing.toFixed(3) : 0}
                  </td>
                  <td
                    className={`p-2 text-right font-medium ${
                      isNegative ? "rounded border border-warn bg-red-50 text-red-700" : ""
                    }`}
                  >
                    {entry?.total != null ? entry.total.toFixed(3) : 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex gap-2">
        <button
          className="rounded border border-gray-300 px-4 py-2 text-sm"
          onClick={() => exportSheet2(record, items)}
        >
          Download Sheet2 (.xlsx)
        </button>
        <button className="rounded bg-blue-600 px-4 py-2 text-sm text-white">
          Approve &amp; Save to Drive
        </button>
      </div>
    </div>
  );
}
