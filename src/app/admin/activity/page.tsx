"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";
import { getActivityLog, type ActivityEntry } from "@/lib/activityLog";

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

export default function ActivityPage() {
  const [log, setLog] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    setLog(getActivityLog());
  }, []);

  return (
    <div className="content">
      <AdminHeader title="Activity Log" />
      {log.length === 0 ? (
        <p className="check">No activity yet.</p>
      ) : (
        <div className="card">
          {log.map((entry, i) => (
            <div key={i} className="activity-row">
              <span className={`activity-action activity-${entry.action}`}>
                {ACTION_LABEL[entry.action] ?? entry.action}
              </span>
              <span className="activity-kind">{KIND_LABEL[entry.kind] ?? entry.kind}</span>
              <span className="activity-label">{entry.label}</span>
              <span className="activity-time">{formatTime(entry.at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
