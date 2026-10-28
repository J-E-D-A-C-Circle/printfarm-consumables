import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET /api/batches ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const statusParam  = searchParams.get("status") || "";
  const consumableId = searchParams.get("consumable_id") || "";
  const issueId      = searchParams.get("issue_id") || "";
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: string[] = ["c.is_active = 1"];
  const params: unknown[] = [];

  if (statusParam)  { conditions.push("b.status = ?");         params.push(statusParam); }
  if (consumableId) { conditions.push("b.consumable_id = ?");  params.push(consumableId); }
  if (issueId)      { conditions.push("b.issue_id = ?");       params.push(issueId); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const rows = await query(
    `SELECT b.*,
       c.name AS item_name, c.item_code, c.unit,
       i.reference_number AS issue_reference,
       CONCAT(r.first_name,' ',r.last_name) AS reconciled_by_name,
       CONCAT(w.first_name,' ',w.last_name) AS witness_name
     FROM card_printing_batches b
     INNER JOIN consumables c ON c.id = b.consumable_id AND c.is_active = 1
     LEFT JOIN stock_issues i ON i.id = b.issue_id
     LEFT JOIN users r ON r.id = b.reconciled_by_user_id
     LEFT JOIN users w ON w.id = b.witness_user_id
     ${where}
     ORDER BY b.date_issued DESC, b.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total
     FROM card_printing_batches b
     INNER JOIN consumables c ON c.id = b.consumable_id AND c.is_active = 1
     ${where}`,
    params
  );

  return NextResponse.json(
    { data: rows, total: countRow?.total ?? 0, page, limit },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}

// ── POST /api/batches ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer", "Station Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    consumable_id,
    issue_id,
    date_issued,
    issued_to,
    quantity_issued,
    expected_quantity,
    printed_cards,
    damaged_cards,
    recapture_cards,
    reason_for_damage,
    recapture_reason,
    notes,
    status: requestedStatus,
  } = body;

  if (!consumable_id || !date_issued || !issued_to || !quantity_issued) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const printed   = parseInt(printed_cards)   || 0;
  const damaged   = parseInt(damaged_cards)   || 0;
  const recapture = parseInt(recapture_cards) || 0;
  const qtyIssued = parseInt(quantity_issued) || 0;
  const expQty    = parseInt(expected_quantity) || qtyIssued;

  const isReconciled = requestedStatus === "Reconciled" || (printed > 0 || damaged > 0 || recapture > 0);
  const status = isReconciled ? "Reconciled" : "Pending";

  const batchCode = `CPB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  const result = await execute(
    `INSERT INTO card_printing_batches
       (batch_code, consumable_id, issue_id, date_issued, issued_to,
        quantity_issued, expected_quantity, status,
        printed_cards, damaged_cards, recapture_cards,
        reason_for_damage, recapture_reason, notes,
        date_of_reconciliation, reconciled_by_user_id, reconciled_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      batchCode,
      consumable_id,
      issue_id || null,
      date_issued,
      issued_to,
      qtyIssued,
      expQty,
      status,
      printed,
      damaged,
      recapture,
      reason_for_damage || null,
      recapture_reason || null,
      notes || null,
      isReconciled ? (new Date().toISOString().split("T")[0]) : null,
      isReconciled ? session.id : null,
      isReconciled ? new Date() : null,
    ]
  );

  const batchId = result.insertId;

  // Link batch to stock issue if provided
  if (issue_id) {
    await execute(`UPDATE stock_issues SET batch_id = ? WHERE id = ?`, [batchId, issue_id]);
  }

  // Fetch updated computed fields (yield_percentage, waste_percentage, unaccounted)
  const createdBatch = await queryOne(
    `SELECT * FROM card_printing_batches WHERE id = ?`,
    [batchId]
  );

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: isReconciled ? "CREATE_AND_RECONCILE_BATCH" : "CREATE_BATCH",
    tableName: "card_printing_batches",
    recordId: batchId,
    newValues: { ...body, batch_code: batchCode, status },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    {
      id: batchId,
      batch_code: batchCode,
      status,
      data: createdBatch,
    },
    { status: 201 }
  );
}
