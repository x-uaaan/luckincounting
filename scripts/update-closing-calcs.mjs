// One-time migration:
//   - UHT Milk: bag_size_g = null (removes loose row from stack_box formula)
//   - All Packaging items: closing_box_row = true (adds bag calc row)
// Run: node --env-file=.env.local scripts/update-closing-calcs.mjs

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
  Prefer: "resolution=merge-duplicates",
};

async function patch(id, fields) {
  const res = await fetch(`${URL}/rest/v1/items?id=eq.${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PATCH items id=${id} → ${res.status}: ${text}`);
  }
  console.log(`✓ ${id}`, fields);
}

const PACKAGING_IDS = [
  "drinking_lid",
  "ice_cup_24oz",
  "double_wall_cup_20oz",
  "common_cup_holder",
  "soe_hot_cup_12oz",
  "soe_ice_cup_12oz",
  "soe_hot_lid_12oz",
  "d_drinking_lid_12oz",
  "cup_sleeve",
  "flat_lid_16oz",
  "dome_lid",
  "hot_lid_16oz",
  "hot_cup_16oz",
  "ice_cup_16oz",
  "double_cup_paper_bag",
  "single_cup_paper_bag",
];

(async () => {
  // UHT Milk: remove loose calc by clearing bag_size_g
  await patch("uht_milk", { bag_size_g: null });

  // Packaging items: enable bag calc row
  for (const id of PACKAGING_IDS) {
    await patch(id, { closing_box_row: true });
  }

  console.log("\nDone.");
})().catch((e) => { console.error(e); process.exit(1); });
