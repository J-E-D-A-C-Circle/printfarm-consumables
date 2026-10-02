import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── GET /api/batches ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const statusParam  = searchParams.get("status") || "";
  const consumableId = searchParams.get("consumable_id") || "";
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (statusParam)  { conditions.push("b.status = ?");         params.push(statusParam); }
  if (consumableId) { conditions.push("b.consumable_id = ?");  params.push(consumableId); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT b.*,
       c.name AS item_name, c.item_code, c.unit,
       CONCAT(r.first_name,' ',r.last_name) AS reconciled_by_name,
       CONCAT(w.first_name,' ',w.last_name) AS witness_name
     FROM card_printing_batches b
     LEFT JOIN consumables c ON c.id = b.consumable_id
     LEFT JOIN users r ON r.id = b.reconciled_by_user_id
     LEFT JOIN users w ON w.id = b.witness_user_id
     ${where}
     ORDER BY b.date_issued DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM card_printing_batches b ${where}`,
    params
  );

  return NextResponse.json({ data: rows, total: countRow?.total ?? 0, page, limit });
}

// ── POST /api/batches ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { consumable_id, issue_id, date_issued, issued_to, quantity_issued } = body;

  if (!consumable_id || !date_issued || !issued_to || !quantity_issued) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }

  const batchCode = `CPB-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;

  const result = await execute(
    `INSERT INTO card_printing_batches
       (batch_code, consumable_id, issue_id, date_issued, issued_to, quantity_issued, status)
     VALUES (?, ?, ?, ?, ?, ?, 'Pending')`,
    [batchCode, consumable_id, issue_id || null, date_issued, issued_to, quantity_issued]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "CREATE_BATCH", tableName: "card_printing_batches",
    recordId: result.insertId, newValues: body,
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ id: result.insertId, batch_code: batchCode }, { status: 201 });
}
