import Topbar from "@/components/Topbar";

export default function CountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { date: string };
}) {
  return (
    <div className="app-dark">
      <Topbar date={params.date} />
      <div className="content">{children}</div>
    </div>
  );
}
