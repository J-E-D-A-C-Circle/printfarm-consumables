import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await query(
    `SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name ASC`
  );
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || !["Administrator", "Supervisor"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });

  const result = await execute(`INSERT INTO departments (name) VALUES (?)`, [name]);
  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
