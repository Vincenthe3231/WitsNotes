"use client";

import { useCallback, useSyncExternalStore } from "react";

function readDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

function subscribeToTheme(cb: () => void): () => void {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

export function useThemeMode() {
  const dark = useSyncExternalStore(subscribeToTheme, readDark, () => false);

  const toggle = useCallback(() => {
    const next = !readDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }, []);

  return { dark, toggle };
}
