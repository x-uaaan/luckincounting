"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";
import { getActivityLog, type ActivityEntry } from "@/lib/activityLog";

const SECTIONS = [
  { href: "/admin/items", label: "Items", desc: "Manage items, weights, and calc factors" },
  { href: "/admin/loss", label: "Loss", desc: "Loss-rate fractions for Material Expired items" },
  { href: "/admin/containers", label: "Containers", desc: "Manage container name/tare presets" },
  { href: "/admin/records", label: "Records", desc: "View, approve, or reject daily submissions" },
  { href: "/admin/activity", label: "Activity", desc: "Log of all adds, deletes, and approvals" },
  { href: "/admin/settings", label: "Settings", desc: "Google Drive connection and folder" },
];

const ACTION_LABEL: Record<string, string> = {
  add: "Added",
  delete: "Deleted",
  approve: "Approved",
  reject: "Rejected",
};

const KIND_LABEL: Record<string, string> = {
  item: "item",
  container: "container",
  loss_rate: "loss rate",
  record: "record",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminHome() {
  const [log, setLog] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setLog(getActivityLog());
  }, []);

  return (
    <div className="content">
      <AdminHeader title="Admin" backHref="/" backLabel="← Home" />
      <div className="admin-grid">
        {SECTIONS.map((s) => (
          <Link key={s.href} href={s.href} className="admin-card">
            <div className="title">{s.label}</div>
            <div className="desc">{s.desc}</div>
          </Link>
        ))}
      </div>

      <div style={{ marginTop: 24 }}>
        <div className="category-label">Recent Activity</div>
        {log.length === 0 ? (
          <p className="check">No activity yet.</p>
        ) : (
          <div className="card">
            {log.slice(0, 20).map((entry, i) => (
              <div key={i} className="activity-row">
                <span className={`activity-action activity-${entry.action}`}>
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>
                <span className="activity-kind">{KIND_LABEL[entry.kind] ?? entry.kind}</span>
                <span className="activity-label">{entry.label}</span>
                <span className="activity-time">{formatTime(entry.at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
