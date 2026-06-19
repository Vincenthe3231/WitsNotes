import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = ["/auth/login", "/auth/register"];
const COOKIE_NAME = "wn_sid";

export function proxy(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  // API proxy routes bypass the guard entirely
  if (pathname.startsWith("/api/")) return NextResponse.next();

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const hasSession = Boolean(request.cookies.get(COOKIE_NAME)?.value);

  // Unauthenticated → private route: redirect to login
  if (!isPublic && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated → auth page: redirect to home
  if (isPublic && hasSession) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.searchParams.delete("from");
    return NextResponse.redirect(homeUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons).*)",
  ],
};
