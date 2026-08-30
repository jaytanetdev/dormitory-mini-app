"use client";

import { ArrowLeft, Check, ImagePlus, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { PromptPayQr } from "@/components/promptpay-qr";
import { api } from "@/lib/api-client";
import { formatBaht } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export default function PayPage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [file, setFile] = useState<File>();
  const [paidAt, setPaidAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();
  const preview = useMemo(() => file ? URL.createObjectURL(file) : undefined, [file]);
  useEffect(() => { void api.invoice(id).then(setInvoice); }, [id]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(undefined);
    if (!invoice) { setError("ยังโหลดข้อมูลบิลไม่สำเร็จ"); return; }
    if (!file || !paidAt) { setError("แนบสลิปและระบุเวลาที่โอนให้ครบ"); return; }
    if (!["image/jpeg", "image/png"].includes(file.type) || file.size > 8 * 1024 * 1024) { setError("ใช้ไฟล์ JPG หรือ PNG ขนาดไม่เกิน 8 MB"); return; }
    setSubmitting(true);
    try { await api.uploadSlip(id, file, new Date(paidAt).toISOString(), invoice.total); setDone(true); } catch (reason) { setError(reason instanceof Error ? reason.message : "ส่งสลิปไม่สำเร็จ"); } finally { setSubmitting(false); }
  }
  if (!invoice) return <div className="page"><div className="skeleton" style={{ height: 420 }} /></div>;
  if (done) return <div className="page" style={{ display: "grid", placeItems: "center" }}><div className="card success-panel"><span className="success-icon"><Check size={34} /></span><p className="eyebrow">ส่งหลักฐานแล้ว</p><h1 className="page-title">กำลังตรวจสอบสลิป</h1><p className="muted">เจ้าหน้าที่จะตรวจยอด ฿{formatBaht(invoice.total)} และแจ้งผลกลับทาง LINE</p><span className="status-pill pending">รอตรวจสอบ</span><Link href="/" className="primary-button full-width" style={{ marginTop: 22 }}>กลับหน้าหลัก</Link></div></div>;
  return <div className="page"><header className="page-head"><Link href={`/invoices/${id}`} className="back-link" aria-label="กลับไปที่รายละเอียดบิล"><ArrowLeft size={20} /></Link><div style={{ flex: 1 }}><p className="eyebrow">PromptPay</p><h1 className="page-title">ชำระบิล</h1></div></header>
    <section className="card qr-card"><p className="eyebrow">ยอดที่ต้องโอน</p><p className="amount">฿{formatBaht(invoice.total)}</p><PromptPayQr amount={invoice.total} promptPayId={process.env.NEXT_PUBLIC_PROMPTPAY_ID ?? "0812345678"} /><div className="payee"><p className="small muted">ผู้รับเงิน</p><p><strong>อยู่ดี เรสซิเดนซ์ · สาขารัชดา</strong></p></div></section>
    <p className="notice"><ShieldCheck size={16} style={{ verticalAlign: "middle", marginRight: 6 }} />QR นี้ระบุยอดตามบิลแล้ว ตรวจสอบชื่อผู้รับก่อนยืนยันในแอปธนาคาร</p>
    <form onSubmit={submit} className="section" noValidate><div className="section-heading"><h2>แนบหลักฐานการโอน</h2></div><label className="upload-box"><input type="file" accept="image/png,image/jpeg" onChange={(event) => setFile(event.target.files?.[0])} aria-label="เลือกรูปสลิป" />{preview ? <img className="upload-preview" src={preview} alt="ตัวอย่างสลิปที่เลือก" /> : <span className="upload-prompt"><ImagePlus size={30} /><br /><strong>แตะเพื่อเลือกรูปสลิป</strong><br /><span className="small">JPG หรือ PNG ไม่เกิน 8 MB</span></span>}</label>
      <div className="form-field"><label htmlFor="paidAt">วันที่และเวลาที่โอน</label><input className="input" id="paidAt" type="datetime-local" value={paidAt} onChange={(event) => setPaidAt(event.target.value)} required /></div>
      {error && <p className="error-text" role="alert">{error}</p>}<button className="primary-button full-width" style={{ marginTop: 18 }} disabled={submitting}>{submitting ? "กำลังส่งสลิป..." : "ส่งสลิปให้ตรวจสอบ"}</button>
    </form>
  </div>;
}
