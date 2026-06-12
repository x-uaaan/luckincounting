import Link from "next/link";

const SECTIONS = [
  { href: "/admin/records", label: "Records", desc: "View and re-open historical daily records" },
  { href: "/admin/approvals", label: "Approvals", desc: "Pending submissions queue" },
  { href: "/admin/settings", label: "Settings", desc: "Loss rates, bag sizes, Google Drive folder" },
];

export default function AdminHome() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-6">
      <h1 className="text-xl font-bold">Admin</h1>
      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:border-blue-300"
          >
            <div className="font-medium">{s.label}</div>
            <div className="text-sm text-gray-500">{s.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
