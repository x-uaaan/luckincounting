import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const filePath = join(__dirname, "../src/data/seedItems.ts");
let src = readFileSync(filePath, "utf8");

// 1. Add front_sort_order: null to base object (after closing_sort_order: null)
src = src.replace(
  "  closing_sort_order: null,\n  unit: null,",
  "  closing_sort_order: null,\n  front_sort_order: null,\n  unit: null,"
);

// 2. Rename 16oz Hot Lid → White Lid
src = src.replace(
  'name: "16oz Hot Lid (pcs)"',
  'name: "White Lid (pcs)"'
);

// 3. Syrup bottle items: unit "ml" → "bottle"
//    lime_concentrate, original_syrup, sakura_syrup, vanilla_syrup, caramel_syrup
const syrupBottleIds = ["lime_concentrate", "original_syrup", "sakura_syrup", "vanilla_syrup", "caramel_syrup"];
for (const id of syrupBottleIds) {
  // Match the unit line within 8 lines after the id line
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx === -1) { console.warn(`id not found: ${id}`); continue; }
  // Find the unit: "ml" within the next 300 chars
  const chunk = src.slice(idIdx, idIdx + 400);
  const newChunk = chunk.replace('unit: "ml"', 'unit: "bottle"');
  src = src.slice(0, idIdx) + newChunk + src.slice(idIdx + 400);
}

// 4. Pistachio sauce: unit "ml" → "bag"
{
  const idIdx = src.indexOf('id: "pistachio_sauce"');
  if (idIdx !== -1) {
    const chunk = src.slice(idIdx, idIdx + 400);
    src = src.slice(0, idIdx) + chunk.replace('unit: "ml"', 'unit: "bag"') + src.slice(idIdx + 400);
  }
}

// 5. Blue Velvet Base: add per_box_pcs: 20 (after bag_size_g: 500)
src = src.replace(
  /( {4}id: "blue_velvet_base"[\s\S]*?bag_size_g: 500,)/,
  "$1\n    per_box_pcs: 20,"
);

// 6. Remove coconut_keychain block entirely
//    Find from the opening { ...base, to the closing },
const keychainStart = src.indexOf('    id: "coconut_keychain"');
if (keychainStart !== -1) {
  // Go back to find the opening {
  const blockStart = src.lastIndexOf("  {\n", keychainStart);
  // Find the closing },
  const blockEnd = src.indexOf("  },\n", keychainStart) + "  },\n".length;
  src = src.slice(0, blockStart) + src.slice(blockEnd);
}

// 7. Add front_sort_order to Front items (after final_sort_order line for each)
const frontSortOrders = {
  ice_cup_16oz: 10,
  hot_cup_16oz: 20,
  dome_lid: 30,
  flat_lid_16oz: 40,
  hot_lid_16oz: 50,
  single_cup_paper_bag: 60,
  double_cup_paper_bag: 70,
  common_cup_holder: 80,
  cup_sleeve: 90,
};

for (const [id, fso] of Object.entries(frontSortOrders)) {
  const idIdx = src.indexOf(`id: "${id}"`);
  if (idIdx === -1) { console.warn(`id not found: ${id}`); continue; }
  // Find closing_sort_order line for this item (within next 300 chars)
  const chunk = src.slice(idIdx, idIdx + 350);
  const newChunk = chunk.replace(
    /(    closing_sort_order: \d+,)/,
    `$1\n    front_sort_order: ${fso},`
  );
  src = src.slice(0, idIdx) + newChunk + src.slice(idIdx + 350);
}

writeFileSync(filePath, src, "utf8");
console.log("Done.");
