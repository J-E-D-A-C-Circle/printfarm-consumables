import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── GET /api/consumables/[id] ─────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const item = await queryOne(
    `SELECT c.*, cat.name AS category, s.name AS station, d.name AS department
     FROM consumables c
     LEFT JOIN categories  cat ON cat.id = c.category_id
     LEFT JOIN stations    s   ON s.id   = c.station_id
     LEFT JOIN departments d   ON d.id   = c.department_id
     WHERE c.id = ?`,
    [id]
  );

  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

// ── PUT /api/consumables/[id] ─────────────────────────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const old = await queryOne(`SELECT * FROM consumables WHERE id = ?`, [id]);
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const { name, description, category_id, unit, station_id, department_id,
    supplier_default, lead_time_days, reorder_level, max_stock_level } = body;

  await execute(
    `UPDATE consumables SET
       name = ?, description = ?, category_id = ?, unit = ?,
       station_id = ?, department_id = ?, supplier_default = ?,
       lead_time_days = ?, reorder_level = ?, max_stock_level = ?,
       updated_by = ?
     WHERE id = ?`,
    [name, description || null, category_id, unit,
     station_id || null, department_id || null, supplier_default || null,
     lead_time_days || 0, reorder_level, max_stock_level, session.id, id]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "UPDATE_CONSUMABLE", tableName: "consumables",
    recordId: Number(id), oldValues: old as Record<string, unknown>, newValues: body,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ success: true });
}

// ── DELETE /api/consumables/[id] (soft delete = archive) ─────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden — Administrator, Supervisor, or Store Officer only" }, { status: 403 });
  }

  const { id } = await params;
  const old = await queryOne(`SELECT * FROM consumables WHERE id = ?`, [id]);
  if (!old) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { hard } = await req.json().catch(() => ({ hard: false }));

  if (hard && session.role === "Administrator") {
    await execute(`DELETE FROM consumables WHERE id = ?`, [id]);
    await logAudit({
      userId: session.id, userName: session.name,
      action: "HARD_DELETE_CONSUMABLE", tableName: "consumables",
      recordId: Number(id), oldValues: old as Record<string, unknown>,
      ipAddress: getClientIp(req.headers),
    });
    return NextResponse.json({ success: true, message: "Permanently deleted" });
  }

  // Default: soft archive
  await execute(`UPDATE consumables SET is_active = 0, updated_by = ? WHERE id = ?`, [session.id, id]);
  await logAudit({
    userId: session.id, userName: session.name,
    action: "ARCHIVE_CONSUMABLE", tableName: "consumables",
    recordId: Number(id), ipAddress: getClientIp(req.headers),
  });
  return NextResponse.json({ success: true, message: "Archived" });
}
