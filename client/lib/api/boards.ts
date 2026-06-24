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

export async function updateCard(
  cardId: string,
  input: UpdateCardInput & { base_updated_at?: string }
): Promise<Card> {
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

export interface AttachmentResult {
  id: string;
  url: string;
  mime: string;
  size: number;
  original_name: string;
}

export async function uploadAttachment(
  file: File,
  opts: { cardId: string; onProgress?: (pct: number) => void }
): Promise<AttachmentResult> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("card_id", opts.cardId);

  console.log("[upload] uploadAttachment XHR creating", { fileName: file.name, fileSize: file.size, cardId: opts.cardId });
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.withCredentials = true;
    xhr.open("POST", "/api/proxy/attachments");
    console.log("[upload] XHR opened");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.timeout = 30_000;

    xhr.onload = () => {
      if (xhr.status === 200 || xhr.status === 201) {
        resolve(JSON.parse(xhr.responseText) as AttachmentResult);
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = (e) => { console.error("[upload] XHR onerror", e); reject(new Error("Upload failed: network error")); };
    xhr.ontimeout = () => { console.error("[upload] XHR timeout after", xhr.timeout, "ms"); reject(new Error("Upload failed: timeout")); };
    xhr.onabort = () => { console.error("[upload] XHR aborted"); reject(new Error("Upload failed: aborted")); };
    console.log("[upload] XHR send()");
    xhr.send(fd);
  });
}

export async function deleteAttachment(attachmentId: string): Promise<void> {
  await apiClient.delete(`/attachments/${attachmentId}`);
}

export async function unfurlUrl(url: string): Promise<{
  title?: string; description?: string; image?: string; site_name?: string; favicon?: string;
}> {
  const res = await apiClient.get(`/unfurl`, { params: { url } });
  return res.data;
}
