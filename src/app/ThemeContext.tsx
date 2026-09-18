// ── Global theme provider ─────────────────────────────────────────────────────
// Default behavior: follows the OS/browser's prefers-color-scheme automatically.
// Override: the user can force "light" or "dark" regardless of system setting;
// that choice is persisted and wins over system preference until cleared.
//
// Mechanics: toggles the `.dark` class on <html>. The existing CSS variable
// system in theme.css (`:root` = light tokens, `.dark` = dark tokens, wired
// through `@theme inline`) already responds to that class — this provider is
// the missing piece that actually sets it.

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "sf-theme-preference";

interface ThemeContextValue {
  /** What the user has chosen: "system" (follow OS) or an explicit override. */
  preference: ThemePreference;
  /** The actually-applied theme right now (resolves "system" to light/dark). */
  resolvedTheme: "light" | "dark";
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // localStorage unavailable (privacy mode, etc.) — fall back to system.
  }
  return "system";
}

function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  if (theme === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
    readStoredPreference() === "system" ? getSystemTheme() : (readStoredPreference() as "light" | "dark")
  );

  // Apply on mount and whenever preference changes.
  useEffect(() => {
    const next = preference === "system" ? getSystemTheme() : preference;
    setResolvedTheme(next);
    applyThemeClass(next);
  }, [preference]);

  // While following "system", stay in sync if the OS theme changes live
  // (e.g. user switches their OS to dark mode at sunset) without a reload.
  useEffect(() => {
    if (preference !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mq.matches ? "dark" : "light";
      setResolvedTheme(next);
      applyThemeClass(next);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [preference]);

  function setPreference(p: ThemePreference) {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // Best-effort persistence; ignore if storage is unavailable.
    }
  }

  return (
    <ThemeContext.Provider value={{ preference, resolvedTheme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}