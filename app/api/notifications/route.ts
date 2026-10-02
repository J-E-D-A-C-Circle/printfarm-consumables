import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// ── GET /api/notifications ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const unreadOnly = req.nextUrl.searchParams.get("unread") === "true";

  const rows = await query(
    `SELECT id, type, title, message, link, is_read, created_at
     FROM notifications
     WHERE user_id = ? ${unreadOnly ? "AND is_read = 0" : ""}
     ORDER BY created_at DESC
     LIMIT 50`,
    [session.id]
  );

  const [countRow] = await query<{ unread: number }>(
    `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
    [session.id]
  );

  return NextResponse.json({ data: rows, unread_count: countRow?.unread ?? 0 });
}

// ── POST /api/notifications/read-all ─────────────────────────────────────────
// (mark all as read for this user — called from the bell dropdown)
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await execute(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
    [session.id]
  );

  return NextResponse.json({ success: true });
}
