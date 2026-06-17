"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import CategoryNav, { categoryAnchorId } from "@/components/CategoryNav";
import NumericInput from "@/components/NumericInput";

export default function BackPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setBack = useCountingStore((s) => s.setBack);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);

  const items = allItems
    .filter((i) => i.appears_in.includes("back"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  const errorItemIds = new Set(
    selfCheckWarnings.filter((w) => w.stage === "back").map((w) => w.itemId)
  );

  let currentCategory = "";
  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <>
      <CategoryNav categories={categories} />
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
            {showCategory && (
              <div className="category-label" id={categoryAnchorId(item.category)}>
                {item.category}
              </div>
            )}
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

              {item.back_loose_formula === "hidden" ? null : item.back_loose_formula === "stack_box" ? (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Stacks</div>
                    <NumericInput
                      value={entry?.open_bags ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: v,
                          loose_extra: entry?.loose_extra ?? null,
                          box_count: entry?.box_count ?? null,
                        })
                      }
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">/stack</div>
                    <div className="const">{item.unopened_stack_size ?? 4}</div>
                  </div>
                  <div className="op">+</div>
                  <div className="field w44">
                    <div className="lbl">Loose</div>
                    <NumericInput
                      value={entry?.loose_extra ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: entry?.open_bags ?? null,
                          loose_extra: v,
                          box_count: entry?.box_count ?? null,
                        })
                      }
                    />
                  </div>
                  <div className="op">=</div>
                  <div className="field w70">
                    <div className="lbl">Sum</div>
                    <input className="auto" disabled value={bagSum ?? ""} />
                  </div>
                </div>
              ) : item.back_loose_formula === "bag_count" ? (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w70">
                    <div className="lbl">Bag</div>
                    <NumericInput
                      value={entry?.open_bags ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: v,
                          loose_extra: entry?.loose_extra ?? null,
                          box_count: entry?.box_count ?? null,
                        })
                      }
                    />
                  </div>
                </div>
              ) : hasBagFactor ? (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Bags</div>
                    <NumericInput
                      value={entry?.open_bags ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: v,
                          loose_extra: entry?.loose_extra ?? null,
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
                    <div className="name">{item.unit ? item.unit.charAt(0).toUpperCase() + item.unit.slice(1) : "Count"}</div>
                  </div>
                  <div className="field w70">
                    <div className="lbl">{item.unit ?? "units"}</div>
                    <NumericInput
                      value={entry?.open_bags ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: v,
                          loose_extra: entry?.loose_extra ?? null,
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
                    <NumericInput
                      value={entry?.box_count ?? null}
                      onChange={(v) =>
                        setBack(item.id, {
                          open_bags: entry?.open_bags ?? null,
                          loose_extra: entry?.loose_extra ?? null,
                          box_count: v,
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

              {item.back_loose_formula === "stack_box" && (
                <div className="check">
                  {entry?.open_bags ?? 0} × {item.unopened_stack_size ?? 4} + {entry?.loose_extra ?? 0} ={" "}
                  {bagSum ?? 0} {item.unit}
                </div>
              )}

              {item.back_loose_formula === "bag_count" && (
                <div className="check">
                  ({bagSum ?? 0} + {boxSum ?? 0}) × {item.bag_size_g ?? 1} = {entry?.total ?? 0} {item.unit}
                </div>
              )}

              {item.back_loose_formula !== "bag_count" && checkParts.length > 0 && (
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
