import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import {
  getSessionFromRequest,
  canIssueConsumable,
  canRecordConsumption,
  canDeleteRow,
} from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface BatchActionBody {
  action: "delete" | "issue" | "complete";
  ids: number[];
  // issue / complete parameters
  issued_by?: string;
  received_by?: string;
  date_returned?: string;
  total_consumption?: number;
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as BatchActionBody;
  const { action, ids } = body;

  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json(
      { error: "Invalid payload: action and an array of ids are required." },
      { status: 400 }
    );
  }

  const validIds = ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id) && id > 0);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "No valid record IDs provided." }, { status: 400 });
  }

  // ── 1. Batch Delete ────────────────────────────────────────────────────────
  if (action === "delete") {
    if (!canDeleteRow(session.role)) {
      return NextResponse.json(
        { error: "Only Supervisors or Administrators can delete records in batch." },
        { status: 403 }
      );
    }

    const placeholders = validIds.map(() => "?").join(",");
    const existing = await query<{ id: number; reference_number: string; consumable_name: string }>(
      `SELECT id, reference_number, consumable_name FROM consumable_requests WHERE id IN (${placeholders})`,
      validIds
    );

    if (existing.length === 0) {
      return NextResponse.json({ error: "No matching records found to delete." }, { status: 404 });
    }

    await execute(
      `DELETE FROM consumable_requests WHERE id IN (${placeholders})`,
      validIds
    );

    await logAudit({
      userId: session.id,
      userName: session.name,
      action: "BATCH_DELETE_CONSUMABLE_REQUESTS",
      tableName: "consumable_requests",
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
      message: `Successfully deleted ${existing.length} records.`,
    });
  }

  // ── 2. Batch Issue (Mark Pending Issue rows as Issued) ─────────────────────
  if (action === "issue") {
    if (!canIssueConsumable(session.role)) {
      return NextResponse.json(
        { error: "Only Store Officers, Supervisors, or Administrators can issue consumables." },
        { status: 403 }
      );
    }

    const issuer = (body.issued_by || session.name || "MR. RICHARD ANAFO").trim();
    const receiver = (body.received_by || "").trim() || null;

    const placeholders = validIds.map(() => "?").join(",");
    // Update quantity_issued to quantity_requested where quantity_issued is null or 0, set status = 'Issued'
    await execute(
      `UPDATE consumable_requests
       SET quantity_issued = CASE 
             WHEN quantity_issued IS NULL OR quantity_issued = 0 THEN quantity_requested 
             ELSE quantity_issued 
           END,
           issued_by = COALESCE(?, issued_by),
           received_by = COALESCE(?, received_by),
           status = CASE 
             WHEN status = 'Pending Issue' THEN 'Issued' 
             ELSE status 
           END,
           updated_by = ?
       WHERE id IN (${placeholders})`,
      [issuer, receiver, session.id, ...validIds]
    );

    await logAudit({
      userId: session.id,
      userName: session.name,
      action: "BATCH_ISSUE_CONSUMABLES",
      tableName: "consumable_requests",
      newValues: {
        recordCount: validIds.length,
        issued_by: issuer,
        received_by: receiver,
      },
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({
      success: true,
      affected: validIds.length,
      message: `Marked ${validIds.length} records as Issued.`,
    });
  }

  // ── 3. Batch Complete (Mark Issued rows as Completed) ──────────────────────
  if (action === "complete") {
    if (!canRecordConsumption(session.role)) {
      return NextResponse.json(
        { error: "Your role does not have permission to mark records as Completed." },
        { status: 403 }
      );
    }

    const returnDate = body.date_returned || new Date().toISOString().split("T")[0];
    const consumption = body.total_consumption !== undefined ? Number(body.total_consumption) : null;

    const placeholders = validIds.map(() => "?").join(",");
    await execute(
      `UPDATE consumable_requests
       SET date_returned = COALESCE(date_returned, ?),
           total_consumption = COALESCE(total_consumption, ?),
           status = 'Completed',
           updated_by = ?
       WHERE id IN (${placeholders})`,
      [returnDate, consumption, session.id, ...validIds]
    );

    await logAudit({
      userId: session.id,
      userName: session.name,
      action: "BATCH_COMPLETE_CONSUMABLES",
      tableName: "consumable_requests",
      newValues: {
        recordCount: validIds.length,
        date_returned: returnDate,
        total_consumption: consumption,
      },
      ipAddress: getClientIp(req.headers),
    });

    return NextResponse.json({
      success: true,
      affected: validIds.length,
      message: `Marked ${validIds.length} records as Completed.`,
    });
  }

  return NextResponse.json({ error: `Unsupported batch action: ${action}` }, { status: 400 });
}

