import StageTabs from "@/components/StageTabs";

export default function CountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { date: string };
}) {
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 bg-white px-4 py-3">
        <div className="font-semibold">Luckin Counting</div>
        <div className="text-sm text-gray-500">Date: {params.date}</div>
        <div className="flex gap-2">
          <button className="rounded border border-gray-300 px-3 py-1 text-sm">Save Draft</button>
          <button className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
            Submit for Approval
          </button>
        </div>
      </header>
      <StageTabs date={params.date} />
      <main className="p-4">{children}</main>
    </div>
  );
}
