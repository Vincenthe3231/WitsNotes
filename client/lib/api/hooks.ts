"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import {
  createBoard, createCard, deleteBoard, deleteCard,
  getBoard, getBoards, updateBoard, updateCard, searchCards, unfurlUrl,
  getConnections, createConnection, deleteConnection,
} from "./boards";
import { Board, Card, CreateBoardInput, CreateCardInput, CreateConnectionInput, UpdateCardInput } from "./schemas";

// Boards
export const boardKeys = {
  all: ["boards"] as const,
  detail: (id: string) => ["boards", id] as const,
};

export function useBoards() {
  return useQuery({ queryKey: boardKeys.all, queryFn: getBoards });
}

export function useBoard(id: string) {
  return useQuery({ queryKey: boardKeys.detail(id), queryFn: () => getBoard(id) });
}

export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBoardInput) => createBoard(input),
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: boardKeys.all });
      const snapshot = qc.getQueryData(boardKeys.all);
      const tempBoard: Board = {
        id: `temp-${Date.now()}`,
        user_id: 0,
        title: input.title,
        description: input.description ?? null,
        is_vault: input.is_vault ?? false,
        style: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData(boardKeys.all, (old: Board[] | undefined) =>
        old ? [...old, tempBoard] : [tempBoard]
      );
      return { snapshot };
    },
    onError: (_err, _input, ctx) => {
      qc.setQueryData(boardKeys.all, ctx?.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

export function useUpdateBoard(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<CreateBoardInput>) => updateBoard(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.all });
      qc.invalidateQueries({ queryKey: boardKeys.detail(id) });
    },
  });
}

export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBoard(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.all }),
  });
}

// Cards — stable mutation variable types for rehydratable offline replay
export const cardKeys = {
  board: (boardId: string) => ["boards", boardId, "cards"] as const,
};

export type CreateCardVars = { boardId: string } & CreateCardInput;
export type UpdateCardVars = {
  boardId: string;
  id: string;
  input: UpdateCardInput & { base_updated_at?: string };
};
export type DeleteCardVars = { boardId: string; cardId: string };

/**
 * Register stable mutation defaults so paused mutations can be replayed
 * after a page reload. Call once before PersistQueryClientProvider restores
 * the cache so the rehydrated mutations find their handlers.
 */
export function registerMutationDefaults(qc: QueryClient) {
  qc.setMutationDefaults(["cards", "create"], {
    mutationFn: ({ boardId, ...input }: CreateCardVars) =>
      createCard(boardId, input as CreateCardInput),
    onMutate: async (vars: CreateCardVars) => {
      const { boardId, ...input } = vars;
      await qc.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const snapshot = qc.getQueryData(boardKeys.detail(boardId));
      const tempCard: Card = {
        id: `temp-${Date.now()}`,
        board_id: boardId,
        created_by: 0,
        style: null,
        content: null,
        content_text: null,
        due_at: null,
        remind_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...(input as CreateCardInput),
      };
      qc.setQueryData(
        boardKeys.detail(boardId),
        (old: (Board & { cards: Card[] }) | undefined) =>
          old ? { ...old, cards: [...(old.cards ?? []), tempCard] } : old
      );
      return { snapshot };
    },
    onError: (
      _err: unknown,
      vars: CreateCardVars,
      ctx: { snapshot: unknown } | undefined
    ) => {
      if (ctx) qc.setQueryData(boardKeys.detail(vars.boardId), ctx.snapshot);
    },
    onSettled: (_data: unknown, _err: unknown, vars: CreateCardVars) => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
    },
  });

  qc.setMutationDefaults(["cards", "update"], {
    mutationFn: ({ id, input, boardId }: UpdateCardVars) => {
      const board = qc.getQueryData<Board & { cards: Card[] }>(boardKeys.detail(boardId));
      const base_updated_at = board?.cards.find((c) => c.id === id)?.updated_at;
      return updateCard(id, { ...input, base_updated_at });
    },
    onMutate: async (vars: UpdateCardVars) => {
      const { boardId, id, input } = vars;
      await qc.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const snapshot = qc.getQueryData(boardKeys.detail(boardId));
      qc.setQueryData(
        boardKeys.detail(boardId),
        (old: (Board & { cards: Card[] }) | undefined) =>
          old
            ? { ...old, cards: old.cards.map((c) => (c.id === id ? { ...c, ...input } : c)) }
            : old
      );
      return { snapshot };
    },
    onError: (
      err: unknown,
      vars: UpdateCardVars,
      ctx: { snapshot: unknown } | undefined
    ) => {
      if (ctx) qc.setQueryData(boardKeys.detail(vars.boardId), ctx.snapshot);
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 409) {
        qc.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("card:conflict", { detail: { cardId: vars.id } })
          );
        }
      }
    },
    onSettled: (_data: unknown, _err: unknown, vars: UpdateCardVars) => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
    },
  });

  qc.setMutationDefaults(["cards", "delete"], {
    mutationFn: ({ cardId }: DeleteCardVars) => deleteCard(cardId),
    onMutate: async (vars: DeleteCardVars) => {
      const { boardId, cardId } = vars;
      await qc.cancelQueries({ queryKey: boardKeys.detail(boardId) });
      const snapshot = qc.getQueryData(boardKeys.detail(boardId));
      qc.setQueryData(
        boardKeys.detail(boardId),
        (old: (Board & { cards: Card[] }) | undefined) =>
          old ? { ...old, cards: old.cards.filter((c) => c.id !== cardId) } : old
      );
      return { snapshot };
    },
    onError: (
      _err: unknown,
      vars: DeleteCardVars,
      ctx: { snapshot: unknown } | undefined
    ) => {
      if (ctx) qc.setQueryData(boardKeys.detail(vars.boardId), ctx.snapshot);
    },
    onSettled: (_data: unknown, _err: unknown, vars: DeleteCardVars) => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(vars.boardId) });
    },
  });
}

