"use client";

import { useCallback, useEffect, useState } from "react";

function readDark(): boolean {
  if (typeof document === "undefined") return false;
  return document.documentElement.classList.contains("dark");
}

/**
 * Single source of truth for theme. Reads the `.dark` class off <html>
 * (seeded on first paint by the theme-init script in layout.tsx) and stays in
 * sync via a MutationObserver, so any component can both read and toggle theme
 * without duplicating local state.
 */
export function useThemeMode() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(readDark());
    const obs = new MutationObserver(() => setDark(readDark()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const next = !readDark();
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }, []);

  return { dark, toggle };
}
