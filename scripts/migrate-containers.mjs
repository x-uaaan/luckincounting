// Migration: add sort_order + tare_variants columns to containers table
// and seed sort_order values for existing containers.
// Run: node --env-file=.env.local scripts/migrate-containers.mjs

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
};

async function sql(query) {
  const res = await fetch(`${URL}/rest/v1/rpc/exec_sql`, {
    method: "POST",
    headers,
    body: JSON.stringify({ query }),
  });
  if (!res.ok) {
    // Try alternative approach via direct SQL
    console.warn("rpc/exec_sql not available, using raw REST PATCH");
    return null;
  }
  return res.json();
}

async function patchContainer(id, fields) {
  const res = await fetch(`${URL}/rest/v1/containers?id=eq.${id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "resolution=merge-duplicates" },
    body: JSON.stringify(fields),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(`PATCH containers id=${id} → ${res.status}: ${text}`);
    return false;
  }
  console.log(`✓ ${id}`, fields);
  return true;
}

// Seed sort_order for known containers in the expected display sequence
const CONTAINER_ORDER = [
  { id: "pitcher",           sort_order: 10 },
  { id: "jug",               sort_order: 20 },
  { id: "powder_container",  sort_order: 30 },
  { id: "squeezer",          sort_order: 40 },
  { id: "canister",          sort_order: 50 },
  { id: "small_pitcher",     sort_order: 60 },
  { id: "coffee_tupperware", sort_order: 70 },
];

(async () => {
  console.log("Seeding sort_order for containers...");
  for (const { id, sort_order } of CONTAINER_ORDER) {
    await patchContainer(id, { sort_order });
  }
  console.log("\nDone. If sort_order column does not exist yet, run this SQL in Supabase dashboard:");
  console.log("  ALTER TABLE containers ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;");
  console.log("  ALTER TABLE containers ADD COLUMN IF NOT EXISTS tare_variants jsonb DEFAULT NULL;");
  console.log("Then re-run this script.");
})().catch((e) => { console.error(e); process.exit(1); });
