"use client";
import { useEffect, useRef, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY, type Theme } from "../lib/theme";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const preference = useRef<Theme | null>(null);

  useEffect(() => {
    const system = window.matchMedia("(prefers-color-scheme: dark)");
    const readPreference = () => {
      try {
        const saved = localStorage.getItem(THEME_STORAGE_KEY);
        return saved === "light" || saved === "dark" ? saved : null;
      } catch { return null; }
    };
    const apply = () => {
      const next = preference.current || (system.matches ? "dark" : "light");
      document.documentElement.dataset.theme = next;
      setTheme(next);
    };
    preference.current = readPreference();
    apply();
    const systemChanged = () => { if (!preference.current) apply(); };
    const storageChanged = (event: StorageEvent) => {
      if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
      preference.current = readPreference();
      apply();
    };
    system.addEventListener("change", systemChanged);
    window.addEventListener("storage", storageChanged);
    return () => {
      system.removeEventListener("change", systemChanged);
      window.removeEventListener("storage", storageChanged);
    };
  }, []);

  function toggle() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    preference.current = next;
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* Keep the choice for this tab when storage is unavailable. */ }
  }

  return <button type="button" className="theme-toggle" aria-label="Dark mode" aria-pressed={theme === "dark"} title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`} onClick={toggle}>
    {theme === "dark" ? <Sun size={19} strokeWidth={1.8} aria-hidden="true" /> : <Moon size={19} strokeWidth={1.8} aria-hidden="true" />}
  </button>;
}
