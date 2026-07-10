"use client";

import { createContext, useContext } from "react";
import * as Y from "yjs";
import type { BoardDocState } from "./useBoardDoc";

const defaultState: BoardDocState = {
  ydoc: new Y.Doc(),
  getProvider: () => null,
  status: "disabled",
  isCollab: false,
  isReadOnlyMember: false,
};

export const BoardDocContext = createContext<BoardDocState>(defaultState);

export function useBoardDocContext(): BoardDocState {
  return useContext(BoardDocContext);
}
