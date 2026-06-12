import Topbar from "@/components/Topbar";

export default function CountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Topbar />
      <div className="content">{children}</div>
    </>
  );
}
