import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dvla-fallback-secret-change-in-production"
);
export const COOKIE_NAME = "dvla_session";
const EXPIRES_IN = "8h";

export type UserRole =
  | "Administrator"
  | "Supervisor"
  | "Store Officer"
  | "Station Officer"
  | "Viewer";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  stationId: number | null;
  stationName: string | null;
  departmentId: number | null;
  mustChangePassword: boolean;
}

// ─── Create session (sign JWT + set cookie) ─────────────────────────────────
export async function createSession(user: SessionUser): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(EXPIRES_IN)
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  const isSecure = process.env.COOKIE_SECURE === "true";
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });
}

// ─── Read session from Server Component / Server Action ─────────────────────
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Read session from Route Handler / Proxy ────────────────────────────────
export async function getSessionFromRequest(
  req: NextRequest
): Promise<SessionUser | null> {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

// ─── Destroy session (logout) ────────────────────────────────────────────────
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// ─── Internal: verify + decode JWT ──────────────────────────────────────────
async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as SessionUser;
  } catch {
    return null;
  }
}

// ─── Role hierarchy & RBAC Permission Helpers ───────────────────────────────
export const ROLES: Record<UserRole, number> = {
  Administrator: 5,
  Supervisor: 4,
  "Store Officer": 3,
  "Station Officer": 2,
  Viewer: 1,
};

export function hasMinRole(
  user: SessionUser | null | undefined,
  minRole: UserRole
): boolean {
  if (!user || !user.role) return false;
  return (ROLES[user.role] || 0) >= ROLES[minRole];
}

export function canManageUsers(role?: string | null): boolean {
  return role === "Administrator";
}

export function canManageTypes(role?: string | null): boolean {
  return (
    role === "Administrator" ||
    role === "Supervisor" ||
    role === "Store Officer"
  );
}

export function canCreateRequest(role?: string | null): boolean {
  return Boolean(role && role !== "Viewer");
}

export function canIssueConsumable(role?: string | null): boolean {
  return (
    role === "Administrator" ||
    role === "Supervisor" ||
    role === "Store Officer"
  );
}

export function canRecordConsumption(role?: string | null): boolean {
  return Boolean(role && role !== "Viewer");
}

export function canEditRow(role?: string | null): boolean {
  return (
    role === "Administrator" ||
    role === "Supervisor" ||
    role === "Store Officer"
  );
}

export function canDeleteRow(role?: string | null): boolean {
  return role === "Administrator" || role === "Supervisor";
}
