import Link from "next/link";

export default function AdminHeader({
  title,
  backHref = "/admin",
  backLabel = "← Admin",
}: {
  title: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="admin-header">
      <h1>{title}</h1>
      <Link href={backHref} className="back-link">
        {backLabel}
      </Link>
    </div>
  );
}
