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
  // Bypasses React Query entirely (called imperatively as HocuspocusProvider's
  // `token` callback) — attachWitslog never sees this call, so it's marked
  // for direct capture by witslogAxiosInterceptor (client/lib/api/client.ts).
  const { data } = await apiClient.get<CollabTicket>(`/boards/${boardId}/collab-ticket`, {
    witslogDirectCapture: true,
  } as Parameters<typeof apiClient.get>[1]);
  return data.token;
}
