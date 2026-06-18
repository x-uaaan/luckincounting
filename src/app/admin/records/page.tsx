"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { fetchAllRecords } from "@/lib/recordsRepo";
import type { DailyRecord } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
};

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingDate, setApprovingDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllRecords().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  async function handleApprove(date: string) {
    setApprovingDate(date);
    setError(null);
    try {
      const folderId = localStorage.getItem("google_drive_folder_id") ?? undefined;
      const res = await fetch("/api/drive/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, approvedBy: "admin", folderId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string; fileId?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Upload failed");
      } else {
        setRecords((prev) =>
          prev.map((r) =>
            r.date === date
              ? { ...r, status: "approved", drive_file_id: data.fileId ?? null, approved_at: new Date().toISOString(), approved_by: "admin" }
              : r
          )
        );
      }
    } catch {
      setError("Network error");
    } finally {
      setApprovingDate(null);
    }
  }

  return (
    <div className="content">
      <AdminHeader title="Records" />

      {error && <p className="check" style={{ color: "#ef4444" }}>{error}</p>}

      {loading ? (
        <p className="check">Loading…</p>
      ) : records.length === 0 ? (
        <p className="check">No records yet.</p>
      ) : (
        <div className="card">
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.date}>
                    <td>{r.date}</td>
                    <td>
                      <span className={`status-chip status-${r.status}`}>
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td>
                      {r.status === "approved" && r.drive_file_id ? (
                        <a
                          href={`https://drive.google.com/file/d/${r.drive_file_id}/view`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-link"
                        >
                          View in Drive ↗
                        </a>
                      ) : (
                        <button
                          className="admin-btn-sm"
                          disabled={approvingDate === r.date}
                          onClick={() => handleApprove(r.date)}
                        >
                          {approvingDate === r.date ? "Uploading…" : "Approve & Save"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
