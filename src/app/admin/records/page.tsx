"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { fetchAllRecords, patchRecord } from "@/lib/recordsRepo";
import { logActivity } from "@/lib/activityLog";
import type { DailyRecord } from "@/lib/types";

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending_approval: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyDate, setBusyDate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllRecords().then((r) => {
      setRecords(r);
      setLoading(false);
    });
  }, []);

  async function handleApprove(date: string) {
    setBusyDate(date);
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
        setError(typeof data.error === "string" ? data.error : JSON.stringify(data.error));
      } else {
        logActivity({ action: "approve", kind: "record", label: date });
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
      setBusyDate(null);
    }
  }

  async function handleReject(date: string) {
    if (!window.confirm(`Reject submission for ${date}? The team will be asked to resubmit.`)) return;
    setBusyDate(date);
    setError(null);
    try {
      await patchRecord(date, { status: "rejected" });
      logActivity({ action: "reject", kind: "record", label: date });
      setRecords((prev) =>
        prev.map((r) => (r.date === date ? { ...r, status: "rejected" } : r))
      );
    } catch {
      setError("Network error");
    } finally {
      setBusyDate(null);
    }
  }

  return (
    <div className="content">
      <AdminHeader title="Records" />

      {error && <p className="check" style={{ color: "#ef4444", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error}</p>}

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
                          style={{ display: "inline" }}
                        >
                          View in Drive ↗
                        </a>
                      ) : r.status === "pending_approval" ? (
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="admin-btn-sm"
                            disabled={busyDate === r.date}
                            onClick={() => handleApprove(r.date)}
                          >
                            {busyDate === r.date ? "Uploading…" : "Approve"}
                          </button>
                          <button
                            className="admin-btn-sm reject-btn"
                            disabled={busyDate === r.date}
                            onClick={() => handleReject(r.date)}
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-secondary)", fontSize: 12 }}>—</span>
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