// Thin hook wrappers — config lives in registerMutationDefaults above
export function useCreateCard() {
  return useMutation<Card, Error, CreateCardVars>({ mutationKey: ["cards", "create"] });
}

export function useUpdateCard() {
  return useMutation<Card, Error, UpdateCardVars>({ mutationKey: ["cards", "update"] });
}

export function useDeleteCard() {
  return useMutation<void, Error, DeleteCardVars>({ mutationKey: ["cards", "delete"] });
}

export function useSearchCards(query: string) {
  return useQuery({
    queryKey: ["cards", "search", query],
    queryFn: () => searchCards(query),
    enabled: query.trim().length > 0,
    staleTime: 10_000,
  });
}

export function useUnfurlUrl(url: string) {
  return useQuery({
    queryKey: ["unfurl", url],
    queryFn: () => unfurlUrl(url),
    enabled: !!url && url.startsWith("http"),
    staleTime: 5 * 60_000,
  });
}

// Board members
import { getBoardMembers, inviteBoardMember, updateBoardMemberRole, removeBoardMember, setBoardVault } from "./boards";
import { BoardMember } from "./schemas";

export const memberKeys = {
  list: (boardId: string) => ["boards", boardId, "members"] as const,
};

export function useBoardMembers(boardId: string) {
  return useQuery({ queryKey: memberKeys.list(boardId), queryFn: () => getBoardMembers(boardId) });
}

export function useInviteMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: "editor" | "viewer" }) =>
      inviteBoardMember(boardId, email, role),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(boardId) });
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useUpdateMemberRole(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: "editor" | "viewer" }) =>
      updateBoardMemberRole(boardId, memberId, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: memberKeys.list(boardId) }),
  });
}

export function useRemoveMember(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId }: { memberId: string }) => removeBoardMember(boardId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: memberKeys.list(boardId) });
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useSetBoardVault(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ vaultSalt, vaultVerifier }: { vaultSalt: string; vaultVerifier: string }) =>
      setBoardVault(boardId, vaultSalt, vaultVerifier),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
      qc.invalidateQueries({ queryKey: boardKeys.all });
    },
  });
}

// Connections (mind-map edges)
export const connectionKeys = {
  list: (boardId: string) => ["boards", boardId, "connections"] as const,
};

export function useConnections(boardId: string) {
  return useQuery({ queryKey: connectionKeys.list(boardId), queryFn: () => getConnections(boardId) });
}

export function useCreateConnection(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateConnectionInput) => createConnection(boardId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.list(boardId) }),
  });
}

export function useDeleteConnection(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (connectionId: string) => deleteConnection(connectionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: connectionKeys.list(boardId) }),
  });
}
