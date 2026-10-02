import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

// ── GET /api/issues ───────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search     = searchParams.get("search") || "";
  const dateFrom   = searchParams.get("from") || "";
  const dateTo     = searchParams.get("to") || "";
  const category   = searchParams.get("category") || "";
  const stationParam = searchParams.get("station") || "";
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(c.name LIKE ? OR i.reference_number LIKE ? OR i.receiving_officer LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) { conditions.push("i.date_issued >= ?"); params.push(dateFrom); }
  if (dateTo)   { conditions.push("i.date_issued <= ?"); params.push(dateTo); }
  if (category) { conditions.push("cat.name = ?"); params.push(category); }
  if (stationParam) { conditions.push("ts.name = ?"); params.push(stationParam); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT i.*,
       c.name AS item_name, c.item_code, c.unit,
       cat.name AS category,
       fs.name AS from_station,
       ts.name AS to_station,
       d.name  AS department,
       CONCAT(iu.first_name,' ',iu.last_name) AS issued_by_name,
       CONCAT(au.first_name,' ',au.last_name) AS authorized_by_name
     FROM stock_issues i
     LEFT JOIN consumables  c   ON c.id   = i.consumable_id
     LEFT JOIN categories   cat ON cat.id = c.category_id
     LEFT JOIN stations     fs  ON fs.id  = i.from_station_id
     LEFT JOIN stations     ts  ON ts.id  = i.to_station_id
     LEFT JOIN departments  d   ON d.id   = i.department_id
     LEFT JOIN users        iu  ON iu.id  = i.issuing_user_id
     LEFT JOIN users        au  ON au.id  = i.authorized_by_user_id
     ${where}
     ORDER BY i.date_issued DESC, i.id DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM stock_issues i
     LEFT JOIN consumables c ON c.id = i.consumable_id
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stations ts ON ts.id = i.to_station_id
     ${where}`,
    params
  );

  return NextResponse.json({ data: rows, total: countRow?.total ?? 0, page, limit });
}

// ── POST /api/issues ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowedRoles = ["Administrator", "Supervisor", "Store Officer"];
  if (!allowedRoles.includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const {
    consumable_id, quantity, expected_quantity, from_station_id, to_station_id,
    department_id, purpose, receiving_officer, authorized_by_user_id,
    reference_number, requisition_number, remarks, date_issued,
    // For printing batches
    issued_to, expected_completion_date,
  } = body;

  if (!consumable_id || !quantity || !date_issued) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be greater than zero." }, { status: 400 });
  }

  const expQty = expected_quantity !== undefined && expected_quantity !== null
    ? Math.max(0, parseInt(expected_quantity) || 0)
    : quantity;

  // Lock check on the consumable
  const consumable = await queryOne<{
    balance: number; issued: number; reorder_level: number; name: string; category_id: number;
  }>(
    `SELECT balance, issued, reorder_level, name, category_id FROM consumables WHERE id = ? AND is_active = 1`,
    [consumable_id]
  );
  if (!consumable) {
    return NextResponse.json({ error: "Consumable not found or archived." }, { status: 404 });
  }
  if (quantity > consumable.balance) {
    return NextResponse.json({
      error: `Cannot issue ${quantity} — only ${consumable.balance} available.`
    }, { status: 422 });
  }

  const newBalance = consumable.balance - quantity;
  const newIssued  = consumable.issued + quantity;
  const newStatus  = newBalance === 0 ? "OUT OF STOCK"
    : newBalance <= consumable.reorder_level ? "LOW STOCK"
    : "IN STOCK";

  // Insert issue record
  const issueResult = await execute(
    `INSERT INTO stock_issues
       (reference_number, requisition_number, consumable_id, quantity, expected_quantity,
        from_station_id, to_station_id, department_id, purpose,
        receiving_officer, issuing_user_id, authorized_by_user_id,
        remarks, date_issued, balance_after)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [reference_number, requisition_number || null, consumable_id, quantity, expQty,
     from_station_id || null, to_station_id || null, department_id || null,
     purpose || "standard", receiving_officer || null,
     session.id, authorized_by_user_id || null,
     remarks || null, date_issued, newBalance]
  );

  // Auto-create tracking batch if purpose = printing or tracking requested
  let batchId: number | null = null;
  const recipient = issued_to || receiving_officer || "Station Officer";
  if (purpose === "printing" || body.track_work) {
    const batchCode = `BATCH-${new Date().getFullYear()}-${issueResult.insertId}`;
    const batchResult = await execute(
      `INSERT INTO card_printing_batches
         (batch_code, consumable_id, issue_id, date_issued, issued_to, quantity_issued, expected_quantity, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')`,
      [batchCode, consumable_id, issueResult.insertId, date_issued, recipient, quantity, expQty]
    );
    batchId = batchResult.insertId;
    // Link batch back to issue
    await execute(`UPDATE stock_issues SET batch_id = ? WHERE id = ?`, [batchId, issueResult.insertId]);
  }

  // Update consumable balance
  await execute(
    `UPDATE consumables SET balance = ?, issued = ?, status = ?, updated_by = ? WHERE id = ?`,
    [newBalance, newIssued, newStatus, session.id, consumable_id]
  );

  // Fire LOW STOCK / OUT OF STOCK notifications
  if (newStatus !== "IN STOCK") {
    const supervisorUsers = await query<{ id: number }>(
      `SELECT id FROM users WHERE role IN ('Administrator','Supervisor') AND status = 'Active'`
    );
    const notifType  = newStatus === "OUT OF STOCK" ? "out_of_stock" : "low_stock";
    const notifTitle = newStatus === "OUT OF STOCK"
      ? `OUT OF STOCK: ${consumable.name}`
      : `Low Stock Alert: ${consumable.name}`;
    const notifMsg = `Balance is now ${newBalance} units after issuing ${quantity} units.`;

    for (const u of supervisorUsers) {
      await execute(
        `INSERT INTO notifications (user_id, type, title, message, link)
         VALUES (?, ?, ?, ?, ?)`,
        [u.id, notifType, notifTitle, notifMsg, `/consumables`]
      );
    }
  }

  await logAudit({
    userId: session.id, userName: session.name,
    action: "ISSUE_STOCK", tableName: "stock_issues",
    recordId: issueResult.insertId,
    oldValues: { balance: consumable.balance },
    newValues: { balance: newBalance, quantity_issued: quantity, reference_number, batch_id: batchId },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    id: issueResult.insertId,
    reference_number,
    new_balance: newBalance,
    new_status: newStatus,
    batch_id: batchId,
  }, { status: 201 });
}

