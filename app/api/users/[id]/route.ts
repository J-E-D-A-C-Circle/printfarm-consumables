import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── PUT /api/users/[id] ───────────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden — Administrator only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await queryOne(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const body = await req.json();
  const { first_name, last_name, email, phone, role, status } = body;

  await execute(
    `UPDATE users SET
       first_name = COALESCE(?, first_name),
       last_name  = COALESCE(?, last_name),
       email      = COALESCE(?, email),
       phone      = COALESCE(?, phone),
       role       = COALESCE(?, role),
       status     = COALESCE(?, status)
     WHERE id = ?`,
    [first_name || null, last_name || null, email || null, phone || null, role || null, status || null, id]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "UPDATE_USER", tableName: "users",
    recordId: Number(id), oldValues: existing as Record<string, unknown>, newValues: body,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true });
}

// ── DELETE /api/users/[id] ────────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden — Administrator only" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await queryOne(`SELECT * FROM users WHERE id = ?`, [id]);
  if (!existing) return NextResponse.json({ error: "User not found" }, { status: 404 });

  await execute(`DELETE FROM users WHERE id = ?`, [id]);

  await logAudit({
    userId: session.id, userName: session.name,
    action: "DELETE_USER", tableName: "users",
    recordId: Number(id), oldValues: existing as Record<string, unknown>,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true });
}
