export type ActivityEntry = {
  at: string; // ISO timestamp
  action: "add" | "delete" | "approve" | "reject";
  kind: "item" | "container" | "loss_rate" | "record";
  label: string; // human-readable target name/date
  id?: string;   // entity ID for cancel operations
};

const KEY = "luckin_activity";
const MAX = 50;

export function logActivity(entry: Omit<ActivityEntry, "at">): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const prev: ActivityEntry[] = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    const next = [{ ...entry, at: new Date().toISOString() }, ...prev].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function getActivityLog(): ActivityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
  } catch {
    return [];
  }
}

export function removeActivityEntry(at: string): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(KEY);
    const prev: ActivityEntry[] = raw ? (JSON.parse(raw) as ActivityEntry[]) : [];
    localStorage.setItem(KEY, JSON.stringify(prev.filter((e) => e.at !== at)));
  } catch {
    // ignore
  }
}