// ── DELETE /api/issues ────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor", "Store Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  let id = searchParams.get("id");
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: "Stock issue ID is required." }, { status: 400 });
  }

  const issueId = Number(id);
  const issueRec = await queryOne<{
    id: number;
    reference_number: string;
    consumable_id: number;
    quantity: number;
    batch_id: number | null;
  }>(
    `SELECT id, reference_number, consumable_id, quantity, batch_id FROM stock_issues WHERE id = ?`,
    [issueId]
  );

  if (!issueRec) {
    return NextResponse.json({ error: "Stock issue record not found." }, { status: 404 });
  }

  // Get current consumable data
  const consumable = await queryOne<{
    id: number;
    name: string;
    balance: number;
    issued: number;
    reorder_level: number;
  }>(
    `SELECT id, name, balance, issued, reorder_level FROM consumables WHERE id = ?`,
    [issueRec.consumable_id]
  );

  if (consumable) {
    const restoredBalance = consumable.balance + issueRec.quantity;
    const restoredIssued  = Math.max(0, consumable.issued - issueRec.quantity);
    const restoredStatus  = restoredBalance > consumable.reorder_level ? "IN STOCK"
      : restoredBalance > 0 ? "LOW STOCK"
      : "OUT OF STOCK";

    await execute(
      `UPDATE consumables SET balance = ?, issued = ?, status = ?, updated_by = ? WHERE id = ?`,
      [restoredBalance, restoredIssued, restoredStatus, session.id, consumable.id]
    );
  }

  // If there's a batch linked, delete it
  if (issueRec.batch_id) {
    await execute(`DELETE FROM card_printing_batches WHERE id = ?`, [issueRec.batch_id]);
  }
  await execute(`DELETE FROM card_printing_batches WHERE issue_id = ?`, [issueId]);

  // Delete the stock issue record
  await execute(`DELETE FROM stock_issues WHERE id = ?`, [issueId]);

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE_STOCK_ISSUE",
    tableName: "stock_issues",
    recordId: issueId,
    oldValues: { reference_number: issueRec.reference_number, quantity: issueRec.quantity },
    newValues: { deleted: true },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    message: `Dispatch record #${issueRec.reference_number} deleted. Restored ${issueRec.quantity} units to stock.`
  });
}

