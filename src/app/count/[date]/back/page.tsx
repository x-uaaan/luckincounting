"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { seedItems } from "@/data/seedItems";

export default function BackPage({ params }: { params: { date: string } }) {
  useLoadDate(params.date);

  const record = useCountingStore((s) => s.record);
  const setBack = useCountingStore((s) => s.setBack);

  const items = seedItems
    .filter((i) => i.appears_in.includes("back"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  let currentCategory = "";

  return (
    <>
      {items.map((item) => {
        const entry = record.back[item.id];
        const showCategory = item.category !== currentCategory;
        currentCategory = item.category;

        const hasBagFactor = item.per_bag_pcs != null;
        const hasBoxFactor = item.per_box_pcs != null;

        const bagSum = entry?.bag_sum ?? null;
        const boxSum = entry?.box_sum ?? null;
        const checkParts: string[] = [];
        if (bagSum != null) checkParts.push(String(bagSum));
        if (boxSum != null) checkParts.push(String(boxSum));

        return (
          <div key={item.id}>
            {showCategory && <div className="category-label">{item.category}</div>}
            <div className="card">
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

              {hasBagFactor ? (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Bags</div>
                    <input
                      inputMode="numeric"
                      value={entry?.open_bags ?? ""}
                      onChange={(e) =>
                        setBack(item.id, {
                          open_bags: e.target.value === "" ? null : Number(e.target.value),
                          box_count: entry?.box_count ?? null,
                        })
                      }
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">/bag</div>
                    <div className="const">{item.per_bag_pcs}</div>
                  </div>
                  <div className="op">=</div>
                  <div className="field w70">
                    <div className="lbl">Sum</div>
                    <input className="auto" disabled value={bagSum ?? ""} />
                  </div>
                </div>
              ) : (
                <div className="row">
                  <div className="w105">
                    <div className="name">Count</div>
                  </div>
                  <div className="field w70">
                    <div className="lbl">Units</div>
                    <input
                      inputMode="numeric"
                      value={entry?.open_bags ?? ""}
                      onChange={(e) =>
                        setBack(item.id, {
                          open_bags: e.target.value === "" ? null : Number(e.target.value),
                          box_count: entry?.box_count ?? null,
                        })
                      }
                    />
                  </div>
                </div>
              )}

              {hasBoxFactor && (
                <div className="row">
                  <div className="w105">
                    <div className="name">Ctn</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Boxes</div>
                    <input
                      inputMode="numeric"
                      value={entry?.box_count ?? ""}
                      onChange={(e) =>
                        setBack(item.id, {
                          open_bags: entry?.open_bags ?? null,
                          box_count: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">/box</div>
                    <div className="const">{item.per_box_pcs}</div>
                  </div>
                  <div className="op">=</div>
                  <div className="field w70">
                    <div className="lbl">Sum</div>
                    <input className="auto" disabled value={boxSum ?? ""} />
                  </div>
                </div>
              )}

              {checkParts.length > 0 && (
                <div className="check">
                  {checkParts.join(" + ")} = {entry?.total ?? 0} {item.unit}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
