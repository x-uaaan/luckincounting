"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCountingStore } from "@/store/useCountingStore";
import { useItemsStore } from "@/store/useItemsStore";

const STAGES = [
  { slug: "back", label: "Back" },
  { slug: "front", label: "Front" },
  { slug: "expired", label: "Material Exp" },
  { slug: "closing", label: "Closing" },
  { slug: "result", label: "Final" },
];

const COUNT_SLUGS = new Set(["back", "front", "expired", "closing", "result"]);

export default function Topbar() {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ok" | "err">("idle");
  const syncToCloud = useCountingStore((s) => s.syncToCloud);
  const reorderMode = useItemsStore((s) => s.reorderMode);
  const setReorderMode = useItemsStore((s) => s.setReorderMode);

  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickCount = useRef(0);

  const slug = pathname?.split("/").pop() ?? "";
  const isCountPage = COUNT_SLUGS.has(slug);

  async function handleSync() {
    setSyncState("syncing");
    const result = await syncToCloud();
    setSyncState(result === "ok" ? "ok" : "err");
    setTimeout(() => setSyncState("idle"), 2000);
  }

  function handleAdminClick() {
    clickCount.current += 1;

    if (clickCount.current === 1) {
      clickTimer.current = setTimeout(() => {
        setAdminOpen(true);
        clickCount.current = 0;
      }, 300);
    } else {
      if (clickTimer.current) clearTimeout(clickTimer.current);
      clickCount.current = 0;
      if (isCountPage) {
        setReorderMode(true);
      } else {
        setAdminOpen(true);
      }
    }
  }

  return (
    <>
      <div className="topbar">
        <nav className="tabs">
          {STAGES.map((stage) => {
            const href = `/count/${stage.slug}`;
            const active = pathname === href;
            return (
              <Link key={stage.slug} href={href} className={`tab-btn ${active ? "active" : ""}`}>
                {stage.label}
              </Link>
            );
          })}
        </nav>

        {reorderMode ? (
          <>
            <button className="sync-btn idle" onClick={handleSync} disabled={syncState === "syncing"}>
              {syncState === "syncing" ? "Saving…" : syncState === "ok" ? "Saved ✓" : syncState === "err" ? "Error ✕" : "Save"}
            </button>
            <button className="admin-btn reorder-active" onClick={() => setReorderMode(false)}>
              Done
            </button>
          </>
        ) : (
          <>
            <button className={`sync-btn ${syncState}`} onClick={handleSync} disabled={syncState === "syncing"}>
              {syncState === "syncing" ? "Saving…" : syncState === "ok" ? "Saved ✓" : syncState === "err" ? "Error ✕" : "Save"}
            </button>
            <button className="admin-btn" onClick={handleAdminClick}>
              Admin
            </button>
          </>
        )}
      </div>

      <div className={`admin-backdrop ${adminOpen ? "open" : ""}`} onClick={() => setAdminOpen(false)} />
      <div className={`admin-panel ${adminOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setAdminOpen(false)}>✕</button>
        <h2>Admin</h2>
        <Link href="/count/result" className="admin-link" onClick={() => setAdminOpen(false)}>Final results</Link>
        <Link href="/admin/items" className="admin-link" onClick={() => setAdminOpen(false)}>Items</Link>
        <Link href="/admin/loss" className="admin-link" onClick={() => setAdminOpen(false)}>Loss</Link>
        <Link href="/admin/containers" className="admin-link" onClick={() => setAdminOpen(false)}>Containers</Link>
        <Link href="/admin/records" className="admin-link" onClick={() => setAdminOpen(false)}>Records</Link>
        <Link href="/admin/approvals" className="admin-link" onClick={() => setAdminOpen(false)}>Approvals</Link>
        <Link href="/admin/settings" className="admin-link" onClick={() => setAdminOpen(false)}>Settings</Link>
      </div>
    </>
  );
}
