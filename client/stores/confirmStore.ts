import { create } from "zustand";

export interface ConfirmOptions {
  title?: string;
  message: string;
  danger?: boolean;
}

interface ConfirmState {
  pending: ConfirmOptions | null;
  resolver: ((value: boolean) => void) | null;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  resolve: (value: boolean) => void;
}

export const useConfirmStore = create<ConfirmState>((set) => ({
  pending: null,
  resolver: null,
  confirm: (options: ConfirmOptions) => {
    return new Promise((resolve) => {
      set({ pending: options, resolver: resolve });
    });
  },
  resolve: (value: boolean) => {
    set((state) => {
      if (state.resolver) {
        state.resolver(value);
      }
      return { pending: null, resolver: null };
    });
  },
}));
