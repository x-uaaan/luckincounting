"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/components/AdminHeader";

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function AdminSettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [folderId, setFolderId] = useState("");
  const [disconnecting, setDisconnecting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reseeding, setReseeding] = useState(false);
  const [reseedMsg, setReseedMsg] = useState("");

  useEffect(() => {
    setEmail(getCookie("google_email"));
    setFolderId(localStorage.getItem("google_drive_folder_id") ?? "");

    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "1") {
      setEmail(getCookie("google_email"));
      window.history.replaceState({}, "", "/admin/settings");
    }
  }, []);

  function handleSaveFolder() {
    localStorage.setItem("google_drive_folder_id", folderId.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/auth/google/disconnect", { method: "POST" });
    setEmail(null);
    setDisconnecting(false);
  }

  async function handleReseed() {
    if (!window.confirm("Sync all items from code to Supabase? This will overwrite remote item data.")) return;
    setReseeding(true);
    setReseedMsg("");
    try {
      const res = await fetch("/api/admin/reseed", { method: "POST" });
      const data = await res.json() as { ok?: boolean; items?: number; containers?: number; error?: string };
      if (data.ok) {
        setReseedMsg(`✓ Synced ${data.items} items, ${data.containers} containers`);
      } else {
        setReseedMsg(`Error: ${data.error ?? "unknown"}`);
      }
    } catch {
      setReseedMsg("Network error");
    } finally {
      setReseeding(false);
    }
  }

  const isConnected = !!email;

  return (
    <div className="content">
      <AdminHeader title="Settings" />

      <div className="card">
        <div className="card-head">
          <div>
            <div className="title">Google Drive</div>
            <div className="subtitle">{isConnected ? `Connected as ${email}` : "Not connected"}</div>
          </div>
          {isConnected ? (
            <button className="clear-btn" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? "…" : "Disconnect"}
            </button>
          ) : (
            <a href="/api/auth/google" className="admin-btn-sm" style={{ textDecoration: "none", display: "inline-block" }}>
              Connect
            </a>
          )}
        </div>

        {isConnected && (
          <div className="row" style={{ marginTop: 12 }}>
            <div className="w105">
              <div className="name">Folder ID</div>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <div className="lbl">Google Drive folder ID (optional)</div>
              <input
                type="text"
                value={folderId}
                onChange={(e) => setFolderId(e.target.value)}
                placeholder="1fneehkt03kWTortmknSbmd7qP6VNu_Ns"
                style={{ width: "100%", background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--fg)", borderRadius: 6, padding: "6px 10px" }}
              />
            </div>
            <button className="admin-btn-sm" style={{ alignSelf: "flex-end" }} onClick={handleSaveFolder}>
              {saved ? "Saved ✓" : "Save"}
            </button>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="card-head">
          <div>
            <div className="title">Item Data Sync</div>
            <div className="subtitle">Push latest item definitions from code to Supabase</div>
          </div>
          <button className="admin-btn-sm" onClick={handleReseed} disabled={reseeding}>
            {reseeding ? "Syncing…" : "Sync items"}
          </button>
        </div>
        {reseedMsg && <div className="check" style={{ marginTop: 8 }}>{reseedMsg}</div>}
      </div>
    </div>
  );
}
