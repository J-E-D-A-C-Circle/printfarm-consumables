import { execute } from "./db";

interface AuditParams {
  userId?: number | null;
  userName?: string | null;
  action: string;
  tableName?: string;
  recordId?: number | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await execute(
      `INSERT INTO audit_log 
        (user_id, user_name, action, table_name, record_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        params.userId ?? null,
        params.userName ?? null,
        params.action,
        params.tableName ?? null,
        params.recordId ?? null,
        params.oldValues ? JSON.stringify(params.oldValues) : null,
        params.newValues ? JSON.stringify(params.newValues) : null,
        params.ipAddress ?? null,
        params.userAgent ?? null,
      ]
    );
  } catch (err) {
    // Never let audit logging break the main flow
    console.error("[audit] Failed to write audit log:", err);
  }
}

// Helper to extract IP from Next.js request headers
export function getClientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}
