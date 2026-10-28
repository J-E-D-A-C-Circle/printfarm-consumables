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
       COALESCE(c.item_count, 0) AS item_count
     FROM categories cat
     LEFT JOIN (
       SELECT category_id, COUNT(*) AS item_count 
       FROM consumables 
       WHERE is_active = 1 
       GROUP BY category_id
     ) c ON c.category_id = cat.id
     WHERE cat.is_active = 1 
     ORDER BY cat.name`
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
  if (!session || !["Administrator", "Supervisor", "Store Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, code_prefix, purpose } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });

  // Check if active category already exists
  const existing = await queryOne<{ id: number }>(
    `SELECT id FROM categories WHERE name = ? AND is_active = 1`,
    [name.trim()]
  );
  if (existing) {
    return NextResponse.json({ error: `Category "${name.trim()}" already exists.` }, { status: 409 });
  }

  const result = await execute(
    `INSERT INTO categories (name, code_prefix, purpose) VALUES (?,?,?)`,
    [name.trim(), code_prefix ? code_prefix.trim() : name.trim().slice(0, 3).toUpperCase(), purpose || "standard"]
  );
  return NextResponse.json({ id: result.insertId, name: name.trim() }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor", "Store Officer"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Support both body payload and URL search parameters
  const url = new URL(req.url);
  const queryId = url.searchParams.get("id");
  const queryName = url.searchParams.get("name");
  const queryForce = url.searchParams.get("force") === "true";

  let body: { id?: number; name?: string; force?: boolean } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const id = body.id || (queryId ? Number(queryId) : undefined);
  const name = body.name || queryName;
  const force = Boolean(body.force || queryForce);

  if (!id && !name) {
    return NextResponse.json({ error: "Category ID or name is required." }, { status: 400 });
  }

  // Find target category
  const targetCategory = await queryOne<{ id: number; name: string }>(
    `SELECT id, name FROM categories WHERE (id = ? OR name = ?) AND is_active = 1`,
    [id || 0, name || ""]
  );

  if (!targetCategory) {
    return NextResponse.json({ success: true, message: "Category removed." });
  }

  // Check active items linked to this category
  const activeItems = await query<{ id: number; name: string; item_code: string }>(
    `SELECT id, name, item_code FROM consumables WHERE category_id = ? AND is_active = 1`,
    [targetCategory.id]
  );

  if (activeItems.length > 0 && !force) {
    const itemNames = activeItems.map((i) => `"${i.name}" (${i.item_code})`).join(", ");
    return NextResponse.json({
      error: `Cannot delete "${targetCategory.name}" — ${activeItems.length} active item(s) linked: ${itemNames}. Would you like to archive these items and proceed?`,
      linkedCount: activeItems.length,
      linkedItems: activeItems,
    }, { status: 409 });
  }

  // If force is enabled, archive active consumables linked to this category
  if (activeItems.length > 0 && force) {
    await execute(`UPDATE consumables SET is_active = 0 WHERE category_id = ?`, [targetCategory.id]);
  }

  // Soft delete category
  await execute(`UPDATE categories SET is_active = 0 WHERE id = ?`, [targetCategory.id]);

  // Note: We do not set category_id = NULL on consumables because category_id is NOT NULL in database schema.
  // The category row still exists with is_active = 0, so existing foreign keys remain valid.

  return NextResponse.json({
    success: true,
    message: `Category "${targetCategory.name}" deleted successfully.`
  });
}
