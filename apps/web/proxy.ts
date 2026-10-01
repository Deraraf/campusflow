import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Dashboard routes require an authenticated session cookie.
// Auth routes (login, register, verify-email) redirect already-authenticated
// users away from those pages and back to the dashboard.
const DASHBOARD_PREFIX = "/dashboard";
const AUTH_PATHS = new Set([
  "/login",
  "/register",
  "/verify-email",
  "/resend-verification",
  "/forgot-password",
  "/reset-password",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = request.cookies.has("access_token");

  // Guard dashboard: no cookie → redirect to /login
  if (pathname.startsWith(DASHBOARD_PREFIX) && !hasCookie) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Guard auth pages: already has cookie → redirect to /dashboard
  if (AUTH_PATHS.has(pathname) && hasCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on dashboard and auth pages; skip API routes, static assets, images
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/verify-email",
    "/resend-verification",
    "/forgot-password",
    "/reset-password",
  ],
};
