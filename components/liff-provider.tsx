"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError, api } from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
type LiffState = { ready: boolean; status: AuthStatus; isMock: boolean; hasResidentSession: boolean; displayName: string; idToken?: string; error?: string; login: () => void; retry: () => void };
const LiffContext = createContext<LiffState | null>(null);
const LIFF_ID_KEY = "dormitory.active_liff_id";
const LIFF_INIT_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new Error(message)), timeoutMs);
    promise.then(
      (value) => { window.clearTimeout(timeout); resolve(value); },
      (reason) => { window.clearTimeout(timeout); reject(reason); },
    );
  });
}

function resolveLiffId(): string | undefined {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_LIFF_ID;
  const fromUrl = new URLSearchParams(window.location.search).get("liffId")?.trim();
  if (fromUrl) {
    window.sessionStorage.setItem(LIFF_ID_KEY, fromUrl);
    return fromUrl;
  }
  return window.sessionStorage.getItem(LIFF_ID_KEY) || process.env.NEXT_PUBLIC_LIFF_ID;
}

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<LiffState, "login" | "retry">>({ ready: false, status: "loading", isMock: false, hasResidentSession: false, displayName: "" });
  // Branch claim and invoice links include the safe public LIFF ID for that branch.
  // A deployment-wide env value remains a fallback for one-OA installations.
  const liffId = resolveLiffId();
  const isMock = process.env.NEXT_PUBLIC_MOCK_MODE === "true";

  useEffect(() => {
    let active = true;
    setState((current) => ({ ...current, ready: false, status: "loading", error: undefined }));
    if (isMock) {
      sessionStorage.setItem("resident_access_token", "mock-resident-session");
      setState({ ready: true, status: "authenticated", isMock: true, hasResidentSession: true, displayName: "คุณมินตรา", idToken: "mock-line:resident-001" });
      return;
    }
    if (!liffId) {
      setState({ ready: true, status: "error", isMock: false, hasResidentSession: false, displayName: "", error: "ยังไม่ได้ตั้งค่า LIFF ID สำหรับ Mini App นี้" });
      return;
    }
    void withTimeout(liff.init({ liffId }), LIFF_INIT_TIMEOUT_MS, "เชื่อมต่อ LINE นานเกินไป กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่อีกครั้ง").then(async () => {
      if (!liff.isLoggedIn()) { if (active) setState({ ready: true, status: "unauthenticated", isMock: false, hasResidentSession: false, displayName: "" }); return; }
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("LINE Login ต้องเปิด scope `openid` เพื่อยืนยันตัวตน");
      const profile = await liff.getProfile();
      try {
        const session = await api.createResidentSession(idToken, liffId);
        sessionStorage.setItem("resident_access_token", session.accessToken);
        if (active) setState({ ready: true, status: "authenticated", isMock: false, hasResidentSession: true, displayName: profile.displayName, idToken });
      } catch (reason) {
        if (!(reason instanceof ApiClientError) || reason.status !== 401) throw reason;
        sessionStorage.removeItem("resident_access_token");
        if (active) setState({ ready: true, status: "authenticated", isMock: false, hasResidentSession: false, displayName: profile.displayName, idToken });
      }
    }).catch((reason: unknown) => active && setState({ ready: true, status: "error", isMock: false, hasResidentSession: false, displayName: "", error: reason instanceof Error ? reason.message : "เปิด LINE Mini App ไม่สำเร็จ" }));
    return () => { active = false; };
  }, [attempt, isMock, liffId]);

  const value = useMemo<LiffState>(() => ({ ...state, login: () => liff.login({ redirectUri: window.location.href }), retry: () => setAttempt((value) => value + 1) }), [state]);
  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

export function useLiff() {
  const value = useContext(LiffContext);
  if (!value) throw new Error("useLiff must be inside LiffProvider");
  return value;
}
