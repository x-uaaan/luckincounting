"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";
import { round1 } from "@/lib/calculations";
import { exportSheet2 } from "@/lib/xlsxExport";

export default function ResultPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);

  const items = seedItems
    .filter((i) => i.appears_in.includes("sheet2"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  let grandBack = 0;
  let grandFront = 0;
  let grandClosing = 0;
  let grandTotal = 0;
  for (const item of items) {
    const entry = record.sheet2[item.id];
    grandBack += entry?.back ?? 0;
    grandFront += entry?.front ?? 0;
    grandClosing += entry?.closing ?? 0;
    grandTotal += entry?.total ?? 0;
  }

  return (
    <>
      <div className="summary">
        <div className="label">Total = Back + Front + Closing</div>
        <div className="value">{round1(grandTotal)}</div>
      </div>

      <div className="card">
        <table className="result">
          <thead>
            <tr>
              <th>Item</th>
              <th>Back</th>
              <th>Front</th>
              <th>Closing</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const entry = record.sheet2[item.id];
              return (
                <tr key={item.id}>
                  <td>{item.name}</td>
                  <td>{round1(entry?.back ?? 0)}</td>
                  <td>{round1(entry?.front ?? 0)}</td>
                  <td>{round1(entry?.closing ?? 0)}</td>
                  <td className="total">{round1(entry?.total ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>Grand total</td>
              <td>{round1(grandBack)}</td>
              <td>{round1(grandFront)}</td>
              <td>{round1(grandClosing)}</td>
              <td className="total">{round1(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <button className="submit-btn" onClick={() => exportSheet2(record, items)}>
        Submit for Approval
      </button>
    </>
  );
}
