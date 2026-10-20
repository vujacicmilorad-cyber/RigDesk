"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "rigdesk-theme";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(KEY);
    const preferDark =
      stored === "dark" ||
      (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", preferDark);
    setDark(preferDark);
    setReady(true);
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem(KEY, next ? "dark" : "light");
  }

  if (!ready) {
    return (
      <Button type="button" variant="outline" size="sm" className="min-h-10" disabled>
        Theme
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-10"
      onClick={toggle}
      aria-pressed={dark}
    >
      {dark ? "Light" : "Dark"}
    </Button>
  );
}
