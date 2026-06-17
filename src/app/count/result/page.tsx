"use client";

import { Fragment } from "react";
import Link from "next/link";
import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import { round1 } from "@/lib/calculations";
import { exportSheet2 } from "@/lib/xlsxExport";
import CategoryNav, { categoryAnchorId } from "@/components/CategoryNav";

const STAGE_LABELS: Record<string, string> = {
  back: "Back",
  front: "Front",
  expired: "Material Exp",
  closing: "Closing",
  sheet2: "Final",
};

export default function ResultPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const selfCheckRan = useCountingStore((s) => s.selfCheckRan);
  const runSelfCheck = useCountingStore((s) => s.runSelfCheck);
  const allItems = useItemsStore((s) => s.items);

  const items = allItems
    .filter((i) => i.appears_in.includes("sheet2"))
    .sort(
      (a, b) =>
        (a.final_sort_order ?? a.sort_order) - (b.final_sort_order ?? b.sort_order)
    );

  if (!record) return null;

  const categories = Array.from(new Set(items.map((i) => i.category)));
  let currentCategory = "";

  return (
    <>
      <CategoryNav categories={categories} />

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
              const showCategory = item.category !== currentCategory;
              currentCategory = item.category;
              return (
                <Fragment key={item.id}>
                  {showCategory && (
                    <tr className="category-row">
                      <td colSpan={5} id={categoryAnchorId(item.category)}>
                        {item.category}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td>{item.name}</td>
                    <td>{round1(entry?.back ?? 0)}</td>
                    <td>{round1(entry?.front ?? 0)}</td>
                    <td>{round1(entry?.closing ?? 0)}</td>
                    <td className="total">{round1(entry?.total ?? 0)}</td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <button className="submit-btn" onClick={runSelfCheck}>
        Self Check
      </button>

      {selfCheckRan && selfCheckWarnings.length > 0 && (
        <div className="card warn">
          <div className="card-head">
            <div className="title">Self check found {selfCheckWarnings.length} issue(s)</div>
          </div>
          {selfCheckWarnings.map((w, i) => (
            <div key={i} className="warning">
              <Link href={`/count/${w.stage === "sheet2" ? "closing" : w.stage}`}>
                [{STAGE_LABELS[w.stage] ?? w.stage}]
              </Link>{" "}
              {w.message}
            </div>
          ))}
        </div>
      )}
      {selfCheckRan && selfCheckWarnings.length === 0 && (
        <div className="check">✓ Self check passed — no issues found.</div>
      )}
      {!selfCheckRan && (
        <div className="check">Run Self Check to validate all stage calculations.</div>
      )}

      <button className="submit-btn" onClick={() => exportSheet2(record, items)}>
        Submit for Approval
      </button>
    </>
  );
}
