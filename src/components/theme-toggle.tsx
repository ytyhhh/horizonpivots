"use client";

import { Moon, Sun } from "@phosphor-icons/react";

export function ThemeToggle() {
  function toggle() {
    const current =
      document.documentElement.dataset.theme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("theme", next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="icon-button"
      aria-label="切换明暗主题"
    >
      <Sun size={18} weight="bold" className="theme-icon-sun" aria-hidden="true" />
      <Moon size={18} weight="bold" className="theme-icon-moon" aria-hidden="true" />
    </button>
  );
}
