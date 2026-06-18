import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import * as XLSX from "xlsx";
import { fetchRecord, patchRecord } from "@/lib/recordsRepo";
import { fetchItems } from "@/lib/itemsRepo";

async function refreshAccessToken(refreshToken: string): Promise<string | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  const data = await res.json() as { access_token?: string };
  return data.access_token ?? null;
}

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get("google_access_token")?.value ?? null;
  const refreshToken = cookieStore.get("google_refresh_token")?.value ?? null;

  if (!token && refreshToken) {
    token = await refreshAccessToken(refreshToken);
    if (token) {
      cookieStore.set("google_access_token", token, { httpOnly: true, secure: true, maxAge: 3600, path: "/" });
    }
  }
  return token;
}

export async function POST(req: NextRequest) {
  const { date, approvedBy, folderId } = await req.json() as { date: string; approvedBy: string; folderId?: string };

  const accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Not connected to Google Drive" }, { status: 401 });
  }

  const record = await fetchRecord(date);
  if (!record) return NextResponse.json({ error: "Record not found" }, { status: 404 });

  const items = await fetchItems();
  const sheet2Items = (items ?? []).filter((i) => i.appears_in.includes("sheet2"));

  // Build XLSX buffer server-side
  const rows = sheet2Items.map((item) => {
    const entry = record.sheet2[item.id];
    return {
      Item: item.name,
      Back: entry?.back ?? 0,
      Front: entry?.front ?? 0,
      Closing: entry?.closing ?? 0,
      Total: entry?.total ?? 0,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Final");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  // Upload to Google Drive (multipart)
  const fileName = `${date}.xlsx`;
  const metadata = { name: fileName, mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ...(folderId ? { parents: [folderId] } : {}) };

  const boundary = "foo_bar_baz";
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet\r\n\r\n`),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const uploadRes = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    // If 401, try refresh once
    if (uploadRes.status === 401) {
      const cookieStore = await cookies();
      const refreshToken = cookieStore.get("google_refresh_token")?.value;
      if (refreshToken) {
        const newToken = await refreshAccessToken(refreshToken);
        if (newToken) {
          cookieStore.set("google_access_token", newToken, { httpOnly: true, secure: true, maxAge: 3600, path: "/" });
          return NextResponse.json({ error: "Token refreshed, please retry" }, { status: 503 });
        }
      }
    }
    return NextResponse.json({ error: err }, { status: 500 });
  }

  const file = await uploadRes.json() as { id: string };

  // Make file readable by anyone with link
  await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  // Mark record approved
  await patchRecord(date, {
    status: "approved",
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
    drive_file_id: file.id,
  });

  return NextResponse.json({ ok: true, fileId: file.id });
}
