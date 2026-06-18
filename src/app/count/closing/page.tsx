"use client";

import { useLoadDate } from "@/components/StageHooks";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import { calcWhippingCream } from "@/lib/calculations";
import type { ClosingEntry, WhippingCreamCalc } from "@/lib/types";
import CategoryNav, { categoryAnchorId } from "@/components/CategoryNav";
import NumericInput from "@/components/NumericInput";
import ReorderButtons from "@/components/ReorderButtons";

function getLooseLabel(inputType: string, unit?: string | null): string {
  if (inputType === "weight") return "Loose (g/ml)";
  if (inputType === "sleeves") return "Open sleeves";
  // count — use item unit if meaningful
  if (unit && unit !== "pcs" && unit !== "g") return `Loose (${unit})`;
  return "Loose (pcs)";
}

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
  | "container_id"
  | "gross_weight"
> & {
  whipping_cream?: WhippingCreamCalc | null;
};

export default function ClosingPage() {
  useLoadDate();

  const record = useCountingStore((s) => s.record);
  const setClosing = useCountingStore((s) => s.setClosing);
  const selfCheckWarnings = useCountingStore((s) => s.selfCheckWarnings);
  const allItems = useItemsStore((s) => s.items);
  const reorderMode = useItemsStore((s) => s.reorderMode);
  const containers = useItemsStore((s) => s.containers);
  const canisterTare = containers.find((c) => c.id === "canister")?.tare_g ?? 0;

  const items = allItems
    .filter((i) => i.appears_in.includes("closing"))
    .sort((a, b) => (a.closing_sort_order ?? a.sort_order) - (b.closing_sort_order ?? b.sort_order));

  if (!record) return null;

  const counted = items.filter((i) => record.closing[i.id]?.total != null).length;

  const errorItemIds = new Set(
    selfCheckWarnings
      .filter((w) => w.stage === "closing" || w.stage === "sheet2")
      .map((w) => w.itemId)
  );

  let currentCategory = "";
  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <>
      <div className="summary">
        <div className="label">Items counted</div>
        <div className="value">
          {counted} / {items.length}
        </div>
      </div>

      <CategoryNav categories={categories} />

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
          container_id: entry?.container_id ?? null,
          gross_weight: entry?.gross_weight ?? null,
          loose: entry?.loose ?? null,
          box_count: entry?.box_count ?? null,
          whipping_cream: entry?.whipping_cream ?? null,
        };
        const update = (partial: Partial<ClosingPartial>) =>
          setClosing(item.id, { ...base, ...partial });

        const hasError = errorItemIds.has(item.id) || (entry?.total != null && entry.total < 0);
        const closingPerBox = item.closing_box_row
          ? item.closing_per_box_pcs ?? item.per_bag_pcs ?? item.per_box_pcs
          : null;
        const invBagSize = item.inventory_bag_size_g ?? item.bag_size_g;
        // (§A.9) Label the "Ctn" row by the unit the factor actually represents:
        // bottle/bag units (loose_grid items with an explicit closing_per_box_pcs,
        // identified by the "(bottle)"/"(bag)" suffix on the item name) or admin's
        // per_bag_pcs (Bag) — otherwise it's a true carton (Ctn).
        const ctnUnitLabel =
          item.unit === "bottle" || item.name.endsWith("(bottle)")
            ? "Bottle"
            : item.unit === "bag" || item.name.endsWith("(bag)")
            ? "Bag"
            : item.closing_per_box_pcs == null && item.per_bag_pcs != null
            ? "Bag"
            : "Ctn";

        const whippingCream = base.whipping_cream ?? {
          variants: [
            { id: "canister_1", ...FLAVOUR_PRESETS.vanilla, flavour: "vanilla" as const, empty_canister_weight: canisterTare, total_weight: null },
          ],
          total_whipping_cream: null,
        };
        const totalCream =
          whippingCream.total_whipping_cream ?? calcWhippingCream(whippingCream).total_whipping_cream;

        const checkParts: string[] = [];
        if (item.closing_inventory_formula === "stack_box" && entry?.non_coffee != null) {
          checkParts.push(String(entry.non_coffee));
        }
        if (entry?.loose_sum != null) checkParts.push(entry.loose_sum.toFixed(3));
        if (entry?.box_sum != null) checkParts.push(String(entry.box_sum));

        return (
          <div key={item.id}>
            {showCategory && (
              <div className="category-label" id={categoryAnchorId(item.category)}>
                {item.category}
              </div>
            )}
            <div className={`card ${reorderMode ? "card-reordering" : hasError ? "warn" : ""}`}>
              {reorderMode && <ReorderButtons item={item} items={items} sortField="closing_sort_order" />}
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
                      <NumericInput
                        value={base.under_cabinet ?? null}
                        onChange={(v) => update({ under_cabinet: v })}
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

              {item.closing_inventory_formula === "non_coffee" && !item.closing_container_input && (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Inventory</div>
                    </div>
                    <div className="field w70">
                      <div className="lbl">Non-coffee</div>
                      <NumericInput
                        value={base.non_coffee ?? null}
                        onChange={(v) => update({ non_coffee: v })}
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

              {(item.closing_inventory_formula === "non_coffee" ||
                item.closing_inventory_formula === "container_direct" ||
                item.closing_inventory_formula === "container_plus_loose") &&
                item.closing_container_input &&
                (() => {
                const selectedContainerId = base.container_id ?? item.default_container_id ?? "";
                const tare = selectedContainerId
                  ? containers.find((c) => c.id === selectedContainerId)?.tare_g ?? 0
                  : 0;
                return (
                  <>
                    {item.closing_inventory_formula === "container_plus_loose" && (
                      <div className="row">
                        <div className="w105">
                          <div className="name">Inventory</div>
                        </div>
                        <div className="field w70">
                          <div className="lbl">Loose ({item.unit})</div>
                          <NumericInput
                            value={base.loose_extra ?? null}
                            onChange={(v) => update({ loose_extra: v })}
                          />
                        </div>
                      </div>
                    )}
                    <div className="row">
                      <div className="w105">
                        <div className="name">
                          {item.closing_inventory_formula === "container_plus_loose" ? "" : "Inventory"}
                        </div>
                      </div>
                      <div className="field w105">
                        <div className="lbl">Container</div>
                        <select
                          value={selectedContainerId}
                          onChange={(e) => update({ container_id: e.target.value || null })}
                        >
                          {containers.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} ({c.tare_g})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field w70">
                        <div className="lbl">Gross wt</div>
                        <NumericInput
                          value={base.gross_weight ?? null}
                          onChange={(v) =>
                            update({
                              container_id: selectedContainerId || null,
                              gross_weight: v,
                            })
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
                      {item.closing_inventory_formula === "container_direct" ? (
                        <>
                          {base.gross_weight ?? 0} − {tare} = {entry?.loose ?? 0} g
                        </>
                      ) : item.closing_inventory_formula === "container_plus_loose" ? (
                        <>
                          {base.loose_extra ?? 0} + ({base.gross_weight ?? 0} − {tare}) / {item.bag_size_g} ={" "}
                          {entry?.loose_sum != null ? entry.loose_sum.toFixed(3) : 0} {item.unit}
                        </>
                      ) : (
                        <>
                          {invBagSize} − ({base.gross_weight ?? 0} − {tare}) = {entry?.loose ?? 0} g
                        </>
                      )}
                    </div>
                  </>
                );
              })()}

              {item.closing_inventory_formula === "whipping_cream" && (() => {
                const unopenedCount = (base.unopened_stacks ?? 0) * UNOPENED_STACK_SIZE + (base.unopened_loose_pcs ?? 0);
                const unopenedG = unopenedCount * (item.bag_size_g ?? 0);
                return (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Unopened</div>
                    </div>
                    <div className="field w44">
                      <div className="lbl">Stacks</div>
                      <NumericInput
                        value={base.unopened_stacks ?? null}
                        onChange={(v) => update({ unopened_stacks: v })}
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
                      <NumericInput
                        value={base.unopened_loose_pcs ?? null}
                        onChange={(v) => update({ unopened_loose_pcs: v })}
                      />
                    </div>
                    <div className="op">=</div>
                    <div className="field w44">
                      <div className="lbl">pcs</div>
                      <input className="auto" disabled value={unopenedCount} />
                    </div>
                  </div>

                  {whippingCream.variants.map((v, idx) => {
                    const flavourWeight = v.pump_count * v.ml_per_pump;
                    const cream = v.total_weight != null ? v.total_weight - flavourWeight - canisterTare : null;
                    const tooLight = cream != null && cream < 0;
                    return (
                      <div key={v.id} className={`canister-block ${tooLight ? "warn" : ""}`}>
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
                              <option value="vanilla">Vanilla (20)</option>
                              <option value="sakura">Sakura (50)</option>
                            </select>
                          </div>
                          <div className="field w70">
                            <div className="lbl">Gross wt (g)</div>
                            <NumericInput
                              value={v.total_weight ?? null}
                              onChange={(value) => {
                                const variants = whippingCream.variants.map((vv, i) =>
                                  i === idx ? { ...vv, total_weight: value } : vv
                                );
                                update({ whipping_cream: { variants, total_whipping_cream: null } });
                              }}
                            />
                          </div>
                          <div className="op">−</div>
                          <div className="field w44">
                            <div className="lbl">Flavour</div>
                            <div className="const">{flavourWeight}</div>
                          </div>
                          <div className="op">−</div>
                          <div className="field w44">
                            <div className="lbl">Canister</div>
                            <div className="const">{canisterTare}</div>
                          </div>
                          <div className="op">=</div>
                          <div className="field w70">
                            <div className="lbl">Cream (g)</div>
                            <input className="auto" disabled value={cream ?? ""} />
                          </div>
                        </div>
                        {tooLight && (
                          <div className="warning">
                            Cream weight is negative — check gross weight
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
                    Total canister cream: {totalCream ?? 0} g
                  </div>
                  <div className="check">
                    {totalCream ?? 0} + {unopenedCount} × {item.bag_size_g} ({unopenedG} g) = {entry?.loose ?? 0} g
                  </div>
                </>
                );
              })()}

              {item.closing_inventory_formula === "stack_box" && (
                <>
                  <div className="row">
                    <div className="w105">
                      <div className="name">Boxes</div>
                    </div>
                    <div className="field w44">
                      <div className="lbl">Stacks</div>
                      <NumericInput
                        value={base.unopened_stacks ?? null}
                        onChange={(v) => update({ unopened_stacks: v })}
                      />
                    </div>
                    <div className="op">×</div>
                    <div className="field w44">
                      <div className="lbl">/stack</div>
                      <div className="const">{item.unopened_stack_size}</div>
                    </div>
                    <div className="op">+</div>
                    <div className="field w44">
                      <div className="lbl">Extra</div>
                      <NumericInput
                        value={base.unopened_loose_pcs ?? null}
                        onChange={(v) => update({ unopened_loose_pcs: v })}
                      />
                    </div>
                    <div className="op">=</div>
                    <div className="field w70">
                      <div className="lbl">Boxes</div>
                      <input className="auto" disabled value={entry?.non_coffee ?? ""} />
                    </div>
                  </div>
                  {item.bag_size_g != null && (
                    <div className="row">
                      <div className="w105">
                        <div className="name">Loose</div>
                      </div>
                      <div className="field w70">
                        <div className="lbl">Loose (g)</div>
                        <NumericInput
                          value={base.loose ?? null}
                          onChange={(v) => update({ loose: v })}
                        />
                      </div>
                      <div className="op">/</div>
                      <div className="field w44">
                        <div className="lbl">/box</div>
                        <div className="const">{item.bag_size_g}</div>
                      </div>
                      <div className="op">=</div>
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
                </>
              )}

              {item.loose_grid && (
                <div className="row">
                  <div className="w105">
                    <div className="name">Loose</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">Rows</div>
                    <NumericInput
                      value={base.loose_rows ?? null}
                      onChange={(v) => update({ loose_rows: v })}
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">Lines</div>
                    <NumericInput
                      value={base.loose_lines ?? null}
                      onChange={(v) => update({ loose_lines: v })}
                    />
                  </div>
                  <div className="op">+</div>
                  <div className="field w44">
                    <div className="lbl">Loose</div>
                    <NumericInput
                      value={base.loose_extra ?? null}
                      onChange={(v) => update({ loose_extra: v })}
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
                    <div className="lbl">{getLooseLabel(item.closing_input_type, item.unit)}</div>
                    <NumericInput
                      value={base.loose ?? null}
                      onChange={(v) => update({ loose: v })}
                    />
                  </div>
                  {item.closing_input_type === "count" ? (
                    <>
                      <div className="op">=</div>
                      <div className="field w70">
                        <div className="lbl">{item.unit ?? "pcs"}</div>
                        <input className="auto" disabled value={base.loose ?? ""} />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="op">→</div>
                      <div className="field w70">
                        <div className="lbl">Loose sum</div>
                        <input
                          className="auto"
                          disabled
                          value={entry?.loose_sum != null ? entry.loose_sum.toFixed(3) : ""}
                        />
                      </div>
                    </>
                  )}
                </div>
              )}

              {closingPerBox != null && (
                <div className="row">
                  <div className="w105">
                    <div className="name">{ctnUnitLabel}</div>
                  </div>
                  <div className="field w44">
                    <div className="lbl">{ctnUnitLabel}s</div>
                    <NumericInput
                      value={base.box_count ?? null}
                      onChange={(v) => update({ box_count: v })}
                    />
                  </div>
                  <div className="op">×</div>
                  <div className="field w44">
                    <div className="lbl">/{ctnUnitLabel.toLowerCase()}</div>
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
