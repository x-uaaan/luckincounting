"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { getActivityLog, removeActivityEntry, type ActivityEntry } from "@/lib/activityLog";
import { useItemsStore } from "@/store/useItemsStore";
import { patchRecord } from "@/lib/recordsRepo";

const ACTION_LABEL: Record<string, string> = {
  add: "Added",
  delete: "Deleted",
  approve: "Approved",
  reject: "Rejected",
};

const KIND_LABEL: Record<string, string> = {
  item: "item",
  container: "container",
  loss_rate: "loss rate",
  record: "record",
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

type CancelResult =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | { ok: "warn"; message: string; relations: string[]; onConfirm: () => Promise<void> };

export default function ActivityPage() {
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [pendingConfirm, setPendingConfirm] = useState<{
    at: string;
    message: string;
    relations: string[];
    onConfirm: () => Promise<void>;
  } | null>(null);

  const items = useItemsStore((s) => s.items);
  const containers = useItemsStore((s) => s.containers);
  const deletedItems = useItemsStore((s) => s.deletedItems);
  const deleteItem = useItemsStore((s) => s.deleteItem);
  const restoreItem = useItemsStore((s) => s.restoreItem);
  const deleteContainer = useItemsStore((s) => s.deleteContainer);

  useEffect(() => {
    setLog(getActivityLog());
  }, []);

  function refreshLog() {
    setLog(getActivityLog());
  }

  async function buildCancelResult(entry: ActivityEntry): Promise<CancelResult> {
    const { action, kind, id, label } = entry;

    // Records: approve or reject → revert to pending
    if (kind === "record" && (action === "approve" || action === "reject") && id) {
      return {
        ok: "warn",
        message: `Revert record "${label}" back to Pending Approval?`,
        relations: [],
        onConfirm: async () => {
          await patchRecord(id, { status: "pending_approval" });
        },
      };
    }

    // Item added → cancel = delete it
    if (kind === "item" && action === "add" && id) {
      const exists = items.find((i) => i.id === id);
      if (!exists) return { ok: false, error: "Item no longer exists." };
      return {
        ok: "warn",
        message: `Delete item "${label}"?`,
        relations: ["Historical counting records may still reference this item."],
        onConfirm: async () => {
          deleteItem(id);
        },
      };
    }

    // Item deleted → cancel = restore it
    if (kind === "item" && action === "delete" && id) {
      const restorable = deletedItems.find((i) => i.id === id);
      if (!restorable) {
        return { ok: false, error: `"${label}" has been permanently removed from this session and cannot be restored automatically. Re-add it manually via Items.` };
      }
      return {
        ok: "warn",
        message: `Restore item "${label}"?`,
        relations: [],
        onConfirm: async () => {
          restoreItem(id);
        },
      };
    }

    // Container added → cancel = delete it (check which items use it)
    if (kind === "container" && action === "add" && id) {
      const exists = containers.find((c) => c.id === id);
      if (!exists) return { ok: false, error: "Container no longer exists." };
      const affected = items.filter(
        (i) => i.default_container_id === id || i.container_id === id
      );
      const relations = affected.map((i) => `"${i.name}" uses this container`);
      return {
        ok: "warn",
        message: `Delete container "${label}"?`,
        relations,
        onConfirm: async () => {
          deleteContainer(id);
        },
      };
    }

    // Container deleted → cannot auto-restore
    if (kind === "container" && action === "delete") {
      return {
        ok: false,
        error: `Container "${label}" cannot be automatically restored. Re-add it manually via Containers.`,
      };
    }

    return { ok: false, error: "This action cannot be cancelled." };
  }

  async function handleCancel(entry: ActivityEntry) {
    setBusy(entry.at);
    const result = await buildCancelResult(entry);
    setBusy(null);

    if (!result.ok) {
      setFeedback((f) => ({ ...f, [entry.at]: { ok: false, msg: result.error } }));
      return;
    }

    if (result.ok === "warn") {
      setPendingConfirm({
        at: entry.at,
        message: result.message,
        relations: result.relations,
        onConfirm: result.onConfirm,
      });
    }
  }

  async function confirmCancel() {
    if (!pendingConfirm) return;
    setBusy(pendingConfirm.at);
    try {
      await pendingConfirm.onConfirm();
      removeActivityEntry(pendingConfirm.at);
      refreshLog();
      setFeedback((f) => ({ ...f, [pendingConfirm.at]: { ok: true, msg: "Cancelled." } }));
    } catch {
      setFeedback((f) => ({ ...f, [pendingConfirm.at]: { ok: false, msg: "Failed to cancel." } }));
    } finally {
      setBusy(null);
      setPendingConfirm(null);
    }
  }

  return (
    <div className="content">
      <AdminHeader title="Activity Log" />

      {pendingConfirm && (
        <div className="confirm-overlay">
          <div className="confirm-box">
            <div className="confirm-msg">{pendingConfirm.message}</div>
            {pendingConfirm.relations.length > 0 && (
              <div className="confirm-relations">
                <div className="confirm-warn-label">⚠ Relations affected:</div>
                {pendingConfirm.relations.map((r, i) => (
                  <div key={i} className="confirm-relation-item">{r}</div>
                ))}
              </div>
            )}
            <div className="confirm-actions">
              <button className="admin-btn-sm reject-btn" onClick={confirmCancel} disabled={!!busy}>
                {busy ? "…" : "Confirm cancel"}
              </button>
              <button className="clear-btn" onClick={() => setPendingConfirm(null)}>
                Keep
              </button>
            </div>
          </div>
        </div>
      )}

      {log.length === 0 ? (
        <p className="check">No activity yet.</p>
      ) : (
        <div className="card">
          {log.map((entry, i) => {
            const fb = feedback[entry.at];
            return (
              <div key={i} className="activity-row">
                <span className={`activity-action activity-${entry.action}`}>
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </span>
                <span className="activity-kind">{KIND_LABEL[entry.kind] ?? entry.kind}</span>
                <span className="activity-label">{entry.label}</span>
                <span className="activity-time">{formatTime(entry.at)}</span>
                {fb ? (
                  <span style={{ fontSize: 11, color: fb.ok ? "var(--accent)" : "#ef4444" }}>{fb.msg}</span>
                ) : (
                  <button
                    className="cancel-action-btn"
                    disabled={busy === entry.at}
                    onClick={() => handleCancel(entry)}
                  >
                    {busy === entry.at ? "…" : "Cancel"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
