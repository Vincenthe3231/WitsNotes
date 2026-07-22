import { witslogNextIngest } from "@all-wits/witslog/frameworks/next";

// Server-side ingest endpoint for client-side error capture: raw
// window.onerror/unhandledrejection (lib/witslog-browser.ts) AND
// frameworks/react-query.js's attachWitslog() mutation/query failures
// (wired in app/providers.tsx), both funneled through the same
// WitslogBrowser.init(...) reporter instance.
//
// witslogNextIngest — not witslogBrowserIngest — because this is a Next.js
// Route Handler (Web Request/Response API), and Express's raw req/res
// middleware shape doesn't fit that; see bindings/CONTRACT.md.
//
// NOT named __witslog: Next.js's App Router treats any path segment
// starting with `_` as a private folder, excluded from routing entirely
// (https://nextjs.org/docs/app/getting-started/project-structure#private-folders)
// — app/api/__witslog/route.ts silently never registered a route at all,
// which is why every POST here 404'd. Regular non-underscore names route fine.
//
// allowedOrigins is the real defense here (see the guardrail rationale in
// witslog's frameworks/express.js). Hardcoding "http://localhost:3000" broke
// ingest silently (403, swallowed by the browser reporter's best-effort
// fetch) the moment the app ran on a different port/origin — read from env
// instead, comma-separated for multiple origins, falling back to the
// localhost:3000 dev default when unset.
const allowedOrigins = (process.env.NEXT_PUBLIC_APP_ORIGIN ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const handler = witslogNextIngest({
  application: "witsnote-client",
  allowedOrigins,
});

export { handler as POST };
