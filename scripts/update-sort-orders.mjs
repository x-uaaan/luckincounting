// One-shot script: update sort_order (Back sequence) and add closing_sort_order
// to every item in seedItems.ts. Run: node scripts/update-sort-orders.mjs
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "../src/data/seedItems.ts");
let src = readFileSync(filePath, "utf8");

// ── Back sort_order: new sequence for all Back items ──────────────────────────
// "Seasalt Syrup" skipped (item does not exist yet).
const backSortOrder = {
  drinking_lid:            10,
  ice_cup_24oz:            20,
  double_wall_cup_20oz:    30,
  common_cup_holder:       40,
  soe_hot_cup_12oz:        50,
  soe_ice_cup_12oz:        60,
  soe_hot_lid_12oz:        70,
  d_drinking_lid_12oz:     80,
  cup_sleeve:              90,
  flat_lid_16oz:           100,
  dome_lid:                110,
  hot_lid_16oz:            120,
  hot_cup_16oz:            130,
  ice_cup_16oz:            140,
  double_cup_paper_bag:    150,
  single_cup_paper_bag:    160,
  soda_water:              170,
  lime_concentrate:        180,
  original_syrup:          190,
  sakura_syrup:            200,
  vanilla_syrup:           210,
  caramel_syrup:           220,
  pistachio_sauce:         230,
  sea_salt_cheese:         240,
  blue_velvet_base:        250,
  pandan:                  260,
  ceylon_black_tea:        270,
  jasmine_tea:             280,
  cocoa_flavoured:         290,
  matcha_flavoured:        300,
  matcha_1000:             310,
  original_smoothie:       320,
  italian_bean:            330,
  yirgacheffe_bean:        340,
  cream_charger:           350,
  hanjuku:                 360,
  frozen_mix_grape:        370,
  strawberry:              380,
  frozen_orange_pulp:      390,
  frozen_coconut:          400,
  uht_milk:                410,
  coconut:                 420,
  coconut_c:               430,
  coconut_refreshing:      440,
  coconut_cream:           450,
  velvet_base:             460,
  milky_bev:               470,
  butter_flavour:          480,
  oat_milk:                490,
  coconut_jelly:           500,
  coconut_keychain:        510,
  coconut_plushie:         520,
};

// ── Closing sort_order: different sequence ────────────────────────────────────
// Coconut C and Coconut Refreshing not listed by user; placed after Coconut
// matching their Back relative order. "Seasalt Syrup" skipped (no matching item).
const closingSortOrder = {
  coconut_keychain:        10,
  coconut_plushie:         20,
  pistachio_sauce:         30,
  lime_concentrate:        40,
  original_syrup:          50,
  vanilla_syrup:           60,
  sakura_syrup:            70,
  caramel_syrup:           80,
  velvet_base:             90,
  milky_bev:               100,
  butter_flavour:          110,
  uht_milk:                120,
  coconut:                 130,
  coconut_c:               140,   // inserted after Coconut
  coconut_refreshing:      150,   // inserted after Coconut C
  oat_milk:                160,
  coconut_jelly:           170,
  coconut_cream:           180,
  strawberry:              190,
  frozen_mix_grape:        200,
  frozen_orange_pulp:      210,
  frozen_coconut:          220,
  sea_salt_cheese:         230,
  blue_velvet_base:        240,
  pandan:                  250,
  jasmine_tea:             260,
  ceylon_black_tea:        270,
  cocoa_flavoured:         280,
  matcha_flavoured:        290,
  matcha_1000:             300,
  original_smoothie:       310,
  soda_water:              320,
  cream_charger:           330,
  italian_bean:            340,
  yirgacheffe_bean:        350,
  whipping_cream:          360,
  hanjuku:                 370,
  flat_lid_16oz:           380,
  dome_lid:                390,
  drinking_lid:            400,
  hot_lid_16oz:            410,
  soe_hot_lid_12oz:        420,
  d_drinking_lid_12oz:     430,
  ice_cup_16oz:            440,
  hot_cup_16oz:            450,
  soe_ice_cup_12oz:        460,
  soe_hot_cup_12oz:        470,
  double_wall_cup_20oz:    480,
  ice_cup_24oz:            490,
  cup_sleeve:              500,
  common_cup_holder:       510,
  double_cup_paper_bag:    520,
  single_cup_paper_bag:    530,
};

// ── Transform line by line ────────────────────────────────────────────────────
const lines = src.split("\n");
const out = [];
let currentId = null;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  // Track current item id
  const idMatch = line.match(/^\s+id:\s+"([^"]+)"/);
  if (idMatch) currentId = idMatch[1];

  // In base object, add closing_sort_order: null after final_sort_order: null
  // (base object has final_sort_order: null — insert once, detect via context)
  // We track when we're inside `const base` to handle this safely.
  if (line.match(/^\s+final_sort_order:\s+null,/) && currentId === null) {
    out.push(line);
    out.push("  closing_sort_order: null,");
    continue;
  }

  // For regular items: update sort_order if in map
  const soMatch = line.match(/^(\s+sort_order:\s+)(\d+)(,)$/);
  if (soMatch && currentId && backSortOrder[currentId] !== undefined) {
    out.push(`${soMatch[1]}${backSortOrder[currentId]}${soMatch[3]}`);
    continue;
  }

  // After final_sort_order line for items, inject closing_sort_order
  const fsoMatch = line.match(/^(\s+final_sort_order:\s+)(.+)(,)$/);
  if (fsoMatch && currentId && closingSortOrder[currentId] !== undefined) {
    out.push(line);
    out.push(`  closing_sort_order: ${closingSortOrder[currentId]},`);
    continue;
  }

  out.push(line);
}

writeFileSync(filePath, out.join("\n"), "utf8");
console.log("Done. Updated sort_order and added closing_sort_order.");
