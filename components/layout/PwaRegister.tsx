"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const run = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore — demo still works without SW */
      });
    };
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run);
    return () => window.removeEventListener("load", run);
  }, []);
  return null;
}
