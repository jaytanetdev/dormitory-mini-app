"use client";

import { Building2, Check, CheckCircle2, DoorOpen, LockKeyhole, Mail, MapPin, Phone, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useLiff } from "@/components/liff-provider";
import { api } from "@/lib/api-client";
import type { ClaimInvite } from "@/lib/types";

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const liff = useLiff();
  const [invite, setInvite] = useState<ClaimInvite>();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    setInvite(undefined);
    setError(undefined);
    void api.invite(token).then(setInvite).catch((reason) =>
      setError(reason instanceof Error ? reason.message : "ไม่พบลิงก์ลงทะเบียนนี้"),
    );
  }, [token]);

  async function claim(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    try {
      if (!liff.idToken) throw new Error("กรุณาเข้าสู่ระบบด้วย LINE ก่อนยืนยันห้อง");
      await api.claim(token, {
        idToken: liff.idToken,
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      });
      setClaimed(true);
      liff.retry();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "ผูกห้องไม่สำเร็จ กรุณาตรวจสอบเลขห้องและลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  if (claimed) {
    return (
      <main className="page claim-page claim-success-page">
        <section className="claim-success-card">
          <div className="claim-success-mark"><Check size={34} strokeWidth={2.8} /></div>
          <p className="claim-kicker">เชื่อมต่อเรียบร้อย</p>
          <h1>ห้องของคุณพร้อมใช้งานแล้ว</h1>
          <p>คุณสามารถดูใบแจ้งหนี้ สแกนชำระเงิน และส่งสลิปได้จาก LINE Mini App นี้</p>
          <div className="claim-success-summary"><CheckCircle2 size={18} /><span>บัญชี LINE ถูกผูกกับห้องอย่างปลอดภัย</span></div>
          <Link href="/" className="primary-button full-width">ดูบิลของฉัน</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page claim-page">
      <section className="claim-hero">
        <div className="claim-door-scene" aria-hidden="true">
          <span className="claim-door-shape"><span className="claim-door-number">{invite?.roomNumber ?? "ROOM"}</span><span className="claim-door-knob" /></span>
          <span className="claim-key-card"><LockKeyhole size={17} /></span>
        </div>
        <p className="claim-kicker">ลงทะเบียนผู้เช่า</p>
        <h1>เชื่อมบัญชี LINE<span>กับห้องของคุณ</span></h1>
        <p className="claim-hero-copy">กรอกข้อมูลเพียงครั้งเดียว เพื่อรับบิลและแจ้งเตือนของห้องนี้ผ่าน LINE</p>
        <div className="claim-steps" aria-label="ขั้นตอนการลงทะเบียน">
          <span className="is-active"><b>1</b>ตรวจสาขา</span><i /><span className="is-active"><b>2</b>กรอกห้อง</span><i /><span><b>3</b>ยืนยัน</span>
        </div>
      </section>

      <section className="claim-form-card">
        {invite ? (
          <div className="claim-branch-block">
            <div className="claim-section-icon"><Building2 size={21} /></div>
            <div className="claim-branch-main">
              <span>ห้องที่ได้รับเชิญ</span><h2>ห้อง {invite.roomNumber} · {invite.branchName || invite.propertyName}</h2>
              <div className="claim-branch-meta">
                {invite.branchAddress && <span><MapPin size={14} />{invite.branchAddress}</span>}
                {invite.branchPhone && <span><Phone size={14} />{invite.branchPhone}</span>}
              </div>
            </div>
            <span className="claim-verified"><Check size={13} />ถูกต้อง</span>
          </div>
        ) : !error ? <div className="claim-branch-skeleton skeleton" /> : null}

        <form className="claim-form" onSubmit={(event) => void claim(event)}>
          <div className="claim-form-heading"><h2>ข้อมูลผู้พักอาศัย</h2><p>ตรวจสอบชื่อและเลขห้องให้ถูกต้องก่อนยืนยัน</p></div>
          <div className="claim-fields">
            <ClaimField label="ชื่อ-นามสกุล" icon={<UserRound size={18} />}>
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="เช่น สมชาย ใจดี" autoComplete="name" required disabled={busy} />
            </ClaimField>
            <div className="claim-locked-room"><span>เลขห้อง</span><strong>{invite?.roomNumber ?? "—"}</strong><small><LockKeyhole size={14} />กำหนดจากลิงก์เชิญ แก้ไขไม่ได้</small></div>
            <ClaimField label="เบอร์โทร" optional icon={<Phone size={18} />}>
              <input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" placeholder="08x-xxx-xxxx" disabled={busy} />
            </ClaimField>
            <ClaimField label="อีเมล" optional icon={<Mail size={18} />}>
              <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" autoComplete="email" placeholder="name@example.com" disabled={busy} />
            </ClaimField>
          </div>

          <div className="claim-security-note"><ShieldCheck size={19} /><p><strong>ข้อมูลของคุณปลอดภัย</strong>ลิงก์นี้สร้างสำหรับห้อง {invite?.roomNumber ?? "นี้"} โดยเฉพาะ ใช้ได้ครั้งเดียว และหนึ่งบัญชี LINE ผูกได้หนึ่งห้อง</p></div>
          {liff.status === "authenticated" && <div className="claim-line-status"><span>LINE</span><p><strong>เชื่อมต่อบัญชีแล้ว</strong>พร้อมยืนยันห้องของคุณ</p><CheckCircle2 size={20} /></div>}
          {liff.status === "unauthenticated" && <button type="button" className="claim-line-button full-width" onClick={liff.login}>เข้าสู่ระบบด้วย LINE</button>}
          {(liff.error || error) && <div className="claim-error" role="alert">{liff.error || error}</div>}
          <button type="submit" className="primary-button claim-submit full-width" disabled={!invite || busy || liff.status !== "authenticated" || !liff.idToken}>
            <DoorOpen size={19} />{busy ? "กำลังยืนยันห้อง..." : "ยืนยันและผูกห้องนี้"}
          </button>
          {liff.isMock && <p className="claim-mock-note">โหมดตัวอย่าง: จำลองบัญชี LINE โดยไม่ต้องตั้งค่า LIFF ID</p>}
        </form>
      </section>
    </main>
  );
}

function ClaimField({ label, optional, icon, className = "", children }: { label: string; optional?: boolean; icon: React.ReactNode; className?: string; children: React.ReactNode }) {
  return <label className={`claim-field ${className}`}><span>{label}{optional && <em> ไม่บังคับ</em>}</span><div className="claim-input-wrap">{icon}{children}</div></label>;
}
