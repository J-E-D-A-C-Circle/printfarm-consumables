import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const activeOnly = req.nextUrl.searchParams.get("all") !== "true";
  const rows = await query(
    `SELECT id, name, region, address, contact_phone, is_head_office, is_active
     FROM stations ${activeOnly ? "WHERE is_active = 1" : ""}
     ORDER BY is_head_office DESC, name ASC`
  );
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name, region, address, contact_phone, is_head_office } = await req.json();
  if (!name) return NextResponse.json({ error: "Name required." }, { status: 400 });

  const result = await execute(
    `INSERT INTO stations (name, region, address, contact_phone, is_head_office) VALUES (?,?,?,?,?)`,
    [name, region || "", address || null, contact_phone || null, is_head_office ? 1 : 0]
  );
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id, name, region, address, contact_phone, is_active } = await req.json();
  await execute(
    `UPDATE stations SET name=?, region=?, address=?, contact_phone=?, is_active=? WHERE id=?`,
    [name, region || "", address || null, contact_phone || null, is_active ? 1 : 0, id]
  );
  return NextResponse.json({ success: true });
}
