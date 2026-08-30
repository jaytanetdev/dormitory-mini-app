"use client";

import liff from "@line/liff";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { ApiClientError, api } from "@/lib/api-client";

type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";
type LiffState = { ready: boolean; status: AuthStatus; isMock: boolean; hasResidentSession: boolean; displayName: string; idToken?: string; error?: string; login: () => void; retry: () => void };
const LiffContext = createContext<LiffState | null>(null);

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<Omit<LiffState, "login" | "retry">>({ ready: false, status: "loading", isMock: false, hasResidentSession: false, displayName: "" });
  // Branch claim and invoice links include the safe public LIFF ID for that branch.
  // A deployment-wide env value remains a fallback for one-OA installations.
  const liffId = typeof window === "undefined" ? process.env.NEXT_PUBLIC_LIFF_ID : new URLSearchParams(window.location.search).get("liffId") || process.env.NEXT_PUBLIC_LIFF_ID;
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
    void liff.init({ liffId }).then(async () => {
      if (!liff.isLoggedIn()) { if (active) setState({ ready: true, status: "unauthenticated", isMock: false, hasResidentSession: false, displayName: "" }); return; }
      const idToken = liff.getIDToken();
      if (!idToken) throw new Error("LINE Login ต้องเปิด scope `openid` เพื่อยืนยันตัวตน");
      const profile = await liff.getProfile();
      try {
        const session = await api.createResidentSession(idToken);
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

  const value = useMemo<LiffState>(() => ({ ...state, login: () => liff.login({ redirectUri: window.location.href, scope: "openid profile" }), retry: () => setAttempt((value) => value + 1) }), [state]);
  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

export function useLiff() {
  const value = useContext(LiffContext);
  if (!value) throw new Error("useLiff must be inside LiffProvider");
  return value;
}
