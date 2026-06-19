import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const UPSTREAM = process.env.API_URL ?? "http://localhost:8000/api";

const SET_COOKIE_PATHS = ["/login", "/register"];
const CLEAR_COOKIE_PATH = "/logout";

const COOKIE_NAME = "wn_sid";
const COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30,
};

async function handler(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const apiPath = "/" + path.join("/");
  const upstreamUrl = UPSTREAM + apiPath + (request.nextUrl.search ?? "");

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete("host");
  forwardHeaders.set("Accept", "application/json");
  if (token) forwardHeaders.set("Authorization", `Bearer ${token}`);

  let body: BodyInit | null = null;
  if (!["GET", "HEAD"].includes(request.method)) {
    body = await request.arrayBuffer();
  }

  const upstream = await fetch(upstreamUrl, {
    method: request.method,
    headers: forwardHeaders,
    body,
    // @ts-expect-error Node fetch duplex
    duplex: "half",
  });

  const upstreamData = upstream.headers.get("content-type")?.includes("application/json")
    ? await upstream.json()
    : null;

  const responseHeaders = new Headers();
  for (const [k, v] of upstream.headers.entries()) {
    if (!["transfer-encoding", "connection", "set-cookie", "content-encoding"].includes(k.toLowerCase())) {
      responseHeaders.set(k, v);
    }
  }

  // Auth endpoints: intercept token, set httpOnly cookie, strip token from body
  if (upstream.ok && SET_COOKIE_PATHS.includes(apiPath) && upstreamData?.token) {
    const res = NextResponse.json(
      { user: upstreamData.user },
      { status: upstream.status, headers: responseHeaders }
    );
    res.cookies.set(COOKIE_NAME, upstreamData.token, COOKIE_OPTS);
    return res;
  }

  // 204/205: no body allowed — return raw response
  if (upstream.status === 204 || upstream.status === 205) {
    return new NextResponse(null, { status: upstream.status, headers: responseHeaders });
  }

  const res = NextResponse.json(upstreamData, { status: upstream.status, headers: responseHeaders });

  if (upstream.ok && apiPath === CLEAR_COOKIE_PATH) {
    res.cookies.set(COOKIE_NAME, "", { ...COOKIE_OPTS, maxAge: 0 });
  }

  return res;
}

export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE };
