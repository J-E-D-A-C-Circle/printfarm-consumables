import { NextRequest, NextResponse } from "next/server";
import { query, execute } from "@/lib/db";
import { getSessionFromRequest } from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";
import { hashPassword } from "@/lib/passwords";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET /api/users ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search") || "";
  const role   = searchParams.get("role") || "";
  const status = searchParams.get("status") || "";

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push("(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (role)   { conditions.push("u.role = ?");   params.push(role); }
  if (status) { conditions.push("u.status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT u.id, u.employee_id, u.first_name, u.last_name, u.email, u.phone,
            u.role, u.status, u.must_change_password, u.last_login_at, u.created_at
     FROM users u
     ${where}
     ORDER BY u.first_name, u.last_name`,
    params
  );

  return NextResponse.json({ data: rows });
}

// ── POST /api/users ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session || session.role !== "Administrator") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { first_name, last_name, email, phone, password, role, employee_id } = body;

  if (!first_name || !last_name || !email || !password || !role) {
    return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  const hash = await hashPassword(password);

  const result = await execute(
    `INSERT INTO users (employee_id, first_name, last_name, email, phone, password_hash, role, must_change_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [employee_id || null, first_name, last_name, email, phone || null, hash, role]
  );

  await logAudit({
    userId: session.id, userName: session.name,
    action: "CREATE_USER", tableName: "users",
    recordId: result.insertId,
    newValues: { email, role },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({ id: result.insertId }, { status: 201 });
}
