"use client";

import { onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";

if (typeof window !== "undefined") {
  onlineManager.setEventListener((setOnline) => {
    function sync() { setOnline(navigator.onLine); }
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  });
}
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { idbPersister } from "@/lib/api/persister";
import { registerMutationDefaults } from "@/lib/api/hooks";

const SEVEN_DAYS = 1000 * 60 * 60 * 24 * 7;

function makeQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: SEVEN_DAYS,
        retry: 1,
      },
    },
  });
  registerMutationDefaults(qc);
  return qc;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: idbPersister,
        maxAge: SEVEN_DAYS,
        buster: "v1",
        dehydrateOptions: { shouldDehydrateMutation: () => true },
      }}
      onSuccess={() => {
        console.debug("[idb] cache restored — resuming paused mutations");
        queryClient.resumePausedMutations().then(() => {
          console.debug("[idb] paused mutations resumed");
        });
      }}
    >
      {children}
      <CommandPalette />
      <Toaster />
      <ConfirmDialog />
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </PersistQueryClientProvider>
  );
}
