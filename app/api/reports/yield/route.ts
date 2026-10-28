import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

  // Conditions for stock_issues records
  const issueConditions: string[] = ["c.is_active = 1"];
  const issueParams: unknown[] = [];

  if (statusParam && statusParam !== "all") {
    if (statusParam === "Pending") {
      issueConditions.push("(b.status = 'Pending' OR b.status IS NULL)");
    } else {
      issueConditions.push("b.status = ?");
      issueParams.push(statusParam);
    }
  }
  if (consumableId) {
    issueConditions.push("i.consumable_id = ?");
    issueParams.push(consumableId);
  }
  if (dateFrom) {
    issueConditions.push("i.date_issued >= ?");
    issueParams.push(dateFrom);
  }
  if (dateTo) {
    issueConditions.push("i.date_issued <= ?");
    issueParams.push(dateTo);
  }
  if (stationParam && stationParam !== "all") {
    issueConditions.push("(ts.name = ? OR (ts.name IS NULL AND s.name = ?))");
    issueParams.push(stationParam, stationParam);
  }
  if (categoryParam && categoryParam !== "all") {
    issueConditions.push("cat.name = ?");
    issueParams.push(categoryParam);
  }

  const issueWhere = issueConditions.length ? `WHERE ${issueConditions.join(" AND ")}` : "";

  // Conditions for standalone batches (where issue_id IS NULL)
  const standaloneConditions: string[] = ["b.issue_id IS NULL", "c.is_active = 1"];
  const standaloneParams: unknown[] = [];

  if (statusParam && statusParam !== "all") {
    standaloneConditions.push("b.status = ?");
    standaloneParams.push(statusParam);
  }
  if (consumableId) {
    standaloneConditions.push("b.consumable_id = ?");
    standaloneParams.push(consumableId);
  }
  if (dateFrom) {
    standaloneConditions.push("b.date_issued >= ?");
    standaloneParams.push(dateFrom);
  }
  if (dateTo) {
    standaloneConditions.push("b.date_issued <= ?");
    standaloneParams.push(dateTo);
  }
  if (stationParam && stationParam !== "all") {
    standaloneConditions.push("s.name = ?");
    standaloneParams.push(stationParam);
  }
  if (categoryParam && categoryParam !== "all") {
    standaloneConditions.push("cat.name = ?");
    standaloneParams.push(categoryParam);
  }

  const standaloneWhere = standaloneConditions.length ? `WHERE ${standaloneConditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT
       COALESCE(b.id, i.id + 100000) AS id,
       COALESCE(b.batch_code, i.reference_number) AS batch_code,
       i.date_issued,
       COALESCE(b.issued_to, i.receiving_officer, 'Station Officer') AS issued_to,
       i.quantity AS quantity_issued,
       COALESCE(b.status, 'Pending') AS status,
       COALESCE(b.printed_cards, 0) AS printed_cards,
       COALESCE(b.damaged_cards, 0) AS damaged_cards,
       COALESCE(b.recapture_cards, 0) AS recapture_cards,
       COALESCE(b.unaccounted, 0) AS unaccounted,
       b.yield_percentage,
       b.waste_percentage,
       b.reconciled_at,
       b.date_of_reconciliation,
       b.reason_for_damage,
       COALESCE(b.notes, i.remarks) AS notes,
       c.name AS item_name,
       c.item_code,
       c.unit,
       cat.name AS category_name,
       i.reference_number AS issue_reference,
       COALESCE(ts.name, s.name, 'Head Office') AS station_name,
       d.name AS department_name,
       CONCAT(u.first_name, ' ', u.last_name) AS reconciled_by_name
     FROM stock_issues i
     LEFT JOIN card_printing_batches b ON (b.issue_id = i.id OR b.id = i.batch_id)
     INNER JOIN consumables c ON c.id = i.consumable_id AND c.is_active = 1
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stations ts ON ts.id = i.to_station_id
     LEFT JOIN stations s ON s.id = c.station_id
     LEFT JOIN departments d ON d.id = i.department_id
     LEFT JOIN users u ON u.id = b.reconciled_by_user_id
     ${issueWhere}

     UNION ALL

     SELECT
       b.id,
       b.batch_code,
       b.date_issued,
       b.issued_to,
       b.quantity_issued,
       b.status,
       b.printed_cards,
       b.damaged_cards,
       b.recapture_cards,
       b.unaccounted,
       b.yield_percentage,
       b.waste_percentage,
       b.reconciled_at,
       b.date_of_reconciliation,
       b.reason_for_damage,
       b.notes,
       c.name AS item_name,
       c.item_code,
       c.unit,
       cat.name AS category_name,
       NULL AS issue_reference,
       COALESCE(s.name, 'Head Office') AS station_name,
       NULL AS department_name,
       CONCAT(u.first_name, ' ', u.last_name) AS reconciled_by_name
     FROM card_printing_batches b
     INNER JOIN consumables c ON c.id = b.consumable_id AND c.is_active = 1
     LEFT JOIN categories cat ON cat.id = c.category_id
     LEFT JOIN stations s ON s.id = c.station_id
     LEFT JOIN users u ON u.id = b.reconciled_by_user_id
     ${standaloneWhere}

     ORDER BY date_issued DESC, id DESC`,
    [...issueParams, ...standaloneParams]
  );

  // Summary metrics calculated over the unified result set
  const totalBatches = rows.length;
  const pendingBatches = rows.filter((r: any) => r.status === "Pending").length;
  const reconciledBatches = rows.filter((r: any) => r.status === "Reconciled").length;
  const totalIssued = rows.reduce((acc: number, r: any) => acc + (Number(r.quantity_issued) || 0), 0);
  const totalPrinted = rows.reduce((acc: number, r: any) => acc + (Number(r.printed_cards) || 0), 0);
  const totalDamaged = rows.reduce((acc: number, r: any) => acc + (Number(r.damaged_cards) || 0), 0);
  const totalRecapture = rows.reduce((acc: number, r: any) => acc + (Number(r.recapture_cards) || 0), 0);
  const totalUnaccounted = rows.reduce((acc: number, r: any) => acc + (Number(r.unaccounted) || 0), 0);

  const reconciledRows = rows.filter((r: any) => r.status === "Reconciled" && r.yield_percentage !== null);
  const avgYield = reconciledRows.length > 0
    ? Number((reconciledRows.reduce((acc: number, r: any) => acc + Number(r.yield_percentage), 0) / reconciledRows.length).toFixed(2))
    : 0;
  const avgWaste = reconciledRows.length > 0
    ? Number((reconciledRows.reduce((acc: number, r: any) => acc + Number(r.waste_percentage), 0) / reconciledRows.length).toFixed(2))
    : 0;

  const summary = {
    total_batches: totalBatches,
    pending_batches: pendingBatches,
    reconciled_batches: reconciledBatches,
    total_issued: totalIssued,
    total_printed: totalPrinted,
    total_damaged: totalDamaged,
    total_recapture: totalRecapture,
    total_unaccounted: totalUnaccounted,
    avg_yield: avgYield,
    avg_waste: avgWaste,
  };

  return NextResponse.json(
    { data: rows, summary },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}
