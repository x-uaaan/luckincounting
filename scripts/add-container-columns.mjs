// Adds sort_order and tare_variants columns to the containers table via Supabase Management API.
// Run: node --env-file=.env.local scripts/add-container-columns.mjs

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const ref = SUPABASE_URL.match(/https:\/\/([^.]+)\./)?.[1];
if (!ref) { console.error("Could not parse project ref from URL:", SUPABASE_URL); process.exit(1); }

const sql = `
ALTER TABLE containers ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;
ALTER TABLE containers ADD COLUMN IF NOT EXISTS tare_variants jsonb DEFAULT NULL;
`;

console.log(`Project: ${ref}`);
console.log("Running SQL...");

const { default: https } = await import("https");
const body = JSON.stringify({ query: sql });

const options = {
  hostname: "api.supabase.com",
  path: `/v1/projects/${ref}/database/query`,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${SERVICE_KEY}`,
    "Content-Length": Buffer.byteLength(body),
  },
};

const req = https.request(options, (res) => {
  let data = "";
  res.on("data", (chunk) => data += chunk);
  res.on("end", async () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log("✓ Columns added (or already exist)");
      // Now seed sort_order values
      const { default: fetch2 } = await import("node-fetch").catch(() => ({ default: null }));
      console.log("\nNow seeding sort_order values...");
      console.log("Run: node --env-file=.env.local scripts/migrate-containers.mjs");
    } else {
      console.error(`HTTP ${res.statusCode}: ${data}`);
      console.log("\nFallback: run this SQL manually in Supabase dashboard → SQL editor:");
      console.log(sql);
    }
  });
});

req.on("error", (e) => {
  console.error("Request error:", e.message);
  console.log("\nRun this SQL manually in Supabase dashboard → SQL editor:");
  console.log(sql);
});

req.write(body);
req.end();
