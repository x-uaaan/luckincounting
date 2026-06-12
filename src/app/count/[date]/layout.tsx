import Topbar from "@/components/Topbar";

export default function CountLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { date: string };
}) {
  return (
    <>
      <Topbar date={params.date} />
      <div className="content">{children}</div>
    </>
  );
}
