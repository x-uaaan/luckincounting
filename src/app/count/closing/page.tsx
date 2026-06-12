"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import type { ClosingEntry } from "@/lib/types";

const looseLabel: Record<string, string> = {
  weight: "Loose (g/ml)",
  count: "Loose (pcs)",
  sleeves: "Open sleeves",
};

type ClosingPartial = Pick<
  ClosingEntry,
  "under_cabinet" | "non_coffee" | "loose_rows" | "loose_lines" | "loose_extra" | "loose" | "box_count"
>;

export default function ClosingPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setClosing = useCountingStore((s) => s.setClosing);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);

  const items = allItems
    .filter((i) => i.appears_in.includes("closing"))
    .sort((a, b) => a.sort_order - b.sort_order);

  if (!record) return null;

  const counted = items.filter((i) => record.closing[i.id]?.total != null).length;

  const errorItemIds = new Set(
    selfCheckWarnings
      .filter((w) => w.stage === "closing" || w.stage === "sheet2")
      .map((w) => w.itemId)
  );

  let currentCategory = "";

  return (
    <>
      <div className="summary">
        <div className="label">Items counted</div>
        <div className="value">
          {counted} / {items.length}
        </div>
      </div>

      {items.map((item) => {
        const entry = record.closing[item.id];
        const showCategory = item.category !== currentCategory;
        currentCategory = item.category;

        const base: ClosingPartial = {
          under_cabinet: entry?.under_cabinet ?? null,
          non_coffee: entry?.non_coffee ?? null,
          loose_rows: entry?.loose_rows ?? null,
          loose_lines: entry?.loose_lines ?? null,
          loose_extra: entry?.loose_extra ?? null,
          loose: entry?.loose ?? null,
          box_count: entry?.box_count ?? null,
        };
        const update = (partial: Partial<ClosingPartial>) =>
          setClosing(item.id, { ...base, ...partial });

        const isPandanWarning = item.id === "pandan" && entry?.total == null;
        const hasError = isPandanWarning || errorItemIds.has(item.id);
        const closingPerBox = item.closing_per_box_pcs ?? item.per_box_pcs;
        const invBagSize = item.inventory_bag_size_g ?? item.bag_size_g;

        const checkParts: string[] = [];
        if (entry?.loose_sum != null) checkParts.push(entry.loose_sum.toFixed(3));
        if (entry?.box_sum != null) checkParts.push(String(entry.box_sum));

        return (
          <div key={item.id}>
            {showCategory && <div className="category-label">{item.category}</div>}
            <div className={`card ${hasError ? "warn" : ""}`}>
              <div className="card-head">
                <div>
                  <div className="title">{item.name}</div>
                  <div className="subtitle">
                    {item.category} · {item.unit ?? ""}
                  </div>
                </div>
                <div className="total">
                  {entry?.total != null ? entry.total.toFixed(3) : 0} {item.unit}
                </div>
              </div>

              {isPandanWarning && (
                <div className="warning">⚠ Loss not measured — measure container before disposal (S-01)</div>
              )}

              {item.closing_inventory_formula === "under_cabinet" && (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Inventory</div>
                    </div>
                    <div className="field w70">
                      <div className="lbl">Under cabinet</div>
                      <input
                        inputMode="numeric"
                        value={base.under_cabinet ?? ""}
                        onChange={(e) =>
                          update({ under_cabinet: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="op">→</div>
                    <div className="field w70">
                      <div className="lbl">Loose (g)</div>
                      <input className="auto" disabled value={entry?.loose ?? ""} />
                    </div>
                  </div>
                  <div className="check">
                    {invBagSize} − {base.under_cabinet ?? 0} = {entry?.loose ?? 0} g
                  </div>
                </>
              )}

              {(item.closing_inventory_formula === "non_coffee" ||
                item.closing_inventory_formula === "whipping_cream") && (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Inventory</div>
                    </div>
                    <div className="field w70">
                      <div className="lbl">Non-coffee</div>
                      <input
                        inputMode="numeric"
                        value={base.non_coffee ?? ""}
                        onChange={(e) =>
                          update({ non_coffee: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="op">→</div>
                    <div className="field w70">
                      <div className="lbl">Loose (g)</div>
                      <input className="auto" disabled value={entry?.loose ?? ""} />
                    </div>
                  </div>
                  {item.closing_inventory_formula === "whipping_cream" ? (
                    <div className="check">
                      {invBagSize} − canister({record.material_loss["cream"]?.result ?? 0}) − {base.non_coffee ?? 0} −
                      50 = {entry?.loose ?? 0} g
                    </div>
                  ) : (
                    <div className="check">
                      {invBagSize} − {base.non_coffee ?? 0} = {entry?.loose ?? 0} g
                    </div>
                  )}
                </>
              )}

              {item.loose_grid && (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Rows</div>
                    <input
                      inputMode="numeric"
                      value={base.loose_rows ?? ""}
                      onChange={(e) =>
                        update({ loose_rows: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">Lines</div>
                    <input
                      inputMode="numeric"
                      value={base.loose_lines ?? ""}
                      onChange={(e) =>
                        update({ loose_lines: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="op">+</div>
                  <div className="field w44">
                    <div className="lbl">Loose</div>
                    <input
                      inputMode="numeric"
                      value={base.loose_extra ?? ""}
                      onChange={(e) =>
                        update({ loose_extra: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                  <div className="op">=</div>
                  <div className="field w60">
                    <div className="lbl">Loose total</div>
                    <input className="auto" disabled value={entry?.loose ?? ""} />
                  </div>
                </div>
              )}

              {!item.closing_inventory_formula && !item.loose_grid && (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w70">
                    <div className="lbl">{looseLabel[item.closing_input_type]}</div>
                    <input
                      inputMode="numeric"
                      value={base.loose ?? ""}
                      onChange={(e) => update({ loose: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="op">→</div>
                  <div className="field w70">
                    <div className="lbl">Loose sum</div>
                    <input
                      className="auto"
                      disabled
                      value={entry?.loose_sum != null ? entry.loose_sum.toFixed(3) : ""}
                    />
                  </div>
                </div>
              )}

              {closingPerBox != null && (
                <div className="row">
                  <div className="w105">
                    <div className="name">Ctn</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Boxes</div>
                    <input
                      inputMode="numeric"
                      value={base.box_count ?? ""}
                      onChange={(e) => update({ box_count: e.target.value === "" ? null : Number(e.target.value) })}
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">/box</div>
                    <div className="const">{closingPerBox}</div>
                  </div>
                  <div className="op">=</div>
                  <div className="field w70">
                    <div className="lbl">Sum</div>
                    <input className="auto" disabled value={entry?.box_sum ?? ""} />
                  </div>
                </div>
              )}

              {checkParts.length > 0 && (
                <div className="check">
                  {checkParts.join(" + ")} = {entry?.total != null ? entry.total.toFixed(3) : 0} {item.unit}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
