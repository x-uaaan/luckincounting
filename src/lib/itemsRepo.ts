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
  const { data, error } = await supabase.from("containers").select("*").order("name");
  if (error || !data) return null;
  return data as unknown as Container[];
}

export async function upsertItem(item: Item): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("items").upsert(item);
}

export async function deleteItem(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("items").delete().eq("id", id);
}

export async function upsertContainer(container: Container): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("containers").upsert(container);
}

export async function deleteContainer(id: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("containers").delete().eq("id", id);
}
