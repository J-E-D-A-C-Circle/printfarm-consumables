import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT 
       cat.id, 
       cat.name, 
       cat.code_prefix, 
       cat.purpose, 
       cat.is_active,
       COALESCE(r.request_count, 0) AS item_count,
       COALESCE(r.request_count, 0) AS request_count,
       COALESCE(r.total_requested, 0) AS total_requested,
       COALESCE(r.total_issued, 0) AS total_issued,
       COALESCE(r.total_consumption, 0) AS total_consumption,
       COALESCE(s.total_stock_added, 0) AS total_stock_added,
       (COALESCE(s.total_stock_added, 0) - COALESCE(r.total_issued, 0)) AS available_stock
     FROM categories cat
     LEFT JOIN (
       SELECT 
         consumable_name,
         COUNT(*) AS request_count,
         COALESCE(SUM(quantity_requested), 0) AS total_requested,
         COALESCE(SUM(COALESCE(quantity_issued, 0)), 0) AS total_issued,
         COALESCE(SUM(COALESCE(total_consumption, 0)), 0) AS total_consumption
       FROM consumable_requests
       GROUP BY consumable_name
     ) r ON LOWER(r.consumable_name) = LOWER(cat.name)
     LEFT JOIN (
       SELECT
         consumable_name,
         COALESCE(SUM(quantity_added), 0) AS total_stock_added
       FROM consumable_stocks
       GROUP BY consumable_name
     ) s ON LOWER(s.consumable_name) = LOWER(cat.name)
     WHERE cat.is_active = 1 
     ORDER BY
       CASE LOWER(cat.name)
         WHEN 'holo patch' THEN 1
         WHEN 'color ribbon' THEN 2
         WHEN 'mcc660 holo patch' THEN 3
         WHEN 'mcc660 clear' THEN 4
         WHEN 'black' THEN 5
         ELSE 6
       END,
       cat.name ASC`
  );

  return NextResponse.json(
    { data: rows },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor", "Store Officer", "Station Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, code_prefix, purpose } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Consumable type name is required." }, { status: 400 });
  }

  const trimmed = name.trim();
  const prefix = code_prefix ? code_prefix.trim().toUpperCase() : trimmed.slice(0, 4).toUpperCase();

  // Check if category already exists (active or inactive)
  const existing = await queryOne<{ id: number; is_active: number }>(
    `SELECT id, is_active FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1`,
    [trimmed]
  );

  if (existing) {
    if (existing.is_active === 1) {
      return NextResponse.json({ error: `Consumable type "${trimmed}" already exists.` }, { status: 409 });
    }
    // Reactivate soft-deleted category
    await execute(
      `UPDATE categories SET is_active = 1, name = ?, code_prefix = ?, purpose = ? WHERE id = ?`,
      [trimmed, prefix, purpose || "printing", existing.id]
    );
    return NextResponse.json({ id: existing.id, name: trimmed }, { status: 201 });
  }

  const result = await execute(
    `INSERT INTO categories (name, code_prefix, purpose, is_active) VALUES (?, ?, ?, 1)`,
    [trimmed, prefix, purpose || "printing"]
  );
  return NextResponse.json({ id: result.insertId, name: trimmed }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor", "Store Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");
  const queryName = url.searchParams.get("name");

  let body: { id?: number; name?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = body.id || (queryId ? Number(queryId) : undefined);
  const name = body.name || queryName;

  if (!id && !name) {
    return NextResponse.json({ error: "Consumable type ID or name is required." }, { status: 400 });
  }

  const targetCategory = await queryOne<{ id: number; name: string }>(
    `SELECT id, name FROM categories WHERE (id = ? OR LOWER(name) = LOWER(?)) AND is_active = 1`,
    [id || 0, name || ""]
  );

  if (!targetCategory) {
    return NextResponse.json({ success: true, message: "Consumable type removed." });
  }

  await execute(`UPDATE categories SET is_active = 0 WHERE id = ?`, [targetCategory.id]);

  return NextResponse.json({
    success: true,
    message: `Consumable type "${targetCategory.name}" removed successfully.`,
  });
}
