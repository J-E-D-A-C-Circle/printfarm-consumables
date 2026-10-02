import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── GET /api/receipts ─────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const dateFrom = searchParams.get("from") || "";
  const dateTo = searchParams.get("to") || "";
  const stationParam = searchParams.get("station") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(c.name LIKE ? OR r.grn_number LIKE ? OR r.supplier LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) { conditions.push("r.date_received >= ?"); params.push(dateFrom); }
  if (dateTo)   { conditions.push("r.date_received <= ?"); params.push(dateTo); }
  if (stationParam) { conditions.push("s.name = ?"); params.push(stationParam); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT r.*,
       c.name AS item_name, c.item_code, c.unit,
       s.name AS station,
       d.name AS department,
       CONCAT(rb.first_name,' ',rb.last_name) AS received_by_name,
       CONCAT(ab.first_name,' ',ab.last_name) AS approved_by_name
     FROM stock_receipts r
     LEFT JOIN consumables  c  ON c.id = r.consumable_id
     LEFT JOIN stations     s  ON s.id = r.station_id
     LEFT JOIN departments  d  ON d.id = r.department_id
     LEFT JOIN users        rb ON rb.id = r.received_by_user_id
     LEFT JOIN users        ab ON ab.id = r.approved_by_user_id
     ${where}
     ORDER BY r.date_received DESC, r.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM stock_receipts r
     LEFT JOIN consumables c ON c.id = r.consumable_id
     LEFT JOIN stations s ON s.id = r.station_id
     ${where}`,
    params
  );

  return NextResponse.json({ data: rows, total: countRow?.total ?? 0, page, limit });
}

// ── POST /api/receipts ────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    consumable_id, quantity, supplier,
    station_id, department_id, date_received,
    grn_number, po_number,
    delivery_condition, remarks,
    received_by_user_id, approved_by_user_id,
  } = body;

  if (!consumable_id || !quantity || !supplier || !date_received) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
  }

  // Check GRN uniqueness
  const existingGrn = await queryOne(
    `SELECT id FROM stock_receipts WHERE grn_number = ?`, [grn_number]
  );
  if (existingGrn) {
    return NextResponse.json({ error: `GRN number ${grn_number} already exists.` }, { status: 409 });
  }

  // Get consumable before update (for audit)
  const consumable = await queryOne<{ balance: number; received: number; reorder_level: number; name: string }>(
    `SELECT balance, received, reorder_level, name FROM consumables WHERE id = ? AND is_active = 1`,
    [consumable_id]
  );
  if (!consumable) {
    return NextResponse.json({ error: "Consumable not found or archived." }, { status: 404 });
  }

  // Insert receipt record
  const result = await execute(
    `INSERT INTO stock_receipts
       (grn_number, po_number, consumable_id, quantity,
        supplier, station_id, department_id, delivery_condition, remarks,
        received_by_user_id, approved_by_user_id, date_received)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [grn_number, po_number || null, consumable_id,
     quantity, supplier,
     station_id || null, department_id || null,
     delivery_condition || "Good", remarks || null,
     received_by_user_id || session.id,
     approved_by_user_id || null,
     date_received]
  );

  // Update consumable balance
  const newBalance = consumable.balance + quantity;
  const newReceived = consumable.received + quantity;
  const newStatus = newBalance === 0 ? "OUT OF STOCK"
    : newBalance <= consumable.reorder_level ? "LOW STOCK"
    : "IN STOCK";

  await execute(
    `UPDATE consumables SET balance = ?, received = ?, status = ?, updated_by = ? WHERE id = ?`,
    [newBalance, newReceived, newStatus, session.id, consumable_id]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "RECEIVE_STOCK", tableName: "stock_receipts",
    recordId: result.insertId,
    oldValues: { balance: consumable.balance },
    newValues: { balance: newBalance, quantity_received: quantity, grn_number },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    id: result.insertId,
    grn_number,
    new_balance: newBalance,
    new_status: newStatus,
  }, { status: 201 });
}
