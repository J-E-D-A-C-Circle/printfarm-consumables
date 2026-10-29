import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET /api/reports/yield (Master Consumables Return Sheet Records) ──────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const statusParam   = searchParams.get("status") || "";
  const categoryParam = searchParams.get("category") || "";
  const dateFrom      = searchParams.get("from") || "";
  const dateTo        = searchParams.get("to") || "";
  const search        = searchParams.get("search") || "";

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (statusParam && statusParam !== "all") {
    conditions.push(`r.status = ?`);
    params.push(statusParam);
  }
  if (categoryParam && categoryParam !== "all") {
    conditions.push(`LOWER(r.consumable_name) = LOWER(?)`);
    params.push(categoryParam);
  }
  if (dateFrom) {
    conditions.push(`r.date_requested >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`r.date_requested <= ?`);
    params.push(dateTo);
  }
  if (search) {
    conditions.push(
      `(r.consumable_name LIKE ? OR r.reference_number LIKE ? OR r.requested_by LIKE ? OR r.issued_by LIKE ? OR r.received_by LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    id: number;
    reference_number: string;
    date_requested: string;
    category_id: number | null;
    consumable_name: string;
    quantity_requested: number;
    quantity_issued: number | null;
    issued_by: string | null;
    requested_by: string;
    received_by: string | null;
    date_returned: string | null;
    total_consumption: number | null;
    status: "Pending Issue" | "Issued" | "Completed";
    remarks: string | null;
  }>(
    `SELECT r.*
     FROM consumable_requests r
     ${where}
     ORDER BY r.date_requested ASC, r.id ASC`,
    params
  );

  const totalRequests = rows.length;
  const pendingIssueCount = rows.filter((r) => r.status === "Pending Issue").length;
  const issuedPendingReturnCount = rows.filter((r) => r.status === "Issued").length;
  const completedCount = rows.filter((r) => r.status === "Completed").length;

  const totalRequestedQty = rows.reduce((sum, r) => sum + (Number(r.quantity_requested) || 0), 0);
  const totalIssuedQty = rows.reduce((sum, r) => sum + (Number(r.quantity_issued) || 0), 0);
  const totalConsumption = rows.reduce((sum, r) => sum + (Number(r.total_consumption) || 0), 0);

  const summary = {
    total_requests: totalRequests,
    pending_issue: pendingIssueCount,
    issued_pending_return: issuedPendingReturnCount,
    completed: completedCount,
    total_requested_qty: totalRequestedQty,
    total_issued_qty: totalIssuedQty,
    total_consumption: totalConsumption,
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
