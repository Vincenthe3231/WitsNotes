import { apiClient } from "./client";
import { Board, BoardSchema, Card, CardSchema, CreateBoardInput, CreateCardInput, UpdateCardInput } from "./schemas";
import { z } from "zod";

export async function getBoards(): Promise<Board[]> {
  const res = await apiClient.get("/boards");
  return z.array(BoardSchema).parse(res.data);
}

export async function getBoard(id: string): Promise<Board & { cards: Card[] }> {
  const res = await apiClient.get(`/boards/${id}`);
  return { ...BoardSchema.parse(res.data), cards: z.array(CardSchema).parse(res.data.cards ?? []) };
}

export async function createBoard(input: CreateBoardInput): Promise<Board> {
  const res = await apiClient.post("/boards", input);
  return BoardSchema.parse(res.data);
}

export async function updateBoard(id: string, input: Partial<CreateBoardInput>): Promise<Board> {
  const res = await apiClient.patch(`/boards/${id}`, input);
  return BoardSchema.parse(res.data);
}

export async function deleteBoard(id: string): Promise<void> {
  await apiClient.delete(`/boards/${id}`);
}

// Cards
export async function getCards(boardId: string): Promise<Card[]> {
  const res = await apiClient.get(`/boards/${boardId}/cards`);
  return z.array(CardSchema).parse(res.data);
}

export async function createCard(boardId: string, input: CreateCardInput): Promise<Card> {
  const res = await apiClient.post(`/boards/${boardId}/cards`, input);
  return CardSchema.parse(res.data);
}

export async function updateCard(cardId: string, input: UpdateCardInput): Promise<Card> {
  const res = await apiClient.patch(`/cards/${cardId}`, input);
  return CardSchema.parse(res.data);
}

export async function deleteCard(cardId: string): Promise<void> {
  await apiClient.delete(`/cards/${cardId}`);
}

export async function searchCards(query: string): Promise<Card[]> {
  const res = await apiClient.get(`/cards/search`, { params: { q: query, limit: 20 } });
  return z.array(CardSchema.partial()).parse(res.data) as Card[];
}

export async function uploadAttachment(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/proxy/attachments", { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) throw new Error("Upload failed");
  const data = (await res.json()) as { url: string };
  return data.url;
}

export async function unfurlUrl(url: string): Promise<{
  title?: string; description?: string; image?: string; site_name?: string; favicon?: string;
}> {
  const res = await apiClient.get(`/unfurl`, { params: { url } });
  return res.data;
}
