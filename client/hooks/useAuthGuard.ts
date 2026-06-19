"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/authStore";
import { getMe } from "@/lib/api/auth";

/**
 * Page-level auth guard — second line of defense after middleware.
 * Verifies session is still valid server-side; clears stale user state if not.
 */
export function useAuthGuard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  useEffect(() => {
    getMe()
      .then(setUser)
      .catch(() => {
        clearAuth();
        router.replace("/auth/login");
      });
  // Run once on mount — intentionally no deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user };
}
