import AdminHeader from "@/components/AdminHeader";

// TODO: list daily_records with status = 'pending_approval'
export default function AdminApprovalsPage() {
  return (
    <div className="content">
      <AdminHeader title="Approvals" />
      <p className="check">Pending submissions will be listed here.</p>
    </div>
  );
}
