import type { IncomingMessage, ServerResponse } from "node:http";

export interface DebugEvent {
  id: number;
  timestamp: string;
  hook: string;
  documentName?: string;
  userId?: string;
  role?: string;
  status: "ok" | "error";
  durationMs?: number;
  detail?: string;
}

const MAX_EVENTS = 200;
const events: DebugEvent[] = [];
let nextId = 1;

export function recordEvent(entry: Omit<DebugEvent, "id" | "timestamp">): void {
  const event: DebugEvent = {
    id: nextId++,
    timestamp: new Date().toISOString(),
    ...entry,
  };

  events.push(event);
  if (events.length > MAX_EVENTS) events.shift();

  const line = `[collab:debug] ${event.timestamp} ${event.hook} doc=${event.documentName ?? "-"} user=${event.userId ?? "-"} role=${event.role ?? "-"} status=${event.status}${event.durationMs !== undefined ? ` ${event.durationMs}ms` : ""}${event.detail ? ` — ${event.detail}` : ""}`;
  if (event.status === "error") {
    console.error(line);
  } else {
    console.log(line);
  }
}

function renderDashboardHtml(): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>witsnote-collab debug</title>
<style>
  body { font-family: ui-monospace, monospace; background: #0f1115; color: #d8dee9; margin: 0; padding: 16px; }
  h1 { font-size: 16px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid #232733; white-space: nowrap; }
  th { color: #8b93a7; font-weight: 600; }
  tr.error { color: #ff6b6b; }
  tr.ok { color: #d8dee9; }
  td.detail { white-space: normal; word-break: break-word; }
  #meta { color: #8b93a7; font-size: 11px; margin-bottom: 8px; }
</style>
</head>
<body>
<h1>witsnote-collab — debug inspector</h1>
<div id="meta">polling /__debug/events.json every 2s</div>
<table>
  <thead><tr><th>id</th><th>time</th><th>hook</th><th>document</th><th>user</th><th>role</th><th>status</th><th>duration</th><th>detail</th></tr></thead>
  <tbody id="rows"></tbody>
</table>
<script>
async function tick() {
  try {
    const res = await fetch('/__debug/events.json');
    const events = await res.json();
    const rows = events.slice().reverse().map(e => \`
      <tr class="\${e.status}">
        <td>\${e.id}</td>
        <td>\${e.timestamp}</td>
        <td>\${e.hook}</td>
        <td>\${e.documentName ?? '-'}</td>
        <td>\${e.userId ?? '-'}</td>
        <td>\${e.role ?? '-'}</td>
        <td>\${e.status}</td>
        <td>\${e.durationMs !== undefined ? e.durationMs + 'ms' : '-'}</td>
        <td class="detail">\${e.detail ?? ''}</td>
      </tr>\`).join('');
    document.getElementById('rows').innerHTML = rows;
  } catch {}
}
tick();
setInterval(tick, 2000);
</script>
</body>
</html>`;
}

export function handleDebugRequest(pathname: string, response: ServerResponse): boolean {
  if (pathname === "/__debug") {
    response.writeHead(200, { "Content-Type": "text/html" });
    response.end(renderDashboardHtml());
    return true;
  }

  if (pathname === "/__debug/events.json") {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(events));
    return true;
  }

  return false;
}
