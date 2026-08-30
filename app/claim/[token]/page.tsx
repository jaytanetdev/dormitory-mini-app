"use client";

import { Check, DoorOpen, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { api } from "@/lib/api-client";
import type { BranchClaimInfo } from "@/lib/types";

/** Branch claim links let a tenant select only a vacant room in that branch. */
export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const liff = useLiff();
  const [branch, setBranch] = useState<BranchClaimInfo>();
  const [fullName, setFullName] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setBranch(undefined); setError(undefined);
    void api.branchClaimInfo(token).then(setBranch).catch((reason) => setError(reason instanceof Error ? reason.message : "ไม่พบลิงก์ลงทะเบียนนี้"));
  }, [token]);

  async function claim(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(undefined);
    try {
      if (!liff.idToken) throw new Error("กรุณาเข้าสู่ระบบด้วย LINE ก่อนยืนยันห้อง");
      await api.claimBranch(token, { idToken: liff.idToken, fullName: fullName.trim(), roomNumber: roomNumber.trim(), phone: phone.trim() || undefined, email: email.trim() || undefined });
      setClaimed(true); liff.retry();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ผูกห้องไม่สำเร็จ กรุณาตรวจสอบเลขห้องและลองอีกครั้ง");
    } finally { setBusy(false); }
  }

  if (claimed) return <div className="page claim-page"><div className="claim-content"><span className="success-icon"><Check size={34} /></span><p className="eyebrow">เชื่อมต่อเรียบร้อย</p><h1>ผูกห้องของคุณสำเร็จแล้ว</h1><p className="muted">หลังจากนี้คุณจะดูใบแจ้งหนี้ สแกนจ่าย และส่งสลิปได้จาก LINE Mini App นี้</p><Link href="/" className="primary-button full-width" style={{ marginTop: 20 }}>ดูบิลของฉัน</Link></div></div>;

  return <div className="page claim-page"><div className="claim-door" aria-hidden="true" /><div className="claim-content"><p className="eyebrow">ลงทะเบียนผู้เช่า</p><h1>ยืนยันห้องของคุณ<br />ผ่านบัญชี LINE</h1><p className="muted">ลิงก์นี้ผูกกับสาขา <strong>{branch?.branchName ?? "..."}</strong> โดยเฉพาะ ระบบจะสร้างข้อมูลผู้เช่าหลังยืนยันสำเร็จ</p>
    {branch ? <div className="card claim-details"><div className="claim-detail"><span className="muted">สาขา</span><strong>{branch.branchName}</strong></div>{branch.address && <div className="claim-detail"><span className="muted">ที่อยู่</span><strong>{branch.address}</strong></div>}{branch.phone && <div className="claim-detail"><span className="muted">ติดต่อ</span><strong>{branch.phone}</strong></div>}</div> : !error && <div className="skeleton" style={{ height: 132, margin: "22px 0" }} />}
    <form onSubmit={(event) => void claim(event)}>
      <div className="form-grid"><label>ชื่อ-นามสกุล<input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="เช่น สมชาย ใจดี" required disabled={busy} /></label><label>เลขห้อง<input value={roomNumber} onChange={(event) => setRoomNumber(event.target.value)} placeholder="เช่น A101" required disabled={busy} /></label><label>เบอร์โทร <span className="muted">(ไม่บังคับ)</span><input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="08x-xxx-xxxx" disabled={busy} /></label><label>อีเมล <span className="muted">(ไม่บังคับ)</span><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="name@example.com" disabled={busy} /></label></div>
      <p className="small muted"><ShieldCheck size={15} style={{ verticalAlign: "middle", marginRight: 5 }} />เลขห้องต้องตรงกับห้องว่างในสาขานี้เท่านั้น และบัญชี LINE หนึ่งบัญชีผูกได้หนึ่งห้อง</p>
      {liff.status === "unauthenticated" && <button type="button" className="secondary-button full-width" onClick={liff.login}>เข้าสู่ระบบด้วย LINE</button>}
      {liff.error && <p className="error-text" role="alert">{liff.error}</p>}{error && <p className="error-text" role="alert">{error}</p>}
      <button type="submit" className="primary-button full-width" disabled={!branch || busy || liff.status !== "authenticated" || !liff.idToken} style={{ marginTop: 16 }}><DoorOpen size={19} />{busy ? "กำลังยืนยันห้อง..." : "ยืนยันและผูกห้องนี้"}</button>
      {liff.isMock && <p className="muted small">โหมดตัวอย่าง: จำลองบัญชี LINE โดยไม่ต้องตั้งค่า LIFF ID</p>}
    </form>
  </div></div>;
}
