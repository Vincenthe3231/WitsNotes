"use client";

import { create } from "zustand";

export interface Command {
  id: string;
  label: string;
  shortcut?: string;
  action: () => void;
  group?: string;
}

interface CommandState {
  open: boolean;
  commands: Map<string, Command>;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  register: (cmd: Command) => void;
  unregister: (id: string) => void;
}

export const useCommandStore = create<CommandState>()((set) => ({
  open: false,
  commands: new Map(),
  setOpen: (open) => set({ open }),
  toggle: () => set((s) => ({ open: !s.open })),
  register: (cmd) =>
    set((s) => {
      const m = new Map(s.commands);
      m.set(cmd.id, cmd);
      return { commands: m };
    }),
  unregister: (id) =>
    set((s) => {
      const m = new Map(s.commands);
      m.delete(id);
      return { commands: m };
    }),
}));
