import { create } from "zustand";

export interface Toast {
  id: string;
  level: "error" | "warning" | "info" | "success";
  message: string;
  ttl?: number;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substr(2, 9);
    const ttl = toast.ttl ?? 5000;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }],
    }));
    if (ttl > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, ttl);
    }
    return id;
  },
  dismiss: (id: string) => {
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    }));
  },
}));
