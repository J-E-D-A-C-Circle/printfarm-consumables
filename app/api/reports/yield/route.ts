import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

// ── GET /api/reports/yield ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const statusParam  = searchParams.get("status") || "";
  const consumableId = searchParams.get("consumable_id") || "";
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to") || "";
  const stationParam = searchParams.get("station") || "";
  const categoryParam = searchParams.get("category") || "";

  const conditions: string[] = ["(b.issue_id IS NULL OR i.id IS NOT NULL)"];
  const params: unknown[] = [];

  if (statusParam)  { conditions.push("b.status = ?"); params.push(statusParam); }
  if (consumableId) { conditions.push("b.consumable_id = ?"); params.push(consumableId); }
  if (dateFrom) { conditions.push("b.date_issued >= ?"); params.push(dateFrom); }
  if (dateTo)   { conditions.push("b.date_issued <= ?"); params.push(dateTo); }
  if (stationParam) { conditions.push("s.name = ?"); params.push(stationParam); }
  if (categoryParam) { conditions.push("cat.name = ?"); params.push(categoryParam); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT
       b.id, b.batch_code, b.date_issued, b.issued_to,
       b.quantity_issued, b.status,
       b.printed_cards, b.damaged_cards, b.recapture_cards,
       b.unaccounted, b.yield_percentage, b.waste_percentage,
       b.reconciled_at, b.date_of_reconciliation,
       b.reason_for_damage, b.notes,
       c.name AS item_name, c.item_code, c.unit,
       cat.name AS category_name,
       i.reference_number AS issue_reference,
       s.name AS station_name,
       d.name AS department_name,
       CONCAT(u.first_name,' ',u.last_name) AS reconciled_by_name
     FROM card_printing_batches b
     LEFT JOIN consumables c ON c.id = b.consumable_id
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stock_issues i ON i.id = b.issue_id
     LEFT JOIN stations s ON s.id = i.to_station_id
     LEFT JOIN departments d ON d.id = i.department_id
     LEFT JOIN users u ON u.id = b.reconciled_by_user_id
     ${where}
     ORDER BY b.date_issued DESC`,
    params
  );

  // Summary metrics
  const [summary] = await query<{
    total_batches: number; pending_batches: number; reconciled_batches: number;
    total_issued: number; total_printed: number; total_damaged: number;
    total_recapture: number; total_unaccounted: number;
    avg_yield: number; avg_waste: number;
  }>(
    `SELECT
       COUNT(*) AS total_batches,
       COALESCE(SUM(CASE WHEN b.status = 'Pending' THEN 1 ELSE 0 END), 0) AS pending_batches,
       COALESCE(SUM(CASE WHEN b.status = 'Reconciled' THEN 1 ELSE 0 END), 0) AS reconciled_batches,
       COALESCE(SUM(b.quantity_issued), 0) AS total_issued,
       COALESCE(SUM(b.printed_cards), 0) AS total_printed,
       COALESCE(SUM(b.damaged_cards), 0) AS total_damaged,
       COALESCE(SUM(b.recapture_cards), 0) AS total_recapture,
       COALESCE(SUM(b.unaccounted), 0) AS total_unaccounted,
       COALESCE(ROUND(AVG(CASE WHEN b.status='Reconciled' THEN b.yield_percentage END),2), 0) AS avg_yield,
       COALESCE(ROUND(AVG(CASE WHEN b.status='Reconciled' THEN b.waste_percentage END),2), 0) AS avg_waste
     FROM card_printing_batches b
     LEFT JOIN consumables c ON c.id = b.consumable_id
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stock_issues i ON i.id = b.issue_id
     LEFT JOIN stations s ON s.id = i.to_station_id
     LEFT JOIN departments d ON d.id = i.department_id
     ${where}`,
    params
  );

  return NextResponse.json({ data: rows, summary });
}
