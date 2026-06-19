"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createBoard, createCard, deleteBoard, deleteCard,
  getBoard, getBoards, updateBoard, updateCard, searchCards, unfurlUrl,
} from "./boards";
import { Board, Card, CreateBoardInput, CreateCardInput, UpdateCardInput } from "./schemas";

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

// Cards
export const cardKeys = {
  board: (boardId: string) => ["boards", boardId, "cards"] as const,
};

export function useCreateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCardInput) => createCard(boardId, input),
    onMutate: async (input) => {
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
        ...input,
      };
      qc.setQueryData(boardKeys.detail(boardId), (old: (Board & { cards: Card[] }) | undefined) =>
        old ? { ...old, cards: [...(old.cards ?? []), tempCard] } : old
      );
      return { snapshot };
    },
    onError: (_err, _input, ctx) => {
      qc.setQueryData(boardKeys.detail(boardId), ctx?.snapshot);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) });
    },
  });
}

export function useUpdateCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCardInput }) => updateCard(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
}

export function useDeleteCard(boardId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => deleteCard(cardId),
    onSuccess: () => qc.invalidateQueries({ queryKey: boardKeys.detail(boardId) }),
  });
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
