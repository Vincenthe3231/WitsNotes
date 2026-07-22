"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { fetchCollabTicket } from "./ticket";
import type { Board } from "@/lib/api/schemas";
import { witslogWebSocketWatch } from "@/lib/witslog-websocket";
import WitslogBrowser from "@/lib/witslog-browser";

export type CollabStatus = "disabled" | "connecting" | "connected" | "reconnecting" | "error";

export interface BoardDocState {
  ydoc: Y.Doc;
  /** Returns the current provider instance. Not reactive — use for imperative calls only (e.g. awareness). */
  getProvider: () => HocuspocusProvider | null;
  status: CollabStatus;
  /** True when this board is collaborative (env set + board has members). */
  isCollab: boolean;
  /** True when current user is viewer-only (read-only collab mode). */
  isReadOnlyMember: boolean;
}

const collabUrl = process.env.NEXT_PUBLIC_COLLAB_URL ?? "";

/**
 * Manages the Y.Doc lifecycle for a board.
 * isCollab = NEXT_PUBLIC_COLLAB_URL set AND board.has_members.
 * isReadOnlyMember = role is viewer.
 */
export function useBoardDoc(boardId: string, board?: Board | null): BoardDocState {
  const hasMembers = board?.has_members ?? false;
  const myRole     = board?.my_role ?? "owner";
  const isCollab   = Boolean(collabUrl) && hasMembers;
  const isReadOnlyMember = isCollab && myRole === "viewer";

  const [ydoc] = useState<Y.Doc>(() => new Y.Doc());
  const providerRef = useRef<HocuspocusProvider | null>(null);
  const [status, setStatus] = useState<CollabStatus>(isCollab ? "connecting" : "disabled");

  const idbRef = useRef<IndexeddbPersistence | null>(null);

  const fetchTicket = useCallback(async () => {
    return fetchCollabTicket(boardId);
  }, [boardId]);

  useEffect(() => {
    if (!isCollab) return;

    idbRef.current = new IndexeddbPersistence(`witsnote-collab-${boardId}`, ydoc);

    // Previously no onClose handler existed at all — a collab-server
    // disconnect (e.g. the ws://... connection dying) surfaced nothing but
    // an in-app status change, invisible to witslog. Folded into the
    // existing `witsnote-client` application via tags, matching how
    // witsnote-proxy differentiates upstream-4xx/5xx via tags rather than a
    // separate application name.
    const reporter = WitslogBrowser.init({ endpoint: "/api/witslog-ingest", app: "witsnote-client" });
    const wsWatch = witslogWebSocketWatch({
      report: reporter,
      tags: ["witsnote"],
      context: { board: { boardId } },
    });

    const hp = new HocuspocusProvider({
      url: collabUrl,
      name: `board:${boardId}`,
      document: ydoc,
      token: fetchTicket,
      onStatus({ status: s }) {
        if (s === "connected") setStatus("connected");
        else if (s === "connecting") setStatus("reconnecting");
      },
      onAuthenticationFailed() {
        setStatus("error");
        reporter.enqueue({
          message: `Collab authentication failed for board ${boardId}`,
          severity: "error",
          error_code: "COLLAB_AUTH_FAILED",
          tags: ["network", "websocket", "witsnote"],
          context: { board: { boardId } },
        });
        reporter.flush();
      },
      onClose: wsWatch.onClose,
      onDisconnect: wsWatch.onDisconnect,
    });

    providerRef.current = hp;

    return () => {
      hp.destroy();
      idbRef.current?.destroy();
      providerRef.current = null;
    };
  }, [boardId, isCollab, fetchTicket, ydoc]);

  return { ydoc, getProvider: () => providerRef.current, status, isCollab, isReadOnlyMember };
}
