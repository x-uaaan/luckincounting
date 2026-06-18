// Daily record persistence — Supabase-first, no localStorage fallback here
// (useCountingStore owns the localStorage layer).
import type { DailyRecord } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/itemsRepo";

export async function fetchRecord(date: string): Promise<DailyRecord | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_records")
    .select("*")
    .eq("date", date)
    .single();
  if (error || !data) return null;
  return data as unknown as DailyRecord;
}

export async function fetchAllRecords(): Promise<DailyRecord[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = createClient();
  const { data, error } = await supabase
    .from("daily_records")
    .select("*")
    .order("date", { ascending: false });
  if (error || !data) return [];
  return data as unknown as DailyRecord[];
}

export async function upsertRecord(record: DailyRecord): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("daily_records").upsert(record, { onConflict: "date" });
}

export async function patchRecord(date: string, partial: Partial<DailyRecord>): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const supabase = createClient();
  await supabase.from("daily_records").update(partial).eq("date", date);
}
