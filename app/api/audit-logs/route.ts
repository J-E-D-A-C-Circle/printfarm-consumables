import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { getSessionFromRequest, hasMinRole } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Supervisors and Administrators can inspect audit logs
  if (!hasMinRole(session, "Supervisor")) {
    return NextResponse.json(
      { error: "Forbidden: Supervisor or Administrator privilege required to view audit logs." },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;
  const search    = searchParams.get("search") || "";
  const action    = searchParams.get("action") || "";
  const tableName = searchParams.get("tableName") || "";
  const dateFrom  = searchParams.get("from") || "";
  const dateTo    = searchParams.get("to") || "";
  const page      = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit     = Math.max(1, parseInt(searchParams.get("limit") || "30"));
  const offset    = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push(
      `(user_name LIKE ? OR action LIKE ? OR table_name LIKE ? OR ip_address LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (action && action !== "all") {
    conditions.push(`action = ?`);
    params.push(action);
  }
  if (tableName && tableName !== "all") {
    conditions.push(`table_name = ?`);
    params.push(tableName);
  }
  if (dateFrom) {
    conditions.push(`DATE(created_at) >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`DATE(created_at) <= ?`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    id: number;
    user_id: number | null;
    user_name: string | null;
    action: string;
    table_name: string | null;
    record_id: number | null;
    old_values: unknown;
    new_values: unknown;
    ip_address: string | null;
    user_agent: string | null;
    created_at: string;
  }>(
    `SELECT *
     FROM audit_log
     ${where}
     ORDER BY id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const countRow = await queryOne<{ total: number }>(
    `SELECT COUNT(*) AS total FROM audit_log ${where}`,
    params
  );

  // Collect distinct action types & table names for filter dropdowns
  const distinctActions = await query<{ action: string }>(
    `SELECT DISTINCT action FROM audit_log ORDER BY action ASC`
  );
  const distinctTables = await query<{ table_name: string }>(
    `SELECT DISTINCT table_name FROM audit_log WHERE table_name IS NOT NULL ORDER BY table_name ASC`
  );

  return NextResponse.json(
    {
      data: rows,
      total: Number(countRow?.total ?? 0),
      actions: distinctActions.map((a) => a.action),
      tables: distinctTables.map((t) => t.table_name),
      page,
      limit,
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

