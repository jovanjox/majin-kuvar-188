"use client";

import { useEffect } from "react";

/** Registruje /sw.js (rad bez interneta) — samo u produkcionom build-u. */
export default function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.warn("Service worker nije registrovan:", error);
    });
  }, []);

  return null;
}
