import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { seedItems } from "@/data/seedItems";
import { CONTAINERS } from "@/data/containers";

const DELETED_IDS = ["coconut_keychain", "coconut"];

// Columns that exist in the current DB schema
const DB_COLUMNS = new Set([
  "id","name","category","sort_order","final_sort_order","closing_sort_order",
  "appears_in","unit","per_bag_pcs","back_loose_formula","per_box_pcs",
  "front_per_box_pcs","closing_per_box_pcs","bag_size_g","inventory_bag_size_g",
  "loss_formula","loss_rate","loss_components","loss_role","default_container_id",
  "closing_inventory_formula","closing_container_input","unopened_stack_size",
  "closing_box_row","loose_grid","closing_input_type","notes",
]);

async function ensureColumn(projectRef: string, serviceKey: string) {
  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({
        query: "ALTER TABLE items ADD COLUMN IF NOT EXISTS front_sort_order integer;",
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return NextResponse.json({ error: "Missing Supabase env vars" }, { status: 500 });
  }

  const projectRef = url.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? "";
  const supabase = createClient(url, key);

  // Try to add front_sort_order column if missing
  const altered = await ensureColumn(projectRef, key);

  // Strip unknown columns from items before upsert
  const strippedItems = seedItems.map((item) =>
    Object.fromEntries(
      Object.entries(item as unknown as Record<string, unknown>).filter(([k]) => DB_COLUMNS.has(k))
    )
  );

  const { error: itemsErr } = await supabase.from("items").upsert(strippedItems);
  if (itemsErr) {
    return NextResponse.json({ error: `items upsert failed: ${itemsErr.message}` }, { status: 500 });
  }

  for (const id of DELETED_IDS) {
    await supabase.from("items").delete().eq("id", id);
  }

  const { error: containersErr } = await supabase.from("containers").upsert(
    CONTAINERS as unknown as Record<string, unknown>[]
  );
  if (containersErr) {
    return NextResponse.json({ error: `containers upsert failed: ${containersErr.message}` }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    items: seedItems.length,
    containers: CONTAINERS.length,
    front_sort_order_column_added: altered,
  });
}
