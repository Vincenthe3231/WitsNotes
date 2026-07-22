import { apiClient } from "./client";
import WitslogBrowser from "@/lib/witslog-browser";
import {
  AgendaItem,
  AgendaItemSchema,
  Board,
  BoardSchema,
  Card,
  CardSchema,
  Connection,
  ConnectionSchema,
  CreateBoardInput,
  CreateBoardSchema,
  CreateCardInput,
  CreateCardSchema,
  CreateConnectionInput,
  CreateConnectionSchema,
  UpdateCardInput,
  UpdateCardSchema,
} from "./schemas";
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
  const validated = CreateBoardSchema.parse(input);
  const res = await apiClient.post("/boards", validated);
  return BoardSchema.parse(res.data);
}

export async function updateBoard(id: string, input: Partial<CreateBoardInput>): Promise<Board> {
  const validated = CreateBoardSchema.partial().parse(input);
  const res = await apiClient.patch(`/boards/${id}`, validated);
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
  const validated = CreateCardSchema.parse(input);
  const res = await apiClient.post(`/boards/${boardId}/cards`, validated);
  return CardSchema.parse(res.data);
}

export async function updateCard(
  cardId: string,
  input: UpdateCardInput & { base_updated_at?: string }
): Promise<Card> {
  const validated = UpdateCardSchema.extend({ base_updated_at: z.string().optional() }).parse(input);
  const res = await apiClient.patch(`/cards/${cardId}`, validated);
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
  // Raw XHR (not axios/fetch, needed for upload-progress events) — network-tab-equivalent
  // capture wired directly here rather than a new SDK export (single call site today, YAGNI;
  // promote to a shared helper if a second XHR site appears).
  const reporter = WitslogBrowser.init({ endpoint: "/api/witslog-ingest", app: "witsnote-client" });
  const logXhrFailure = (errorCode: string, message: string) => {
    reporter.enqueue({
      message,
      severity: "error",
      error_code: errorCode,
      tags: ["network", "xhr", "upload", "witsnote"],
      context: { cardId: opts.cardId, fileName: file.name, fileSize: file.size },
    });
    reporter.flush();
  };

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
        logXhrFailure(`HTTP_${xhr.status}`, `Upload failed: ${xhr.status} ${xhr.responseText}`);
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = (e) => {
      console.error("[upload] XHR onerror", e);
      logXhrFailure("XHR_NETWORK_ERROR", "Upload failed: network error");
      reject(new Error("Upload failed: network error"));
    };
    xhr.ontimeout = () => {
      console.error("[upload] XHR timeout after", xhr.timeout, "ms");
      logXhrFailure("XHR_TIMEOUT", "Upload failed: timeout");
      reject(new Error("Upload failed: timeout"));
    };
    xhr.onabort = () => {
      console.error("[upload] XHR aborted");
      logXhrFailure("XHR_ABORTED", "Upload failed: aborted");
      reject(new Error("Upload failed: aborted"));
    };
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

// Board members
import { BoardMember, BoardMemberSchema } from "./schemas";

export async function getBoardMembers(boardId: string): Promise<BoardMember[]> {
  const res = await apiClient.get(`/boards/${boardId}/members`);
  return z.array(BoardMemberSchema).parse(res.data);
}

export async function inviteBoardMember(boardId: string, email: string, role: "editor" | "viewer"): Promise<BoardMember> {
  const res = await apiClient.post(`/boards/${boardId}/members`, { email, role });
  return BoardMemberSchema.parse(res.data);
}

export async function updateBoardMemberRole(boardId: string, memberId: string, role: "editor" | "viewer"): Promise<void> {
  await apiClient.patch(`/boards/${boardId}/members/${memberId}`, { role });
}

export async function removeBoardMember(boardId: string, memberId: string): Promise<void> {
  await apiClient.delete(`/boards/${boardId}/members/${memberId}`);
}

export async function setBoardVault(
  boardId: string,
  vaultSalt: string,
  vaultVerifier: string
): Promise<Board> {
  const res = await apiClient.post(`/boards/${boardId}/vault`, {
    vault_salt: vaultSalt,
    vault_verifier: vaultVerifier,
  });
  return BoardSchema.parse(res.data);
}

export async function getConnections(boardId: string): Promise<Connection[]> {
  const res = await apiClient.get(`/boards/${boardId}/connections`);
  return z.array(ConnectionSchema).parse(res.data);
}

export async function createConnection(
  boardId: string,
  input: CreateConnectionInput
): Promise<Connection> {
  const parsed = CreateConnectionSchema.parse(input);
  const res = await apiClient.post(`/boards/${boardId}/connections`, parsed);
  return ConnectionSchema.parse(res.data);
}

export async function deleteConnection(connectionId: string): Promise<void> {
  await apiClient.delete(`/connections/${connectionId}`);
}

export async function getAgenda(): Promise<AgendaItem[]> {
  const res = await apiClient.get("/cards/agenda");
  return z.array(AgendaItemSchema).parse(res.data);
}
