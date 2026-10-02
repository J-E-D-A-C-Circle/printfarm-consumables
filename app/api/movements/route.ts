import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// ── GET /api/movements ────────────────────────────────────────────────────────
// Unified view: receipts + issues + adjustments ordered by date
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search  = searchParams.get("search") || "";
  const type    = searchParams.get("type") || ""; // "receipt" | "issue" | "adjustment"
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to") || "";
  const station  = searchParams.get("station") || "";
  const page  = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = (page - 1) * limit;

  // Build sub-queries as UNION
  const receiptQ = `
    SELECT
      r.id, 'receipt' AS movement_type,
      r.date_received AS movement_date,
      c.name AS item_name, c.item_code, c.unit,
      r.quantity AS quantity,
      r.supplier AS from_party,
      s.name AS to_party,
      r.grn_number AS reference,
      CONCAT(u.first_name,' ',u.last_name) AS officer,
      NULL AS balance_after
    FROM stock_receipts r
    LEFT JOIN consumables c ON c.id = r.consumable_id
    LEFT JOIN stations s ON s.id = r.station_id
    LEFT JOIN users u ON u.id = r.received_by_user_id`;

  const issueQ = `
    SELECT
      i.id, 'issue' AS movement_type,
      i.date_issued AS movement_date,
      c.name AS item_name, c.item_code, c.unit,
      i.quantity AS quantity,
      fs.name AS from_party,
      ts.name AS to_party,
      i.reference_number AS reference,
      CONCAT(u.first_name,' ',u.last_name) AS officer,
      i.balance_after
    FROM stock_issues i
    LEFT JOIN consumables c ON c.id = i.consumable_id
    LEFT JOIN stations fs ON fs.id = i.from_station_id
    LEFT JOIN stations ts ON ts.id = i.to_station_id
    LEFT JOIN users u ON u.id = i.issuing_user_id`;

  const adjQ = `
    SELECT
      a.id, 'adjustment' AS movement_type,
      a.created_at AS movement_date,
      c.name AS item_name, c.item_code, c.unit,
      a.quantity_change AS quantity,
      a.adjustment_type AS from_party,
      s.name AS to_party,
      a.reference_number AS reference,
      CONCAT(u.first_name,' ',u.last_name) AS officer,
      a.balance_after
    FROM stock_adjustments a
    LEFT JOIN consumables c ON c.id = a.consumable_id
    LEFT JOIN stations s ON s.id = a.station_id
    LEFT JOIN users u ON u.id = a.created_by`;

  let unionParts = [receiptQ, issueQ, adjQ];
  if (type === "receipt")    unionParts = [receiptQ];
  if (type === "issue")      unionParts = [issueQ];
  if (type === "adjustment") unionParts = [adjQ];

  // Wrap in outer query for filtering
  const innerSql = unionParts.join(" UNION ALL ");
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(m.item_name LIKE ? OR m.reference LIKE ? OR m.officer LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) { conditions.push("m.movement_date >= ?"); params.push(dateFrom); }
  if (dateTo)   { conditions.push("m.movement_date <= ?"); params.push(dateTo); }
  if (station)  { conditions.push("(m.from_party = ? OR m.to_party = ?)"); params.push(station, station); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT m.* FROM (${innerSql}) m ${where}
     ORDER BY m.movement_date DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM (${innerSql}) m ${where}`,
    params
  );

  return NextResponse.json({ data: rows, total: countRow?.total ?? 0, page, limit });
}

// ── DELETE /api/movements ──────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor", "Store Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  let id = searchParams.get("id");
  let type = searchParams.get("type"); // receipt | issue | adjustment

  if (!id || !type) {
    const body = await req.json().catch(() => ({}));
    id = id || body.id;
    type = type || body.type;
  }

  if (!id || !type) {
    return NextResponse.json({ error: "Movement ID and type are required." }, { status: 400 });
  }

  const movId = Number(id);

  if (type === "receipt") {
    const receipt = await queryOne<{ id: number; consumable_id: number; quantity: number; grn_number: string }>(
      `SELECT id, consumable_id, quantity, grn_number FROM stock_receipts WHERE id = ?`,
      [movId]
    );
    if (!receipt) {
      return NextResponse.json({ error: "Stock receipt not found." }, { status: 404 });
    }

    const consumable = await queryOne<{ id: number; balance: number; reorder_level: number }>(
      `SELECT id, balance, reorder_level FROM consumables WHERE id = ?`,
      [receipt.consumable_id]
    );

    if (consumable) {
      const newBalance = Math.max(0, consumable.balance - receipt.quantity);
      const newStatus = newBalance === 0 ? "OUT OF STOCK" : newBalance <= consumable.reorder_level ? "LOW STOCK" : "IN STOCK";
      await execute(
        `UPDATE consumables SET balance = ?, status = ?, updated_by = ? WHERE id = ?`,
        [newBalance, newStatus, session.id, consumable.id]
      );
    }

    await execute(`DELETE FROM stock_receipts WHERE id = ?`, [movId]);
    return NextResponse.json({ success: true, message: `Receipt ${receipt.grn_number} deleted and stock adjusted.` });
  }

  if (type === "issue") {
    const issueRec = await queryOne<{ id: number; reference_number: string; consumable_id: number; quantity: number; batch_id: number | null }>(
      `SELECT id, reference_number, consumable_id, quantity, batch_id FROM stock_issues WHERE id = ?`,
      [movId]
    );
    if (!issueRec) {
      return NextResponse.json({ error: "Stock issue record not found." }, { status: 404 });
    }

    const consumable = await queryOne<{ id: number; balance: number; issued: number; reorder_level: number }>(
      `SELECT id, balance, issued, reorder_level FROM consumables WHERE id = ?`,
      [issueRec.consumable_id]
    );

    if (consumable) {
      const restoredBalance = consumable.balance + issueRec.quantity;
      const restoredIssued = Math.max(0, consumable.issued - issueRec.quantity);
      const restoredStatus = restoredBalance > consumable.reorder_level ? "IN STOCK" : restoredBalance > 0 ? "LOW STOCK" : "OUT OF STOCK";
      await execute(
        `UPDATE consumables SET balance = ?, issued = ?, status = ?, updated_by = ? WHERE id = ?`,
        [restoredBalance, restoredIssued, restoredStatus, session.id, consumable.id]
      );
    }

    if (issueRec.batch_id) {
      await execute(`DELETE FROM card_printing_batches WHERE id = ?`, [issueRec.batch_id]);
    }
    await execute(`DELETE FROM card_printing_batches WHERE issue_id = ?`, [movId]);
    await execute(`DELETE FROM stock_issues WHERE id = ?`, [movId]);
    return NextResponse.json({ success: true, message: `Dispatch issue ${issueRec.reference_number} deleted and stock restored.` });
  }

  if (type === "adjustment") {
    const adj = await queryOne<{ id: number; consumable_id: number; quantity_change: number; reference_number: string }>(
      `SELECT id, consumable_id, quantity_change, reference_number FROM stock_adjustments WHERE id = ?`,
      [movId]
    );
    if (!adj) {
      return NextResponse.json({ error: "Stock adjustment not found." }, { status: 404 });
    }

    const consumable = await queryOne<{ id: number; balance: number; reorder_level: number }>(
      `SELECT id, balance, reorder_level FROM consumables WHERE id = ?`,
      [adj.consumable_id]
    );

    if (consumable) {
      // Reverse adjustment change
      const newBalance = Math.max(0, consumable.balance - adj.quantity_change);
      const newStatus = newBalance === 0 ? "OUT OF STOCK" : newBalance <= consumable.reorder_level ? "LOW STOCK" : "IN STOCK";
      await execute(
        `UPDATE consumables SET balance = ?, status = ?, updated_by = ? WHERE id = ?`,
        [newBalance, newStatus, session.id, consumable.id]
      );
    }

    await execute(`DELETE FROM stock_adjustments WHERE id = ?`, [movId]);
    return NextResponse.json({ success: true, message: `Adjustment ${adj.reference_number} deleted and balance reverted.` });
  }

  return NextResponse.json({ error: "Invalid movement type." }, { status: 400 });
}

