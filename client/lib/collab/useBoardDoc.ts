"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as Y from "yjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { IndexeddbPersistence } from "y-indexeddb";
import { fetchCollabTicket } from "./ticket";
import type { Board } from "@/lib/api/schemas";

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
      },
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
