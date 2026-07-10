import { apiClient } from "@/lib/api/client";

export interface CollabTicket {
  token: string;
}

/**
 * Fetch a short-lived (~60s) signed JWT ticket for the given board.
 * The ticket is passed as the auth token to HocuspocusProvider.
 * Auth flows through the existing /api/proxy → Laravel path (httpOnly cookie).
 */
export async function fetchCollabTicket(boardId: string): Promise<string> {
  const { data } = await apiClient.get<CollabTicket>(`/boards/${boardId}/collab-ticket`);
  return data.token;
}
