"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/lib/api/schemas";

/**
 * Token lives exclusively in the httpOnly `wn_sid` cookie (set by the proxy).
 * The store only holds the user profile for UI rendering — no token in JS.
 */
interface AuthState {
  user: User | null;
  setUser: (user: User) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearAuth: () => set({ user: null }),
    }),
    { name: "wn-auth", partialize: (s) => ({ user: s.user }) }
  )
);
