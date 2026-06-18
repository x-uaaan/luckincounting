"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCountingStore } from "@/store/useCountingStore";
import { todayYYMMDD } from "@/lib/date";

export default function HomePage() {
  const router = useRouter();
  const startFresh = useCountingStore((s) => s.startFresh);
  const startWithLatest = useCountingStore((s) => s.startWithLatest);
  const [loading, setLoading] = useState(false);

  function handleFresh() {
    startFresh(todayYYMMDD());
    router.push("/count/back");
  }

  async function handleLatest() {
    setLoading(true);
    await startWithLatest(todayYYMMDD());
    setLoading(false);
    router.push("/count/back");
  }

  return (
    <div className="content">
      <header className="home-header">
        <h1>Luckin Counting</h1>
        <p>Daily inventory counting</p>
      </header>

      <button className="home-link primary" onClick={handleFresh}>
        Start counting
      </button>

      <button className="home-link secondary" onClick={handleLatest} disabled={loading}>
        {loading ? "Loading…" : "Start counting with latest data"}
      </button>

      <Link href="/admin" className="home-link secondary">
        Admin
      </Link>
    </div>
  );
}
