import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Protected student and instructor routes require an authenticated session cookie.
// Auth routes redirect already-authenticated users away from those pages and back
// to the student dashboard.
const PROTECTED_PREFIXES = ["/student", "/instructer"];
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

  // Guard protected dashboard routes: no cookie → redirect to /login
  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !hasCookie) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the original destination so we can redirect back after login
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Guard auth pages: already has cookie → redirect to /student
  if (AUTH_PATHS.has(pathname) && hasCookie) {
    return NextResponse.redirect(new URL("/student", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Run on protected dashboard routes and auth pages; skip API routes, static assets, images
  matcher: [
    "/student/:path*",
    "/instructer/:path*",
    "/login",
    "/register",
    "/verify-email",
    "/resend-verification",
    "/forgot-password",
    "/reset-password",
  ],
};
