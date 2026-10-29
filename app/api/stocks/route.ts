import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import {
  getSessionFromRequest,
  canCreateRequest,
  canEditRow,
  canDeleteRow,
} from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET /api/stocks (Consumable Stocks & Per-Type Available Balances) ────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit    = Math.max(1, parseInt(searchParams.get("limit") || "20"));
  const offset   = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push(
      `(s.consumable_name LIKE ? OR s.reference_number LIKE ? OR s.batch_number LIKE ? OR s.supplier LIKE ? OR s.received_by LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (category && category !== "all") {
    conditions.push(`LOWER(s.consumable_name) = LOWER(?)`);
    params.push(category);
  }
  if (dateFrom) {
    conditions.push(`s.date_received >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`s.date_received <= ?`);
    params.push(dateTo);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<{
    id: number;
    reference_number: string;
    date_received: string;
    category_id: number | null;
    consumable_name: string;
    quantity_added: number;
    supplier: string | null;
    batch_number: string | null;
    received_by: string;
    remarks: string | null;
    created_at: string;
  }>(
    `SELECT s.*
     FROM consumable_stocks s
     ${where}
     ORDER BY s.date_received DESC, s.id DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const countRow = await queryOne<{
    total_entries: number;
    total_stock_added: number;
  }>(
    `SELECT
       COUNT(*) AS total_entries,
       COALESCE(SUM(quantity_added), 0) AS total_stock_added
     FROM consumable_stocks s
     ${where}`,
    params
  );

  // Per-Consumable-Type stock balance (Stock Added vs Qty Issued from Return Sheet)
  const balances = await query<{
    id: number;
    name: string;
    code_prefix: string;
    receipt_count: number;
    total_stock_added: number;
    total_issued: number;
    available_stock: number;
  }>(
    `SELECT
       cat.id,
       cat.name,
       cat.code_prefix,
       COALESCE(stk.receipt_count, 0) AS receipt_count,
       COALESCE(stk.total_added, 0) AS total_stock_added,
       COALESCE(req.total_issued, 0) AS total_issued,
       (COALESCE(stk.total_added, 0) - COALESCE(req.total_issued, 0)) AS available_stock
     FROM categories cat
     LEFT JOIN (
       SELECT
         consumable_name,
         COUNT(*) AS receipt_count,
         COALESCE(SUM(quantity_added), 0) AS total_added
       FROM consumable_stocks
       GROUP BY consumable_name
     ) stk ON LOWER(stk.consumable_name) = LOWER(cat.name)
     LEFT JOIN (
       SELECT
         consumable_name,
         COALESCE(SUM(COALESCE(quantity_issued, 0)), 0) AS total_issued
       FROM consumable_requests
       GROUP BY consumable_name
     ) req ON LOWER(req.consumable_name) = LOWER(cat.name)
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

  const overallAdded = balances.reduce((acc, b) => acc + Number(b.total_stock_added || 0), 0);
  const overallIssued = balances.reduce((acc, b) => acc + Number(b.total_issued || 0), 0);

  return NextResponse.json(
    {
      data: rows,
      total: Number(countRow?.total_entries ?? 0),
      summary: {
        total_entries: Number(countRow?.total_entries ?? 0),
        filtered_stock_added: Number(countRow?.total_stock_added ?? 0),
        overall_stock_added: overallAdded,
        overall_issued: overallIssued,
        overall_available: overallAdded - overallIssued,
      },
      balances,
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

// ── POST /api/stocks (Add Stock Batch for a Consumable Type) ─────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateRequest(session.role)) {
    return NextResponse.json(
      { error: "Your role (Viewer) does not have permission to add consumable stock." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    reference_number,
    date_received,
    category_id,
    consumable_name,
    quantity_added,
    supplier,
    batch_number,
    received_by,
    remarks,
  } = body;

  const recDate = date_received || new Date().toISOString().split("T")[0];
  const qtyAdded = Number(quantity_added ?? 0);

  if (qtyAdded <= 0 || Number.isNaN(qtyAdded)) {
    return NextResponse.json(
      { error: "Quantity added must be greater than zero." },
      { status: 400 }
    );
  }

  let resolvedCatId: number | null = category_id ? Number(category_id) : null;
  let resolvedName: string = (consumable_name || "").trim();

  if (resolvedCatId && !resolvedName) {
    const catRow = await queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM categories WHERE id = ?`,
      [resolvedCatId]
    );
    if (catRow) resolvedName = catRow.name;
  } else if (resolvedName && !resolvedCatId) {
    const catRow = await queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [resolvedName]
    );
    if (catRow) {
      resolvedCatId = catRow.id;
      resolvedName = catRow.name;
    }
  }

  if (!resolvedName) {
    return NextResponse.json(
      { error: "Please select a consumable type." },
      { status: 400 }
    );
  }

  const refNum =
    (reference_number || "").trim() ||
    `STK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const receiver = (received_by || session.name || "DVLA Store Officer").trim();

  const result = await execute(
    `INSERT INTO consumable_stocks
       (reference_number, date_received, category_id, consumable_name,
        quantity_added, supplier, batch_number, received_by, remarks, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      refNum,
      recDate,
      resolvedCatId,
      resolvedName,
      qtyAdded,
      supplier ? String(supplier).trim() : null,
      batch_number ? String(batch_number).trim() : null,
      receiver,
      remarks ? String(remarks).trim() : null,
      session.id,
      session.id,
    ]
  );

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "ADD_CONSUMABLE_STOCK",
    tableName: "consumable_stocks",
    recordId: result.insertId,
    newValues: {
      reference_number: refNum,
      consumable_name: resolvedName,
      quantity_added: qtyAdded,
      supplier,
      batch_number,
      received_by: receiver,
    },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    {
      id: result.insertId,
      reference_number: refNum,
      consumable_name: resolvedName,
      quantity_added: qtyAdded,
    },
    { status: 201 }
  );
}

// ── PUT /api/stocks (Edit Stock Entry) ───────────────────────────────────────
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canEditRow(session.role)) {
    return NextResponse.json(
      { error: "Only Store Officers, Supervisors, or Administrators can edit stock entries." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    id,
    date_received,
    consumable_name,
    quantity_added,
    supplier,
    batch_number,
    received_by,
    remarks,
  } = body;

  if (!id) {
    return NextResponse.json({ error: "Stock record ID is required." }, { status: 400 });
  }

  const existing = await queryOne<{
    id: number;
    date_received: string;
    category_id: number | null;
    consumable_name: string;
    quantity_added: number;
    supplier: string | null;
    batch_number: string | null;
    received_by: string;
    remarks: string | null;
  }>(`SELECT * FROM consumable_stocks WHERE id = ?`, [Number(id)]);

  if (!existing) {
    return NextResponse.json({ error: "Stock record not found." }, { status: 404 });
  }

  let resolvedName = consumable_name !== undefined ? String(consumable_name).trim() : existing.consumable_name;
  let resolvedCatId = existing.category_id;

  if (resolvedName && resolvedName.toLowerCase() !== existing.consumable_name.toLowerCase()) {
    const catRow = await queryOne<{ id: number; name: string }>(
      `SELECT id, name FROM categories WHERE LOWER(name) = LOWER(?) LIMIT 1`,
      [resolvedName]
    );
    if (catRow) {
      resolvedCatId = catRow.id;
      resolvedName = catRow.name;
    }
  }

  const nextQty =
    quantity_added !== undefined && quantity_added !== null
      ? Number(quantity_added)
      : existing.quantity_added;

  if (nextQty <= 0 || Number.isNaN(nextQty)) {
    return NextResponse.json({ error: "Quantity added must be greater than zero." }, { status: 400 });
  }

  await execute(
    `UPDATE consumable_stocks
     SET date_received = ?,
         category_id = ?,
         consumable_name = ?,
         quantity_added = ?,
         supplier = ?,
         batch_number = ?,
         received_by = ?,
         remarks = ?,
         updated_by = ?
     WHERE id = ?`,
    [
      date_received || existing.date_received,
      resolvedCatId,
      resolvedName,
      nextQty,
      supplier !== undefined ? (String(supplier).trim() || null) : existing.supplier,
      batch_number !== undefined ? (String(batch_number).trim() || null) : existing.batch_number,
      received_by !== undefined && String(received_by).trim() ? String(received_by).trim() : existing.received_by,
      remarks !== undefined ? (String(remarks).trim() || null) : existing.remarks,
      session.id,
      existing.id,
    ]
  );

  return NextResponse.json({ success: true, id: existing.id });
}

// ── DELETE /api/stocks ───────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteRow(session.role)) {
    return NextResponse.json(
      { error: "Only Supervisors or Administrators can delete stock records." },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;
  let id = searchParams.get("id");
  if (!id) {
    const body = await req.json().catch(() => ({}));
    id = body.id;
  }

  if (!id) {
    return NextResponse.json({ error: "Stock record ID is required." }, { status: 400 });
  }

  const recId = Number(id);
  const existing = await queryOne<{ id: number; reference_number: string; consumable_name: string }>(
    `SELECT id, reference_number, consumable_name FROM consumable_stocks WHERE id = ?`,
    [recId]
  );

  if (!existing) {
    return NextResponse.json({ error: "Stock record not found." }, { status: 404 });
  }

  await execute(`DELETE FROM consumable_stocks WHERE id = ?`, [recId]);

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE_CONSUMABLE_STOCK",
    tableName: "consumable_stocks",
    recordId: recId,
    oldValues: existing,
    newValues: { deleted: true },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    message: `Stock entry #${existing.reference_number} (${existing.consumable_name}) deleted.`,
  });
}

