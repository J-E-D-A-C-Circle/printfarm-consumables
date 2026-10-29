import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, getSessionFromRequest, hasMinRole } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/logout", "/api/auth"];
const ADMIN_ONLY_PATHS = ["/settings", "/api/users"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/favicon.ico") {
    return NextResponse.rewrite(new URL("/oop.png", request.url));
  }

  // Allow static assets & Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/oop.png" ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".ico")
  ) {
    return NextResponse.next();
  }

  // Visiting /logout always clears the session cookie and renders the sign-out page
  if (pathname.startsWith("/logout")) {
    const res = NextResponse.next();
    res.cookies.delete(COOKIE_NAME);
    return res;
  }

  const session = await getSessionFromRequest(request);

  // If visiting /login while already signed in, redirect to Dashboard
  if (pathname.startsWith("/login")) {
    if (session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Allow public auth endpoints
  if (PUBLIC_PATHS.some((r) => pathname.startsWith(r))) {
    return NextResponse.next();
  }

  // Require authentication for all other routes
  if (!session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only routes (/settings and /api/users)
  if (ADMIN_ONLY_PATHS.some((r) => pathname.startsWith(r))) {
     if (!hasMinRole(session, "Administrator")) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json(
          { error: "Forbidden: Administrator role required." },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/?access=denied", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("x-user-id", String(session.id));
  response.headers.set("x-user-role", session.role);
  response.headers.set("x-user-name", session.name);

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
