"use client";

import { useEffect } from "react";
import { useCountingStore } from "@/store/useCountingStore";
import { todayYYMMDD } from "@/lib/date";

// Loads (or creates a draft for) today's date once per mount.
export function useLoadDate() {
  const loadDate = useCountingStore((s) => s.loadDate);
  const currentDate = useCountingStore((s) => s.date);
  const date = todayYYMMDD();

  useEffect(() => {
    if (currentDate !== date) loadDate(date);
  }, [date, currentDate, loadDate]);
}
