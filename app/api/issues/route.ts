import { NextRequest, NextResponse } from "next/server";
import { query, execute, queryOne } from "@/lib/db";
import {
  getSessionFromRequest,
  canCreateRequest,
  canIssueConsumable,
  canRecordConsumption,
  canEditRow,
  canDeleteRow,
} from "@/lib/auth";
import { logAudit, getClientIp } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ── GET /api/issues (Consumables Return Sheet Records) ────────────────────────
export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const search   = searchParams.get("search") || "";
  const dateFrom = searchParams.get("from") || "";
  const dateTo   = searchParams.get("to") || "";
  const category = searchParams.get("category") || "";
  const status   = searchParams.get("status") || "";
  const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
  const limit    = Math.max(1, parseInt(searchParams.get("limit") || "100"));
  const offset   = (page - 1) * limit;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    conditions.push(
      `(r.consumable_name LIKE ? OR r.reference_number LIKE ? OR r.requested_by LIKE ? OR r.issued_by LIKE ? OR r.received_by LIKE ?)`
    );
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (dateFrom) {
    conditions.push(`r.date_requested >= ?`);
    params.push(dateFrom);
  }
  if (dateTo) {
    conditions.push(`r.date_requested <= ?`);
    params.push(dateTo);
  }
  if (category && category !== "all") {
    conditions.push(`LOWER(r.consumable_name) = LOWER(?)`);
    params.push(category);
  }
  if (status && status !== "all") {
    conditions.push(`r.status = ?`);
    params.push(status);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query(
    `SELECT 
       r.*,
       r.consumable_name AS category,
       r.consumable_name AS item_name,
       r.quantity_requested AS expected_quantity,
       COALESCE(r.quantity_issued, 0) AS quantity,
       r.date_requested AS date_issued,
       r.received_by AS receiving_officer
     FROM consumable_requests r
     ${where}
     ORDER BY r.id ASC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [countRow] = await query<{
    total: number;
    pending_issue: number;
    issued_pending_return: number;
    completed: number;
    total_requested_qty: number;
    total_issued_qty: number;
    total_consumption: number;
  }>(
    `SELECT 
       COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN r.status = 'Pending Issue' THEN 1 ELSE 0 END), 0) AS pending_issue,
       COALESCE(SUM(CASE WHEN r.status = 'Issued' THEN 1 ELSE 0 END), 0) AS issued_pending_return,
       COALESCE(SUM(CASE WHEN r.status = 'Completed' THEN 1 ELSE 0 END), 0) AS completed,
       COALESCE(SUM(r.quantity_requested), 0) AS total_requested_qty,
       COALESCE(SUM(COALESCE(r.quantity_issued, 0)), 0) AS total_issued_qty,
       COALESCE(SUM(COALESCE(r.total_consumption, 0)), 0) AS total_consumption
     FROM consumable_requests r
     ${where}`,
    params
  );

  return NextResponse.json(
    {
      data: rows,
      total: Number(countRow?.total ?? 0),
      summary: {
        total_requests: Number(countRow?.total ?? 0),
        pending_issue: Number(countRow?.pending_issue ?? 0),
        issued_pending_return: Number(countRow?.issued_pending_return ?? 0),
        completed: Number(countRow?.completed ?? 0),
        total_requested_qty: Number(countRow?.total_requested_qty ?? 0),
        total_issued_qty: Number(countRow?.total_issued_qty ?? 0),
        total_consumption: Number(countRow?.total_consumption ?? 0),
      },
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

// ── POST /api/issues (Create Request / Issue / Full Return Sheet Record) ──────
export async function POST(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canCreateRequest(session.role)) {
    return NextResponse.json(
      { error: "Your role (Viewer) does not have permission to create consumable requests." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    reference_number,
    date_requested,
    date_issued,
    category_id,
    consumable_name,
    category,
    quantity_requested,
    quantity_issued,
    quantity,
    issued_by,
    requested_by,
    received_by,
    receiving_officer,
    date_returned,
    total_consumption,
    remarks,
  } = body;

  const reqDate = date_requested || date_issued || new Date().toISOString().split("T")[0];
  const reqQty = Number(quantity_requested ?? quantity ?? 0);

  if (reqQty < 0 || Number.isNaN(reqQty)) {
    return NextResponse.json(
      { error: "Quantity requested cannot be negative." },
      { status: 400 }
    );
  }

  // Resolve consumable type name & category_id
  let resolvedCatId: number | null = category_id ? Number(category_id) : null;
  let resolvedName: string = (consumable_name || category || "").trim();

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

  const requester = (requested_by || session.name || "DVLA Officer").trim();
  const hasIssuedQty =
    quantity_issued !== undefined && quantity_issued !== null && String(quantity_issued).trim() !== "";
  const parsedIssuedQty = hasIssuedQty ? Number(quantity_issued) : null;

  const hasConsumption =
    total_consumption !== undefined && total_consumption !== null && String(total_consumption).trim() !== "";
  const parsedConsumption = hasConsumption ? Number(total_consumption) : null;

  // Determine workflow status
  let status: "Pending Issue" | "Issued" | "Completed" = "Pending Issue";
  let finalIssuedQty = parsedIssuedQty;

  if (parsedConsumption !== null && !Number.isNaN(parsedConsumption)) {
    status = "Completed";
    // If completed directly, default issued qty to requested qty if not explicitly set
    if (finalIssuedQty === null || Number.isNaN(finalIssuedQty)) {
      finalIssuedQty = reqQty;
    }
  } else if (finalIssuedQty !== null && !Number.isNaN(finalIssuedQty)) {
    status = "Issued";
  }

  if (status !== "Pending Issue" && !canIssueConsumable(session.role)) {
    return NextResponse.json(
      { error: "Only Store Officers (Issuers), Supervisors, or Administrators can issue quantities directly." },
      { status: 403 }
    );
  }

  const finalIssuedBy =
    status !== "Pending Issue"
      ? (issued_by || session.name || "MR. RICHARD ANAFO").trim()
      : issued_by
      ? String(issued_by).trim()
      : null;

  const finalReceivedBy =
    (received_by || receiving_officer || "").trim() || null;

  const finalDateReturned =
    status === "Completed"
      ? date_returned || reqDate
      : date_returned || null;

  const refNum =
    (reference_number || "").trim() ||
    `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const result = await execute(
    `INSERT INTO consumable_requests
       (reference_number, date_requested, category_id, consumable_name,
        quantity_requested, quantity_issued, issued_by, requested_by,
        received_by, date_returned, total_consumption, status, remarks, created_by, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      refNum,
      reqDate,
      resolvedCatId,
      resolvedName,
      reqQty,
      finalIssuedQty,
      finalIssuedBy,
      requester,
      finalReceivedBy,
      finalDateReturned,
      parsedConsumption,
      status,
      remarks ? String(remarks).trim() : null,
      session.id,
      session.id,
    ]
  );

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "CREATE_CONSUMABLE_REQUEST",
    tableName: "consumable_requests",
    recordId: result.insertId,
    newValues: {
      reference_number: refNum,
      consumable_name: resolvedName,
      quantity_requested: reqQty,
      quantity_issued: finalIssuedQty,
      total_consumption: parsedConsumption,
      status,
    },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json(
    {
      id: result.insertId,
      reference_number: refNum,
      status,
    },
    { status: 201 }
  );
}

// ── PUT /api/issues (Issue Consumable, Record Consumption Return, or Edit) ────
export async function PUT(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const {
    id,
    action, // "issue" | "return" | "edit"
    date_requested,
    category_id,
    consumable_name,
    quantity_requested,
    quantity_issued,
    issued_by,
    requested_by,
    received_by,
    date_returned,
    total_consumption,
    remarks,
  } = body;

  if (!id) {
    return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
  }

  const existing = await queryOne<{
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
  }>(`SELECT * FROM consumable_requests WHERE id = ?`, [Number(id)]);

  if (!existing) {
    return NextResponse.json({ error: "Consumable request record not found." }, { status: 404 });
  }

  // Stage 2: Issue Consumable (Exact, More, or Less than Requested)
  if (action === "issue") {
    if (!canIssueConsumable(session.role)) {
      return NextResponse.json(
        { error: "Only Store Officers (Issuers), Supervisors, or Administrators can issue consumables." },
        { status: 403 }
      );
    }
    const parsedIssued =
      quantity_issued !== undefined && quantity_issued !== null && String(quantity_issued).trim() !== ""
        ? Number(quantity_issued)
        : existing.quantity_requested;

    if (parsedIssued < 0 || Number.isNaN(parsedIssued)) {
      return NextResponse.json({ error: "Please enter a valid quantity issued." }, { status: 400 });
    }

    const issuer = (issued_by || existing.issued_by || session.name || "MR. RICHARD ANAFO").trim();
    const receiver = (received_by || existing.received_by || "").trim() || null;
    const nextStatus = existing.total_consumption !== null ? "Completed" : "Issued";

    await execute(
      `UPDATE consumable_requests
       SET quantity_issued = ?,
           issued_by = ?,
           received_by = ?,
           status = ?,
           remarks = COALESCE(?, remarks),
           updated_by = ?
       WHERE id = ?`,
      [parsedIssued, issuer, receiver, nextStatus, remarks ?? null, session.id, existing.id]
    );

    return NextResponse.json({
      success: true,
      id: existing.id,
      status: nextStatus,
      quantity_issued: parsedIssued,
    });
  }

  // Stage 3: Record Production Result (Date Returned & Total Consumption / Work Done)
  if (action === "return" || action === "reconcile") {
    if (!canRecordConsumption(session.role)) {
      return NextResponse.json(
        { error: "Your role does not have permission to record consumption outcomes." },
        { status: 403 }
      );
    }
    const parsedConsumption =
      total_consumption !== undefined && total_consumption !== null && String(total_consumption).trim() !== ""
        ? Number(total_consumption)
        : null;

    if (parsedConsumption === null || parsedConsumption < 0 || Number.isNaN(parsedConsumption)) {
      return NextResponse.json(
        { error: "Please enter a valid Total Consumption (work done outcome)." },
        { status: 400 }
      );
    }

    const finalIssued =
      quantity_issued !== undefined && quantity_issued !== null && String(quantity_issued).trim() !== ""
        ? Number(quantity_issued)
        : existing.quantity_issued ?? existing.quantity_requested;

    const finalIssuedBy = (issued_by || existing.issued_by || session.name || "MR. RICHARD ANAFO").trim();
    const finalReceivedBy = (received_by || existing.received_by || "").trim() || null;
    const finalDateReturned = date_returned || existing.date_returned || new Date().toISOString().split("T")[0];

    await execute(
      `UPDATE consumable_requests
       SET quantity_issued = ?,
           issued_by = ?,
           received_by = ?,
           date_returned = ?,
           total_consumption = ?,
           status = 'Completed',
           remarks = COALESCE(?, remarks),
           updated_by = ?
       WHERE id = ?`,
      [
        finalIssued,
        finalIssuedBy,
        finalReceivedBy,
        finalDateReturned,
        parsedConsumption,
        remarks ?? null,
        session.id,
        existing.id,
      ]
    );

    return NextResponse.json({
      success: true,
      id: existing.id,
      status: "Completed",
      total_consumption: parsedConsumption,
      date_returned: finalDateReturned,
    });
  }

  // Full Edit of any field on the record
  if (!canEditRow(session.role)) {
    return NextResponse.json(
      { error: "Only Store Officers, Supervisors, or Administrators can edit full return sheet records." },
      { status: 403 }
    );
  }
  let resolvedCatId = category_id !== undefined ? (category_id ? Number(category_id) : null) : existing.category_id;
  let resolvedName = consumable_name !== undefined ? String(consumable_name).trim() : existing.consumable_name;

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

  const nextReqDate = date_requested || existing.date_requested;
  const nextReqQty =
    quantity_requested !== undefined && quantity_requested !== null
      ? Number(quantity_requested)
      : existing.quantity_requested;

  const hasIssuedInput = quantity_issued !== undefined;
  const nextIssuedQty = hasIssuedInput
    ? quantity_issued === null || String(quantity_issued).trim() === ""
      ? null
      : Number(quantity_issued)
    : existing.quantity_issued;

  const hasConsInput = total_consumption !== undefined;
  const nextConsumption = hasConsInput
    ? total_consumption === null || String(total_consumption).trim() === ""
      ? null
      : Number(total_consumption)
    : existing.total_consumption;

  const nextDateReturned =
    date_returned !== undefined
      ? date_returned && String(date_returned).trim() !== ""
        ? String(date_returned).trim()
        : null
      : existing.date_returned;

  const nextRequestedBy =
    requested_by !== undefined && String(requested_by).trim()
      ? String(requested_by).trim()
      : existing.requested_by;

  const nextIssuedBy =
    issued_by !== undefined
      ? String(issued_by).trim() || null
      : existing.issued_by;

  const nextReceivedBy =
    received_by !== undefined
      ? String(received_by).trim() || null
      : existing.received_by;

  const nextRemarks =
    remarks !== undefined ? (String(remarks).trim() || null) : existing.remarks;

  let nextStatus: "Pending Issue" | "Issued" | "Completed" = "Pending Issue";
  if (nextConsumption !== null && !Number.isNaN(nextConsumption)) {
    nextStatus = "Completed";
  } else if (nextIssuedQty !== null && !Number.isNaN(nextIssuedQty)) {
    nextStatus = "Issued";
  }

  await execute(
    `UPDATE consumable_requests
     SET date_requested = ?,
         category_id = ?,
         consumable_name = ?,
         quantity_requested = ?,
         quantity_issued = ?,
         issued_by = ?,
         requested_by = ?,
         received_by = ?,
         date_returned = ?,
         total_consumption = ?,
         status = ?,
         remarks = ?,
         updated_by = ?
     WHERE id = ?`,
    [
      nextReqDate,
      resolvedCatId,
      resolvedName,
      nextReqQty,
      nextIssuedQty,
      nextIssuedBy,
      nextRequestedBy,
      nextReceivedBy,
      nextDateReturned,
      nextConsumption,
      nextStatus,
      nextRemarks,
      session.id,
      existing.id,
    ]
  );

  return NextResponse.json({
    success: true,
    id: existing.id,
    status: nextStatus,
  });
}

// ── DELETE /api/issues ────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canDeleteRow(session.role)) {
    return NextResponse.json(
      { error: "Only Supervisors or Administrators can delete return sheet records." },
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
    return NextResponse.json({ error: "Record ID is required." }, { status: 400 });
  }

  const recId = Number(id);
  const existing = await queryOne<{ id: number; reference_number: string; consumable_name: string }>(
    `SELECT id, reference_number, consumable_name FROM consumable_requests WHERE id = ?`,
    [recId]
  );

  if (!existing) {
    return NextResponse.json({ error: "Record not found." }, { status: 404 });
  }

  await execute(`DELETE FROM consumable_requests WHERE id = ?`, [recId]);

  await logAudit({
    userId: session.id,
    userName: session.name,
    action: "DELETE_CONSUMABLE_REQUEST",
    tableName: "consumable_requests",
    recordId: recId,
    oldValues: existing,
    newValues: { deleted: true },
    ipAddress: getClientIp(req.headers),
  });

  return NextResponse.json({
    success: true,
    message: `Record #${existing.reference_number} (${existing.consumable_name}) deleted successfully.`,
  });
}
