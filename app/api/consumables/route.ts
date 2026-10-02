import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── GET /api/consumables ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const station = searchParams.get("station") || "";
  const status = searchParams.get("status") || "";
  const activeOnly = searchParams.get("archived") !== "true";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (activeOnly) { conditions.push("c.is_active = 1"); }
  if (search) {
    conditions.push("(c.name LIKE ? OR c.item_code LIKE ? OR cat.name LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category) { conditions.push("cat.name = ?"); params.push(category); }
  if (station) { conditions.push("s.name = ?"); params.push(station); }
  if (status) { conditions.push("c.status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT
       c.id, c.item_code, c.name, c.description, c.unit,
       c.received, c.issued, c.balance,
       c.reorder_level, c.max_stock_level, c.status,
       c.supplier_default, c.lead_time_days, c.is_active,
       c.created_at, c.updated_at,
       cat.id   AS category_id,   cat.name   AS category,
       s.id     AS station_id,    s.name     AS station,
       d.id     AS department_id, d.name     AS department
     FROM consumables c
     LEFT JOIN categories  cat ON cat.id = c.category_id
     LEFT JOIN stations    s   ON s.id   = c.station_id
     LEFT JOIN departments d   ON d.id   = c.department_id
     ${where}
     ORDER BY c.name ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM consumables c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stations s ON s.id = c.station_id
     ${where}`,
    params
  );

  return NextResponse.json({ data: rows, total: countRow?.total ?? 0, page, limit });
}

// ── POST /api/consumables ─────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const roles = ["Administrator", "Supervisor", "Store Officer"];
  if (!roles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { name, description, category_id, unit, station_id, department_id,
    supplier_default, lead_time_days, reorder_level, max_stock_level, item_code } = body;

  if (!name || !category_id) {
    return NextResponse.json({ error: "Name and category are required." }, { status: 400 });
  }

  // Generate item_code if not provided
  const code = item_code || `CONS-${Date.now().toString().slice(-6)}`;

  const initialQty = parseInt(body.initial_quantity) || 0;
  const reorderNum = parseInt(reorder_level) || 0;
  const initialStatus = initialQty === 0 ? "OUT OF STOCK"
    : initialQty <= reorderNum ? "LOW STOCK"
    : "IN STOCK";

  const result = await execute(
    `INSERT INTO consumables
       (item_code, name, description, category_id, unit, station_id, department_id,
        supplier_default, lead_time_days, received, issued, balance, status, reorder_level, max_stock_level, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`,
    [code, name, description || null, category_id, unit || "Piece",
     station_id || null, department_id || null,
     supplier_default || null, lead_time_days || 0,
     initialQty, initialQty, initialStatus,
     reorderNum, max_stock_level || 9999, session.id, session.id]
  );

  if (initialQty > 0) {
    const grn = `GRN-INIT-${Date.now().toString().slice(-6)}`;
    await execute(
      `INSERT INTO stock_receipts
         (grn_number, consumable_id, quantity, supplier, station_id, department_id, remarks, received_by_user_id, date_received)
       VALUES (?, ?, ?, ?, ?, ?, 'Initial Stock Balance Setup', ?, CURDATE())`,
      [grn, result.insertId, initialQty, supplier_default || "Opening Stock", station_id || null, department_id || null, session.id]
    );
  }

  await logAudit({
    userId: session.id, userName: session.name,
    action: "CREATE_CONSUMABLE", tableName: "consumables",
    recordId: result.insertId,
    newValues: body, ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ id: result.insertId, item_code: code }, { status: 201 });
}
