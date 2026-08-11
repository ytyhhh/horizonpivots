"use client";

import { Theme } from "@radix-ui/themes";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
const ThemeContext = createContext<{ mode: ThemeMode; toggle: () => void }>({
  mode: "light",
  toggle: () => undefined,
});

export function AppTheme({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("phd-scope-theme") as ThemeMode | null;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    queueMicrotask(() => setMode(saved || (media.matches ? "dark" : "light")));
    const onChange = (event: MediaQueryListEvent) => {
      if (!window.localStorage.getItem("phd-scope-theme")) setMode(event.matches ? "dark" : "light");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = mode;
    document.documentElement.style.colorScheme = mode;
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      toggle: () => {
        setMode((current) => {
          const next = current === "light" ? "dark" : "light";
          window.localStorage.setItem("phd-scope-theme", next);
          return next;
        });
      },
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <Theme appearance={mode} accentColor="blue" grayColor="slate" radius="large" scaling="100%">
        {children}
      </Theme>
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);
