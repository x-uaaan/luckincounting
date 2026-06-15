"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import { calcWhippingCream } from "@/lib/calculations";
import type { ClosingEntry, WhippingCreamCalc } from "@/lib/types";

const looseLabel: Record<string, string> = {
  weight: "Loose (g/ml)",
  count: "Loose (pcs)",
  sleeves: "Open sleeves",
};

const FLAVOUR_PRESETS: Record<"vanilla" | "sakura", { name: string; pump_count: number; ml_per_pump: number }> = {
  vanilla: { name: "Vanilla", pump_count: 4, ml_per_pump: 5 },
  sakura: { name: "Sakura", pump_count: 10, ml_per_pump: 5 },
};

const MAX_CANISTERS = 5;
const UNOPENED_STACK_SIZE = 4;

type ClosingPartial = Pick<
  ClosingEntry,
  | "under_cabinet"
  | "non_coffee"
  | "loose_rows"
  | "loose_lines"
  | "loose_extra"
  | "loose"
  | "box_count"
  | "unopened_stacks"
  | "unopened_loose_pcs"
> & {
  whipping_cream?: WhippingCreamCalc | null;
};

export default function ClosingPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setClosing = useCountingStore((s) => s.setClosing);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);
  const canisterTare = containers.find((c) => c.id === "canister")?.tare_g ?? 0;

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
          unopened_stacks: entry?.unopened_stacks ?? null,
          unopened_loose_pcs: entry?.unopened_loose_pcs ?? null,
          loose: entry?.loose ?? null,
          box_count: entry?.box_count ?? null,
          whipping_cream: entry?.whipping_cream ?? null,
        };
        const update = (partial: Partial<ClosingPartial>) =>
          setClosing(item.id, { ...base, ...partial });

        const hasError = errorItemIds.has(item.id);
        const closingPerBox = item.closing_per_box_pcs ?? item.per_box_pcs;
        const invBagSize = item.inventory_bag_size_g ?? item.bag_size_g;

        const whippingCream = base.whipping_cream ?? {
          variants: [
            { id: "canister_1", ...FLAVOUR_PRESETS.vanilla, flavour: "vanilla" as const, empty_canister_weight: canisterTare, total_weight: null },
          ],
          total_whipping_cream: null,
        };
        const totalCream =
          whippingCream.total_whipping_cream ?? calcWhippingCream(whippingCream).total_whipping_cream;

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

              {item.closing_inventory_formula === "non_coffee" && (
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
                  <div className="check">
                    {invBagSize} − {base.non_coffee ?? 0} = {entry?.loose ?? 0} g
                  </div>
                </>
              )}

              {item.closing_inventory_formula === "whipping_cream" && (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Unopened</div>
                    </div>
                    <div className="field w44">
                      <div className="lbl">Stacks</div>
                      <input
                        inputMode="numeric"
                        value={base.unopened_stacks ?? ""}
                        onChange={(e) =>
                          update({ unopened_stacks: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="op">×</div>
                    <div className="field w44">
                      <div className="lbl">/stack</div>
                      <div className="const">{UNOPENED_STACK_SIZE}</div>
                    </div>
                    <div className="op">+</div>
                    <div className="field w44">
                      <div className="lbl">Loose pcs</div>
                      <input
                        inputMode="numeric"
                        value={base.unopened_loose_pcs ?? ""}
                        onChange={(e) =>
                          update({ unopened_loose_pcs: e.target.value === "" ? null : Number(e.target.value) })
                        }
                      />
                    </div>
                    <div className="op">=</div>
                    <div className="field w70">
                      <div className="lbl">Non-coffee</div>
                      <input className="auto" disabled value={entry?.non_coffee ?? 0} />
                    </div>
                  </div>
                  <div className="check">
                    {base.unopened_stacks ?? 0} × {UNOPENED_STACK_SIZE} + {base.unopened_loose_pcs ?? 0} = {entry?.non_coffee ?? 0} pcs
                  </div>

                  <div className="row">
                    <div className="w105">
                      <div className="name">Canister total</div>
                    </div>
                    <div className="total">{totalCream ?? 0} g</div>
                  </div>

                  {whippingCream.variants.map((v, idx) => {
                    const syrup = v.pump_count * v.ml_per_pump;
                    const cream = v.total_weight != null ? v.total_weight - syrup - v.empty_canister_weight : 0;
                    const tooLight = v.total_weight != null && cream < 0;
                    return (
                      <div key={v.id} className={`canister-block ${tooLight ? "warn" : ""}`}>
                        <div className="ref">
                          Syrup {syrup} · Container {v.empty_canister_weight}
                        </div>
                        <div className="row">
                          <div className="field w80">
                            <div className="lbl">Flavour</div>
                            <select
                              value={v.flavour}
                              onChange={(e) => {
                                const flavour = e.target.value as "vanilla" | "sakura";
                                const preset = FLAVOUR_PRESETS[flavour];
                                const variants = whippingCream.variants.map((vv, i) =>
                                  i === idx ? { ...vv, flavour, ...preset, empty_canister_weight: canisterTare } : vv
                                );
                                update({ whipping_cream: { variants, total_whipping_cream: null } });
                              }}
                            >
                              <option value="vanilla">Vanilla</option>
                              <option value="sakura">Sakura</option>
                            </select>
                          </div>
                          <div className="field w70">
                            <div className="lbl">Total wt</div>
                            <input
                              inputMode="numeric"
                              value={v.total_weight ?? ""}
                              onChange={(e) => {
                                const variants = whippingCream.variants.map((vv, i) =>
                                  i === idx
                                    ? { ...vv, total_weight: e.target.value === "" ? null : Number(e.target.value) }
                                    : vv
                                );
                                update({ whipping_cream: { variants, total_whipping_cream: null } });
                              }}
                            />
                          </div>
                          <div className="op">→</div>
                          <div className="field w70">
                            <div className="lbl">Cream</div>
                            <input className="auto" disabled value={v.total_weight != null ? cream : ""} />
                          </div>
                        </div>
                        <div className="check">
                          {v.total_weight ?? 0} − {syrup} − {v.empty_canister_weight} = {v.total_weight != null ? cream : 0} g
                        </div>
                        {tooLight && (
                          <div className="warning">
                            Total wt ({v.total_weight}) is less than syrup + container ({syrup + v.empty_canister_weight}) — cream weight is negative
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    className="add-btn"
                    disabled={whippingCream.variants.length >= MAX_CANISTERS}
                    onClick={() => {
                      const n = whippingCream.variants.length + 1;
                      const variants = [
                        ...whippingCream.variants,
                        { id: `canister_${n}`, ...FLAVOUR_PRESETS.vanilla, flavour: "vanilla" as const, empty_canister_weight: canisterTare, total_weight: null },
                      ];
                      update({ whipping_cream: { variants, total_whipping_cream: null } });
                    }}
                  >
                    + Add canister · {whippingCream.variants.length}/{MAX_CANISTERS}
                  </button>

                  <div className="check">
                    {entry?.non_coffee ?? 0} × {item.bag_size_g} + canister({totalCream ?? 0}) = {entry?.loose ?? 0} g
                  </div>
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
