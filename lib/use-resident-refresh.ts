"use client";
import { useEffect } from "react";

/** Re-read server state when returning from LINE/banking and while a page is open. */
export function useResidentRefresh<T>(load: () => Promise<T>, onData: (data: T) => void, onError?: (error: unknown) => void) {
  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading || document.visibilityState === "hidden") return;
      loading = true;
      try { const data = await load(); if (active) onData(data); }
      catch (error) { if (active) onError?.(error); }
      finally { loading = false; }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { active = false; window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, [load, onData, onError]);
}
