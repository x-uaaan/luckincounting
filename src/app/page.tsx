"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";
import { todayYYMMDD } from "@/lib/date";

function hasCountingData(record: ReturnType<typeof useCountingStore.getState>["record"]): boolean {
  if (!record) return false;
  return (
    Object.values(record.back ?? {}).some((v) => (v as {total?: unknown}).total != null) ||
    Object.values(record.front ?? {}).some((v) => (v as {total?: unknown}).total != null) ||
    Object.values(record.closing ?? {}).some((v) => (v as {total?: unknown}).total != null) ||
    Object.values(record.material_loss ?? {}).some((v) => v.result != null)
  );
}

export default function HomePage() {
  const router = useRouter();
  const record = useCountingStore((s) => s.record);
  const startFresh = useCountingStore((s) => s.startFresh);
  const startWithLatest = useCountingStore((s) => s.startWithLatest);
  const loaded = useItemsStore((s) => s.loaded);
  const [loading, setLoading] = useState(false);

  const inProgress = hasCountingData(record);

  function handleFresh() {
    if (inProgress && !window.confirm("Start fresh? All current inputs will be cleared.")) return;
    startFresh(todayYYMMDD());
    router.push("/count/back");
  }

  async function handleLatest() {
    if (inProgress && !window.confirm("Start with latest data? All current inputs will be replaced.")) return;
    setLoading(true);
    await startWithLatest(todayYYMMDD());
    setLoading(false);
    router.push("/count/back");
  }

  function handleContinue() {
    router.push("/count/back");
  }

  return (
    <div className="content">
      <header className="home-header">
        <h1>Luckin Counting</h1>
        <p>Daily inventory counting</p>
      </header>

      {inProgress ? (
        <>
          {/* Primary row — continue */}
          <div className="home-row primary-row">
            <button className="home-link primary" onClick={handleContinue}>
              Continue counting
            </button>
          </div>

          {/* Secondary row — destructive resets */}
          <div className="home-row secondary-row">
            <button className="home-link secondary" onClick={handleFresh}>
              Start fresh
            </button>
            <button className="home-link secondary" onClick={handleLatest} disabled={loading || !loaded}>
              {loading ? "Loading…" : "Latest data"}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Primary row — start */}
          <div className="home-row primary-row">
            <button className="home-link primary" onClick={handleFresh}>
              Start counting
            </button>
          </div>

          {/* Secondary row */}
          <div className="home-row secondary-row">
            <button className="home-link secondary" onClick={handleLatest} disabled={loading || !loaded}>
              {loading ? "Loading…" : "Start with latest data"}
            </button>
          </div>
        </>
      )}

      <Link href="/admin" className="home-link admin-link-btn">
        Admin
      </Link>
    </div>
  );
}
