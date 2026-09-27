"use client";

import { ArrowLeft, Bolt, Droplets } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { balanceDue } from "@/lib/resident-billing";
import { formatBaht, formatThaiDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => api.invoice(id), [id]);
  const onData = useCallback((value: Invoice) => { setInvoice(value); setError(undefined); }, []);
  const onError = useCallback((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดบิลไม่สำเร็จ"), []);
  useResidentRefresh(load, onData, onError);
  if (error && !invoice) return <div className="page"><p role="alert" className="error-text">{error}</p><Link href="/invoices" className="secondary-button full-width">กลับไปที่บิลของฉัน</Link></div>;
  if (!invoice) return <AppLoading />;
  return <><div className="page"><header className="page-head"><Link href="/invoices" className="back-link" aria-label="กลับไปที่บิลของฉัน"><ArrowLeft size={20} /></Link><div style={{ flex: 1 }}><p className="eyebrow">ใบแจ้งหนี้</p><h1 className="page-title">รายละเอียดบิล</h1></div></header>
    <section className="card invoice-hero"><div className="invoice-hero-top"><div><p className="eyebrow">{invoice.number}</p><h2>{invoice.periodLabel}</h2><p className="muted small">ห้อง {invoice.roomNumber} · ครบกำหนด {formatThaiDate(invoice.dueAt)}</p></div><StatusPill status={invoice.status} /></div><div className="invoice-total"><span className="muted">ยอดสุทธิ</span><strong>฿{formatBaht(invoice.total)}</strong></div></section>
    {invoice.status === "PENDING_REVIEW" && <p className="payment-state-note" role="status">ได้รับสลิปแล้ว กำลังรอเจ้าหน้าที่ตรวจสอบ ไม่ต้องโอนซ้ำ</p>}<section className="section"><div className="section-heading"><h2>ค่าใช้จ่ายประจำ</h2></div><div className="card ledger">{invoice.items.map((item) => <div className="ledger-row" key={item.id}><p>{item.label}</p><p className="ledger-value">฿{formatBaht(item.amount)}</p></div>)}</div></section>
    <section className="section"><div className="section-heading"><h2>มิเตอร์เดือนนี้</h2></div>{invoice.meters.map((meter) => <div className="card meter-wrap" style={{ marginBottom: 10 }} key={meter.type}><div className="ledger-label" style={{ padding: "5px 0" }}><span className={`icon-box ${meter.type === "WATER" ? "teal" : ""}`}>{meter.type === "WATER" ? <Droplets size={18} /> : <Bolt size={18} />}</span><strong>{meter.type === "WATER" ? "น้ำประปา" : "ไฟฟ้า"}</strong></div><table className="meter-table"><thead><tr><th>มิเตอร์</th><th>ก่อน</th><th>ล่าสุด</th><th>หน่วย</th><th>บาท/หน่วย</th></tr></thead><tbody><tr><td>{meter.type === "WATER" ? "น้ำ" : "ไฟ"}</td><td>{meter.previous}</td><td>{meter.current}</td><td>{meter.units}</td><td>{meter.rate}</td></tr></tbody></table><div className="ledger-row" style={{ padding: "13px 2px 2px" }}><strong>รวม{meter.type === "WATER" ? "ค่าน้ำ" : "ค่าไฟ"}</strong><strong>฿{formatBaht(meter.amount)}</strong></div></div>)}</section>
    <section className="section"><div className="section-heading"><h2>การชำระบิลนี้</h2><Link className="text-link" href="/payments">ประวัติทั้งหมด</Link></div><div className="card ledger"><div className="ledger-row"><span>ยอดคงเหลือ</span><strong>฿{formatBaht(balanceDue(invoice))}</strong></div>{invoice.payments?.length ? invoice.payments.map(payment=><div className="resident-payment-detail" key={payment.id}><div className="payment-history-top"><strong>฿{formatBaht(payment.amount)}</strong><span className={"status-pill "+(payment.status === "APPROVED" ? "paid" : payment.status === "REJECTED" ? "overdue" : "pending")}>{payment.status === "APPROVED" ? "ตรวจผ่านแล้ว" : payment.status === "REJECTED" ? "สลิปไม่ผ่าน" : "รอตรวจสอบ"}</span></div><p className="muted small">{payment.paidAt ? "โอน "+formatThaiDate(payment.paidAt) : "ไม่ระบุวันโอน"}</p>{payment.rejectReason && <p className="error-text">เหตุผล: {payment.rejectReason}</p>}{payment.receiptNumber && <p className="small">ใบเสร็จ {payment.receiptNumber}</p>}{payment.slipUrl && <a href={payment.slipUrl} target="_blank" rel="noopener noreferrer" className="text-link">เปิดสลิปที่ส่ง</a>}</div>) : <p className="muted small" style={{padding:16}}>ยังไม่มีการส่งสลิปสำหรับบิลนี้</p>}</div></section>
    {["ISSUED", "PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE", "REJECTED"].includes(invoice.status) && <Link href={`/pay/${invoice.id}`} className="primary-button full-width" style={{ marginTop: 22 }}>ชำระ ฿{formatBaht(invoice.outstanding ?? invoice.total)}</Link>}
  </div><BottomNav /></>;
}
