import AdminHeader from "@/components/AdminHeader";

// TODO: list daily_records from Supabase, allow re-open/re-approve any date
export default function AdminRecordsPage() {
  return (
    <div className="content">
      <AdminHeader title="Records" />
      <p className="check">Historical daily records will be listed here.</p>
    </div>
  );
}
