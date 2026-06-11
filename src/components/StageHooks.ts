"use client";

import { useEffect } from "react";
import { useCountingStore } from "@/store/useCountingStore";

// Loads (or creates a draft for) the given date once per mount.
export function useLoadDate(date: string) {
  const loadDate = useCountingStore((s) => s.loadDate);
  const currentDate = useCountingStore((s) => s.date);

  useEffect(() => {
    if (currentDate !== date) loadDate(date);
  }, [date, currentDate, loadDate]);
}
