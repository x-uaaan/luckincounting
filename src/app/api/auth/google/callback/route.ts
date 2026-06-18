import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?error=no_code`);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`;

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: "authorization_code" }),
  });
  const tokens = await tokenRes.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string };

  if (tokens.error || !tokens.access_token) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?error=token_exchange`);
  }

  // Fetch user email
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json() as { email?: string };

  const cookieStore = await cookies();
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  cookieStore.set("google_access_token", tokens.access_token, { httpOnly: true, secure: true, maxAge, path: "/" });
  if (tokens.refresh_token) {
    cookieStore.set("google_refresh_token", tokens.refresh_token, { httpOnly: true, secure: true, maxAge, path: "/" });
  }
  if (user.email) {
    cookieStore.set("google_email", user.email, { httpOnly: false, secure: true, maxAge, path: "/" });
  }

  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/admin/settings?connected=1`);
}
