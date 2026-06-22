import { get, set, del } from "idb-keyval";
import type { Persister, PersistedClient } from "@tanstack/react-query-persist-client";

const KEY = "witsnote-rq";

let throttleTimer: ReturnType<typeof setTimeout> | null = null;

export const idbPersister: Persister = {
  persistClient: (client: PersistedClient) => {
    if (throttleTimer) clearTimeout(throttleTimer);
    return new Promise((resolve) => {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        const mutationCount = client.clientState.mutations.length;
        const pausedCount = client.clientState.mutations.filter(
          (m) => m.state.status === "paused"
        ).length;
        console.debug(
          `[idb] persist — queries: ${Object.keys(client.clientState.queries).length}, mutations: ${mutationCount} (${pausedCount} paused)`
        );
        set(KEY, client).then(() => {
          console.debug("[idb] persist ✓ written to IndexedDB");
          resolve();
        });
      }, 300);
    });
  },
  restoreClient: () => {
    console.debug("[idb] restoring client from IndexedDB…");
    return get<PersistedClient>(KEY).then((client) => {
      if (client) {
        const mutationCount = client.clientState.mutations.length;
        const pausedCount = client.clientState.mutations.filter(
          (m) => m.state.status === "paused"
        ).length;
        console.debug(
          `[idb] restored — queries: ${Object.keys(client.clientState.queries).length}, mutations: ${mutationCount} (${pausedCount} paused)`
        );
      } else {
        console.debug("[idb] no persisted client found");
      }
      return client;
    });
  },
  removeClient: () => {
    console.debug("[idb] removing persisted client");
    return del(KEY);
  },
};
