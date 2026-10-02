import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT id, name, code_prefix, purpose, is_active FROM categories WHERE is_active = 1 ORDER BY name`
  );
  return NextResponse.json({ data: rows });
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

  const body = await req.json().catch(() => ({}));
  const id = body.id;
  const name = body.name;
  const force = Boolean(body.force);

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
      error: `Cannot delete "${targetCategory.name}" — ${activeItems.length} active item(s) linked: ${itemNames}. Please archive or reassign these items first.`
    }, { status: 409 });
  }

  // Soft delete category
  await execute(`UPDATE categories SET is_active = 0 WHERE id = ?`, [targetCategory.id]);

  // Unlink any archived consumables
  await execute(`UPDATE consumables SET category_id = NULL WHERE category_id = ?`, [targetCategory.id]);

  return NextResponse.json({ success: true, message: `Category "${targetCategory.name}" deleted.` });
}
