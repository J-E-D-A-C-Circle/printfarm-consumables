import { NextRequest, NextResponse } from "next/server";
import { queryOne, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── PUT /api/batches/[id] — Submit reconciliation ─────────────────────────────
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer", "Station Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const batch = await queryOne<{
    id: number; batch_code: string; status: string;
    quantity_issued: number; consumable_id: number;
    issue_id: number | null;
  }>(
    `SELECT id, batch_code, status, quantity_issued, consumable_id, issue_id
     FROM card_printing_batches WHERE id = ?`,
    [id]
  );

  if (!batch) return NextResponse.json({ error: "Batch not found." }, { status: 404 });

  const body = await req.json();
  const {
    printed_cards, damaged_cards, recapture_cards,
    reason_for_damage, recapture_reason, notes,
    date_of_reconciliation, witness_user_id,
  } = body;

  const printed   = parseInt(printed_cards)   || 0;
  const damaged   = parseInt(damaged_cards)   || 0;
  const recapture = parseInt(recapture_cards) || 0;

  await execute(
    `UPDATE card_printing_batches SET
       status = 'Reconciled',
       printed_cards = ?,
       damaged_cards = ?,
       recapture_cards = ?,
       reason_for_damage = ?,
       recapture_reason = ?,
       notes = ?,
       date_of_reconciliation = ?,
       reconciled_by_user_id = ?,
       witness_user_id = ?,
       reconciled_at = NOW()
     WHERE id = ?`,
    [printed, damaged, recapture,
     reason_for_damage || null,
     recapture_reason || null,
     notes || null,
     date_of_reconciliation || new Date().toISOString().split("T")[0],
     session.id,
     witness_user_id || null,
     id]
  );

  // Fetch computed fields to return in response
  const updated = await queryOne<{
    yield_percentage: number; waste_percentage: number; unaccounted: number;
  }>(
    `SELECT yield_percentage, waste_percentage, unaccounted FROM card_printing_batches WHERE id = ?`,
    [id]
  );

  // Mark pending reconciliation notification as read if any
  await execute(
    `UPDATE notifications SET is_read = 1
     WHERE type = 'pending_reconciliation' AND link LIKE ? AND is_read = 0`,
    [`%${batch.batch_code}%`]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "RECONCILE_BATCH", tableName: "card_printing_batches",
    recordId: Number(id),
    oldValues: { status: "Pending" },
    newValues: { status: "Reconciled", printed, damaged, recapture,
      yield_percentage: updated?.yield_percentage,
      waste_percentage: updated?.waste_percentage,
      unaccounted: updated?.unaccounted },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    yield_percentage: updated?.yield_percentage,
    waste_percentage: updated?.waste_percentage,
    unaccounted: updated?.unaccounted,
  });
}
