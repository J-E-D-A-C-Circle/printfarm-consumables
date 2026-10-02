import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// ── GET /api/reports/usage ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const stationParam  = searchParams.get("station") || "";
  const categoryParam = searchParams.get("category") || "";
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to") || "";

  const conditions: string[] = ["c.is_active = 1"];
  const params: unknown[] = [];

  if (stationParam)  { conditions.push("s.name = ?");   params.push(stationParam); }
  if (categoryParam) { conditions.push("cat.name = ?"); params.push(categoryParam); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  // If date range provided, compute period-specific issued from stock_issues
  let rows;
  if (dateFrom || dateTo) {
    const dateConditions: string[] = [];
    const dateParams: unknown[] = [];
    if (dateFrom) { dateConditions.push("i.date_issued >= ?"); dateParams.push(dateFrom); }
    if (dateTo)   { dateConditions.push("i.date_issued <= ?"); dateParams.push(dateTo); }
    const dateWhere = dateConditions.length ? `AND ${dateConditions.join(" AND ")}` : "";

    rows = await query(
      `SELECT
         c.id, c.item_code, c.name, c.unit,
         c.balance, c.reorder_level, c.status,
         cat.name AS category,
         s.name AS station, d.name AS department,
         COALESCE(r.total_received, c.received, 0) AS received,
         COALESCE(SUM(i.quantity), 0) AS issued,
         COALESCE(SUM(i.quantity), 0) AS period_issued
       FROM consumables c
       LEFT JOIN categories  cat ON cat.id = c.category_id
       LEFT JOIN stations    s   ON s.id   = c.station_id
       LEFT JOIN departments d   ON d.id   = c.department_id
       LEFT JOIN (
         SELECT consumable_id, SUM(quantity) AS total_received
         FROM stock_receipts
         GROUP BY consumable_id
       ) r ON r.consumable_id = c.id
       LEFT JOIN stock_issues i  ON i.consumable_id = c.id ${dateWhere}
       ${where}
       GROUP BY c.id, c.item_code, c.name, c.unit, c.balance, c.reorder_level, c.status, cat.name, s.name, d.name, c.received, r.total_received
       ORDER BY period_issued DESC`,
      [...dateParams, ...params]
    );
  } else {
    rows = await query(
      `SELECT
         c.id, c.item_code, c.name, c.unit,
         c.balance, c.reorder_level, c.status,
         cat.name AS category,
         s.name AS station, d.name AS department,
         COALESCE(r.total_received, c.received, 0) AS received,
         COALESCE(i.total_issued, c.issued, 0) AS issued
       FROM consumables c
       LEFT JOIN categories  cat ON cat.id = c.category_id
       LEFT JOIN stations    s   ON s.id   = c.station_id
       LEFT JOIN departments d   ON d.id   = c.department_id
       LEFT JOIN (
         SELECT consumable_id, SUM(quantity) AS total_received
         FROM stock_receipts
         GROUP BY consumable_id
       ) r ON r.consumable_id = c.id
       LEFT JOIN (
         SELECT consumable_id, SUM(quantity) AS total_issued
         FROM stock_issues
         GROUP BY consumable_id
       ) i ON i.consumable_id = c.id
       ${where}
       ORDER BY c.name ASC`,
      params
    );
  }

  // Summary totals
  const [totals] = await query<{
    total_items: number; total_balance: number;
    total_received: number; total_issued: number;
    low_stock: number; out_of_stock: number;
  }>(
    `SELECT
       COUNT(*) AS total_items,
       COALESCE(SUM(c.balance), 0) AS total_balance,
       COALESCE(SUM(COALESCE(r.total_received, c.received, 0)), 0) AS total_received,
       COALESCE(SUM(COALESCE(i.total_issued, c.issued, 0)), 0) AS total_issued,
       COALESCE(SUM(CASE WHEN c.status = 'LOW STOCK' THEN 1 ELSE 0 END), 0) AS low_stock,
       COALESCE(SUM(CASE WHEN c.status = 'OUT OF STOCK' THEN 1 ELSE 0 END), 0) AS out_of_stock
     FROM consumables c
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stations s ON s.id = c.station_id
     LEFT JOIN (
       SELECT consumable_id, SUM(quantity) AS total_received
       FROM stock_receipts
       GROUP BY consumable_id
     ) r ON r.consumable_id = c.id
     LEFT JOIN (
       SELECT consumable_id, SUM(quantity) AS total_issued
       FROM stock_issues
       GROUP BY consumable_id
     ) i ON i.consumable_id = c.id
     ${where}`,
    params
  );

  return NextResponse.json({ data: rows, summary: totals });
}
