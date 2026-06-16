"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCountingStore } from "@/store/useCountingStore";

const STAGES = [
  { slug: "back", label: "Back" },
  { slug: "front", label: "Front" },
  { slug: "expired", label: "Material Exp" },
  { slug: "closing", label: "Closing" },
  { slug: "result", label: "Final" },
];

export default function Topbar() {
  const pathname = usePathname();
  const [adminOpen, setAdminOpen] = useState(false);
  const [syncState, setSyncState] = useState<"idle" | "syncing" | "ok" | "err">("idle");
  const syncToCloud = useCountingStore((s) => s.syncToCloud);

  async function handleSync() {
    setSyncState("syncing");
    const result = await syncToCloud();
    setSyncState(result === "ok" ? "ok" : "err");
    setTimeout(() => setSyncState("idle"), 2000);
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
        <button
          className={`sync-btn ${syncState}`}
          onClick={handleSync}
          disabled={syncState === "syncing"}
        >
          {syncState === "syncing" ? "Saving…" : syncState === "ok" ? "Saved ✓" : syncState === "err" ? "Error ✕" : "Save"}
        </button>
        <button className="admin-btn" onClick={() => setAdminOpen(true)}>
          Admin
        </button>
      </div>

      <div className={`admin-backdrop ${adminOpen ? "open" : ""}`} onClick={() => setAdminOpen(false)} />
      <div className={`admin-panel ${adminOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setAdminOpen(false)}>
          ✕
        </button>
        <h2>Admin</h2>
        <Link href="/count/result" className="admin-link" onClick={() => setAdminOpen(false)}>
          Final results
        </Link>
        <Link href="/admin/items" className="admin-link" onClick={() => setAdminOpen(false)}>
          Items
        </Link>
        <Link href="/admin/loss" className="admin-link" onClick={() => setAdminOpen(false)}>
          Loss
        </Link>
        <Link href="/admin/containers" className="admin-link" onClick={() => setAdminOpen(false)}>
          Containers
        </Link>
        <Link href="/admin/records" className="admin-link" onClick={() => setAdminOpen(false)}>
          Records
        </Link>
        <Link href="/admin/approvals" className="admin-link" onClick={() => setAdminOpen(false)}>
          Approvals
        </Link>
        <Link href="/admin/settings" className="admin-link" onClick={() => setAdminOpen(false)}>
          Settings
        </Link>
      </div>
    </>
  );
}
