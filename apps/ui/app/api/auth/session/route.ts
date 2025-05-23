import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * API Route: /api/auth/verify-request
 *
 * Retrieves the session cookie and returns the clientId if authenticated.
 * Otherwise returns 401 Unauthorized.
 */
export async function GET() {
  const session = cookies().get("session");

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  return NextResponse.json({ clientId: session.value });
}