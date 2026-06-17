"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import NumericInput from "@/components/NumericInput";

export default function FrontPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setFront = useCountingStore((s) => s.setFront);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);

  const items = allItems
    .filter((i) => i.appears_in.includes("front"))
    .sort((a, b) => (a.front_sort_order ?? a.sort_order) - (b.front_sort_order ?? b.sort_order));

  if (!record) return null;

  const errorItemIds = new Set(
    selfCheckWarnings.filter((w) => w.stage === "front").map((w) => w.itemId)
  );

  let currentCategory = "";

  return (
    <>
      {items.map((item) => {
        const entry = record.front[item.id];
        const showCategory = item.category !== currentCategory;
        currentCategory = item.category;
        const perBox = item.front_per_box_pcs ?? item.per_box_pcs;

        return (
          <div key={item.id}>
            {showCategory && <div className="category-label">{item.category}</div>}
            <div className={`card ${errorItemIds.has(item.id) || (entry?.total != null && entry.total < 0) ? "warn" : ""}`}>
              <div className="card-head">
                <div>
                  <div className="title">{item.name}</div>
                  <div className="subtitle">
                    {item.category} · {item.unit ?? ""}
                  </div>
                </div>
                <div className="total">
                  {entry?.total ?? 0} {item.unit}
                </div>
              </div>

              <div className="row">
                <div className="w105">
                  <div className="name">Ctn</div>
                </div>
                <div className="field w44">
                  <div className="lbl">Boxes</div>
                  <NumericInput
                    value={entry?.box_count ?? null}
                    onChange={(v) => setFront(item.id, { box_count: v })}
                  />
                </div>
                <div className="op">×</div>
                <div className="field w44">
                  <div className="lbl">/box</div>
                  <div className="const">{perBox ?? "–"}</div>
                </div>
                <div className="op">=</div>
                <div className="field w70">
                  <div className="lbl">Sum</div>
                  <input className="auto" disabled value={entry?.total ?? ""} />
                </div>
              </div>

              <div className="check">
                {entry?.box_count ?? 0} × {perBox ?? 0} = {entry?.total ?? 0} {item.unit}
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
