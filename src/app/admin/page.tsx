"use client";

import Link from "next/link";
import AdminHeader from "@/components/AdminHeader";

const SECTIONS = [
  { href: "/admin/items", label: "Items", desc: "Manage items, weights, and calc factors" },
  { href: "/admin/loss", label: "Loss", desc: "Loss-rate fractions for Material Expired items" },
  { href: "/admin/containers", label: "Containers", desc: "Manage container name/tare presets" },
  { href: "/admin/records", label: "Records", desc: "View, approve, or reject daily submissions" },
  { href: "/admin/activity", label: "Activity", desc: "Log of all adds, deletes, and approvals" },
  { href: "/admin/settings", label: "Settings", desc: "Google Drive connection and folder" },
];

export default function AdminHome() {
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
    </div>
  );
}
