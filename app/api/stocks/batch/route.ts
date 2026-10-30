import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest, canDeleteRow } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { action, ids } = body;

  if (action !== "delete" || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Invalid payload: action ('delete') and an array of ids are required." },
      { status: 400 }
    );
  }

  if (!canDeleteRow(session.role)) {
    return NextResponse.json(
      { error: "Only Supervisors or Administrators can delete stock batches." },
      { status: 403 }
    );
  }

  const validIds = ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid record IDs provided." }, { status: 400 });
  }

  const placeholders = validIds.map(() => "?").join(",");
  const existing = await query<{ id: number; reference_number: string; consumable_name: string }>(
    `SELECT id, reference_number, consumable_name FROM consumable_stocks WHERE id IN (${placeholders})`,
    validIds
  );

  if (existing.length === 0) {
    return NextResponse.json({ error: "No matching stock records found to delete." }, { status: 404 });
  }

  await execute(`DELETE FROM consumable_stocks WHERE id IN (${placeholders})`, validIds);

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "BATCH_DELETE_CONSUMABLE_STOCKS",
    tableName: "consumable_stocks",
    recordId: null,
    oldValues: {
      deletedCount: existing.length,
      references: existing.map((r) => r.reference_number),
    },
    newValues: { deleted: true },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    affected: existing.length,
    message: `Successfully deleted ${existing.length} stock records.`,
  });
}

