// Data access for items/containers — Supabase-first with graceful fallback.
// See appflow.md §A.9 (Admin Items/Containers CRUD data flow).
import type { Item, Container } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function fetchItems(): Promise<Item[] | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase.from("items").select("*").order("sort_order");
  if (error || !data) return null;
  return data as unknown as Item[];
}

export async function fetchContainers(): Promise<Container[] | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  // Try ordering by sort_order; fall back to name if column doesn't exist yet
  let { data, error } = await supabase.from("containers").select("*").order("sort_order").order("name");
  if (error?.code === "42703") {
    // sort_order column not migrated yet — fall back to name order
    ({ data, error } = await supabase.from("containers").select("*").order("name"));
  }
  if (error || !data) return null;
  return (data as unknown as Container[]).map((c, i): Container => ({
    id: c.id,
    name: c.name,
    tare_g: c.tare_g,
    sort_order: (c as unknown as Record<string,unknown>).sort_order != null ? (c as unknown as Record<string,unknown>).sort_order as number : (i + 1) * 10,
    tare_variants: (c as unknown as Record<string,unknown>).tare_variants as Container["tare_variants"] ?? null,
  }));
}

export async function upsertItem(item: Item): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  // front_sort_order column not yet added to DB schema — strip to avoid PGRST204
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { front_sort_order: _fso, ...dbItem } = item;
  await supabase.from("items").upsert(dbItem, { onConflict: "id" });
}

export async function deleteItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("items").delete().eq("id", id);
}

export async function upsertContainer(container: Container): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  // Try full upsert; if new columns don't exist yet, fall back to base fields only
  const { error } = await supabase.from("containers").upsert(container);
  if (error?.code === "PGRST204") {
    await supabase.from("containers").upsert({ id: container.id, name: container.name, tare_g: container.tare_g });
  }
}

export async function deleteContainer(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("containers").delete().eq("id", id);
}
