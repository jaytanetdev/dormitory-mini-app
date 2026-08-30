"use client";

import { LogIn, RotateCw, TriangleAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { useLiff } from "./liff-provider";

export function ResidentGate({ children }: { children: React.ReactNode }) {
  const auth = useLiff();
  const pathname = usePathname();
  const isClaim = pathname.startsWith("/claim/");
  if (auth.status === "loading") return <div className="page" aria-live="polite"><div className="skeleton" style={{ height: 188 }} /><div className="skeleton" style={{ height: 126, marginTop: 16 }} /><span className="sr-only">กำลังยืนยันบัญชี LINE</span></div>;
  if (auth.status === "unauthenticated") return <div className="page" style={{ display: "grid", placeItems: "center" }}><div className="card success-panel"><LogIn size={38} /><h1>เข้าสู่ระบบด้วย LINE</h1><p className="muted">ยืนยันบัญชีเพื่อดูบิลของห้องคุณ</p><button className="primary-button full-width" onClick={auth.login}>เข้าสู่ระบบด้วย LINE</button></div></div>;
  if (auth.status === "error") return <div className="page" style={{ display: "grid", placeItems: "center" }}><div className="card success-panel"><TriangleAlert size={38} /><h1>เปิด Mini App ไม่สำเร็จ</h1><p className="muted" role="alert">{auth.error}</p><button className="secondary-button full-width" onClick={auth.retry}><RotateCw size={18} />ลองอีกครั้ง</button></div></div>;
  if (!auth.hasResidentSession && !isClaim) return <div className="page" style={{ display: "grid", placeItems: "center" }}><div className="card success-panel"><TriangleAlert size={38} /><h1>ยังไม่ได้ผูกห้อง</h1><p className="muted">เปิดลิงก์เชิญที่ได้รับจากเจ้าหน้าที่เพื่อเชื่อมบัญชี LINE กับห้องของคุณ</p></div></div>;
  return children;
}
