"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const STAGES = [
  { slug: "back", label: "1. Back" },
  { slug: "front", label: "2. Front" },
  { slug: "expired", label: "3. Material Expired" },
  { slug: "closing", label: "4. Closing" },
  { slug: "result", label: "5. Final Result" },
];

export default function StageTabs({ date }: { date: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2">
      {STAGES.map((stage) => {
        const href = `/count/${date}/${stage.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={stage.slug}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
              active
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {stage.label}
          </Link>
        );
      })}
    </nav>
  );
}
