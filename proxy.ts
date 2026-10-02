import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionFromRequest, hasMinRole } from "@/lib/auth";

// Routes that don't require authentication
const PUBLIC_ROUTES = ["/login"];

// Routes restricted to Administrator role only
const ADMIN_ONLY = ["/settings", "/audit", "/api/users"];

// Routes restricted to Supervisor+ (Supervisor or Administrator)
const SUPERVISOR_PLUS = ["/api/issues/authorize", "/api/adjustments"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes and Next.js internals
  if (
    PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/uploads")
  ) {
    return NextResponse.next();
  }

  // Verify session
  const session = await getSessionFromRequest(request);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes
  if (ADMIN_ONLY.some((r) => pathname.startsWith(r))) {
    if (!hasMinRole(session, "Administrator")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Supervisor+ routes
  if (SUPERVISOR_PLUS.some((r) => pathname.startsWith(r))) {
    if (!hasMinRole(session, "Supervisor")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Pass session user info as headers to API routes
  const response = NextResponse.next();
  response.headers.set("x-user-id", String(session.id));
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-user-name", session.name);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
