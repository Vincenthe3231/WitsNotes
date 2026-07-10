import { Server } from "@hocuspocus/server";
import { jwtVerify } from "jose";
import * as Y from "yjs";
import { loadYDoc, storeYDoc, type CardSnapshot } from "./persistence.js";
import { recordEvent, handleDebugRequest } from "./inspector.js";

const port        = Number(process.env.COLLAB_PORT ?? 1234);
const jwtSecret   = process.env.COLLAB_JWT_SECRET ?? "";
const storeDebounceMs = 2_000;

if (!jwtSecret) {
  console.warn("[collab] WARNING: COLLAB_JWT_SECRET not set — all connections will be rejected");
}

const secret = new TextEncoder().encode(jwtSecret);

interface TicketPayload {
  user_id: string;
  board_id: string;
  role: string;
}

// Per-board debounce timers for persistence
const storeTimers = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleStore(boardId: string, doc: Y.Doc): void {
  const existing = storeTimers.get(boardId);
  if (existing) clearTimeout(existing);

  storeTimers.set(boardId, setTimeout(async () => {
    storeTimers.delete(boardId);
    const start = Date.now();
    try {
      await storeYDoc(boardId, doc);
      recordEvent({ hook: "storeYDoc", documentName: `board:${boardId}`, status: "ok", durationMs: Date.now() - start });
    } catch (err) {
      console.error(`[collab] storeYDoc ${boardId} error:`, err);
      recordEvent({ hook: "storeYDoc", documentName: `board:${boardId}`, status: "error", durationMs: Date.now() - start, detail: String(err) });
    }
  }, storeDebounceMs));
}

const server = Server.configure({
  port,
  name: "witsnote-collab",

  async onRequest({ request, response }) {
    const pathname = (request.url ?? "").split("?")[0];

    if (pathname === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ status: "ok", service: "witsnote-collab" }));
      return Promise.reject();
    }

    if (handleDebugRequest(pathname, response)) {
      return Promise.reject();
    }

    return Promise.resolve();
  },

  async onAuthenticate({ token, documentName, connection }) {
    const start = Date.now();
    try {
      if (!jwtSecret) {
        throw new Error("collab jwt secret not configured");
      }

      let payload: TicketPayload;
      try {
        const { payload: raw } = await jwtVerify(token, secret, { algorithms: ["HS256"] });
        payload = raw as unknown as TicketPayload;
      } catch {
        throw new Error("invalid or expired collab ticket");
      }

      const expectedDoc = `board:${payload.board_id}`;
      if (documentName !== expectedDoc) {
        throw new Error(`document name mismatch: expected ${expectedDoc}`);
      }

      connection.readOnly = payload.role === "viewer";

      recordEvent({
        hook: "onAuthenticate",
        documentName,
        userId: payload.user_id,
        role: payload.role,
        status: "ok",
        durationMs: Date.now() - start,
      });

      return { user_id: payload.user_id, board_id: payload.board_id, role: payload.role };
    } catch (err) {
      recordEvent({
        hook: "onAuthenticate",
        documentName,
        status: "error",
        durationMs: Date.now() - start,
        detail: String(err instanceof Error ? err.message : err),
      });
      throw err;
    }
  },

  async onLoadDocument({ documentName, document }) {
    // documentName = "board:{uuid}"
    const boardId = documentName.replace(/^board:/, "");
    const start = Date.now();

    try {
      const { state, cards } = await loadYDoc(boardId);

      if (state) {
        Y.applyUpdate(document, state);
      } else if (cards && cards.length > 0) {
        // Seed Y.Doc from cards snapshot
        document.transact(() => {
          const map = document.getMap<Y.Map<unknown>>("cards");
          for (const card of cards as CardSnapshot[]) {
            const cardMap = new Y.Map<unknown>();
            Object.entries(card).forEach(([k, v]) => { if (v !== undefined) cardMap.set(k, v); });
            map.set(card.id, cardMap);
          }
        });
      }

      recordEvent({ hook: "onLoadDocument", documentName, status: "ok", durationMs: Date.now() - start });
    } catch (err) {
      console.error(`[collab] onLoadDocument ${boardId} error:`, err);
      recordEvent({ hook: "onLoadDocument", documentName, status: "error", durationMs: Date.now() - start, detail: String(err) });
    }

    return document;
  },

  async onStoreDocument({ documentName, document }) {
    const boardId = documentName.replace(/^board:/, "");
    recordEvent({ hook: "onStoreDocument", documentName, status: "ok", detail: "scheduled" });
    scheduleStore(boardId, document);
  },

  async onDisconnect({ documentName, document, clientsCount }) {
    // Flush immediately when last client disconnects — bound the loss window
    if (clientsCount === 0) {
      const boardId = documentName.replace(/^board:/, "");
      const start = Date.now();
      const timer = storeTimers.get(boardId);
      if (timer) {
        clearTimeout(timer);
        storeTimers.delete(boardId);
      }
      try {
        await storeYDoc(boardId, document);
        recordEvent({ hook: "onDisconnect", documentName, status: "ok", durationMs: Date.now() - start, detail: "flushed on last client disconnect" });
      } catch (err) {
        console.error(`[collab] flush on disconnect ${boardId} error:`, err);
        recordEvent({ hook: "onDisconnect", documentName, status: "error", durationMs: Date.now() - start, detail: String(err) });
      }
    } else {
      recordEvent({ hook: "onDisconnect", documentName, status: "ok", detail: `clientsCount=${clientsCount}` });
    }
  },
});

server.listen().then(() => {
  console.log(`[collab] Hocuspocus listening on :${port} (health: /health)`);
}).catch((err: unknown) => {
  console.error("[collab] failed to start", err);
  process.exit(1);
});
