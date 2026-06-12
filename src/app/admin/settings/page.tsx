import AdminHeader from "@/components/AdminHeader";

// TODO: edit app_settings (Google Drive folder id) + default loss rates
export default function AdminSettingsPage() {
  return (
    <div className="content">
      <AdminHeader title="Settings" />
      <p className="check">Google Drive folder ID and default loss rates will be configured here.</p>
    </div>
  );
}
