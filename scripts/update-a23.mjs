import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const f = join(__dirname, "../src/data/seedItems.ts");
let s = readFileSync(f, "utf8");

// ── helper: replace within an item's block (400 chars after id) ──────────────
function patchItem(id, fn) {
  const idx = s.indexOf(`id: "${id}"`);
  if (idx === -1) { console.warn("not found:", id); return; }
  const before = s.slice(0, idx);
  const chunk  = s.slice(idx, idx + 600);
  const after  = s.slice(idx + 600);
  s = before + fn(chunk) + after;
}

// ── helper: remove an entire item block ──────────────────────────────────────
function removeItem(id) {
  const idIdx = s.indexOf(`id: "${id}"`);
  if (idIdx === -1) return;
  const blockStart = s.lastIndexOf("  {\n", idIdx);
  const blockEnd   = s.indexOf("  },\n", idIdx) + "  },\n".length;
  s = s.slice(0, blockStart) + s.slice(blockEnd);
}

// ── 1. Add missing per_bag_pcs / per_box_pcs ─────────────────────────────────
// dome_lid: per_bag_pcs: 100
patchItem("dome_lid", c => c.replace(
  "    per_box_pcs: 1000,",
  "    per_bag_pcs: 100,\n    per_box_pcs: 1000,"
));
// hot_lid_16oz (White Lid): per_bag_pcs: 50
patchItem("hot_lid_16oz", c => c.replace(
  "    per_box_pcs: 1000,",
  "    per_bag_pcs: 50,\n    per_box_pcs: 1000,"
));
// hot_cup_16oz: per_bag_pcs: 50
patchItem("hot_cup_16oz", c => c.replace(
  "    per_box_pcs: 1000,",
  "    per_bag_pcs: 50,\n    per_box_pcs: 1000,"
));
// double_wall_cup_20oz: per_box_pcs: 20
patchItem("double_wall_cup_20oz", c => c.replace(
  "    per_bag_pcs: 20,",
  "    per_bag_pcs: 20,\n    per_box_pcs: 20,"
));
// soe_hot_cup_12oz: per_box_pcs: 25
patchItem("soe_hot_cup_12oz", c => c.replace(
  "    per_bag_pcs: 25,",
  "    per_bag_pcs: 25,\n    per_box_pcs: 25,"
));
// soe_ice_cup_12oz: per_box_pcs: 50
patchItem("soe_ice_cup_12oz", c => c.replace(
  "    per_bag_pcs: 50,",
  "    per_bag_pcs: 50,\n    per_box_pcs: 50,"
));

// ── 2. Remove all coconut items ───────────────────────────────────────────────
for (const id of [
  "coconut", "coconut_c", "coconut_refreshing", "coconut_cream", "coconut_jelly",
  "coconut_plushie", "frozen_coconut",
  "coconut_cream_loss", "coconut_cheese_cap", "frozen_coconut_juice",
]) removeItem(id);

// sea_salt_cheese: remove coconut_cheese_cap from loss_components
s = s.replace(
  /loss_components:\s*\[\s*\{[^}]+source_item_id:\s*"cheese_cap"[^}]+\},\s*\{[^}]+source_item_id:\s*"coconut_cheese_cap"[^}]+\},?\s*\]/,
  'loss_components: [{ source_item_id: "cheese_cap", rate: 2 / 15 }]'
);
s = s.replace(
  /notes:\s*"Sum of SeaSalt Cheese share from Cheese Cap \(2\/15\) and Coconut Cheese Cap \(0\.038\)"[,]?/,
  'notes: "SeaSalt Cheese share from Cheese Cap (2/15)",'
);

// ── 3. Frozen closing: weight → count, remove box row ────────────────────────
for (const id of ["frozen_mix_grape", "strawberry", "frozen_orange_pulp"]) {
  patchItem(id, c =>
    c.replace('closing_per_box_pcs: 1,\n', '')
     .replace('closing_input_type: "weight"', 'closing_input_type: "count"')
     .replace(/\n\s+closing_box_row: true,/, '')  // remove if explicit true
  );
}

// ── 4. Closing sort order: packaging reorder + coffee beans to end ────────────
const newCSO = {
  flat_lid_16oz:       380,
  dome_lid:            390,
  drinking_lid:        400,
  hot_lid_16oz:        410,
  soe_hot_lid_12oz:    420,
  d_drinking_lid_12oz: 430,
  cup_sleeve:          440,
  common_cup_holder:   450,
  double_cup_paper_bag:460,
  single_cup_paper_bag:470,
  ice_cup_16oz:        480,
  hot_cup_16oz:        490,
  soe_ice_cup_12oz:    500,
  soe_hot_cup_12oz:    510,
  double_wall_cup_20oz:520,
  ice_cup_24oz:        530,
  italian_bean:        540,
  yirgacheffe_bean:    550,
};
for (const [id, val] of Object.entries(newCSO)) {
  const idx = s.indexOf(`id: "${id}"`);
  if (idx === -1) continue;
  const chunk = s.slice(idx, idx + 300);
  const newChunk = chunk.replace(
    /(    closing_sort_order:\s*)\d+(,)/,
    `$1${val}$2`
  );
  s = s.slice(0, idx) + newChunk + s.slice(idx + 300);
}

writeFileSync(f, s, "utf8");
console.log("Done.");
