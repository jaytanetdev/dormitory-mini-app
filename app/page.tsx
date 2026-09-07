"use client";

import { Banknote, Bell, Bolt, ChevronRight, Droplets, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import type { Invoice, PaymentHistoryItem, ResidentProfile } from "@/lib/types";

export default function HomePage() {
  const [data, setData] = useState<{ profile: ResidentProfile; invoice: Invoice; payments: PaymentHistoryItem[] }>();
  const [error, setError] = useState<string>();
  const handleError = useCallback((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ"), []);
  const handleData = useCallback((value: Awaited<ReturnType<typeof api.home>>) => { setData(value); setError(undefined); }, []);
  useResidentRefresh(api.home, handleData, handleError);
  if (!data && !error) return <AppLoading />;
  if (error) return <div className="page"><div className="card success-panel"><Bell size={34} /><h1>ดูข้อมูลไม่ได้</h1><p className="muted">{error}</p><button className="primary-button full-width" onClick={() => location.reload()}>ลองอีกครั้ง</button></div></div>;
  if (!data) return null;
  const water = data.invoice.meters.find((meter) => meter.type === "WATER");
  const electric = data.invoice.meters.find((meter) => meter.type === "ELECTRIC");
  return <>
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">ยินดีต้อนรับกลับ</p><h1 className="page-title">{data.profile.displayName}</h1></div><Link href="/payments" className="back-link" aria-label="ประวัติการชำระ"><ReceiptText size={20} /></Link></header>
      <section aria-label="ข้อมูลห้องและยอดปัจจุบัน">
        <div className="door-card"><div className="door-top"><span className="brand-mark"><span className="brand-dot" />อยู่ดี</span><span className="small">{data.profile.room.branch}</span></div><h2 className="room-number">ห้อง {data.profile.room.number}</h2><p className="room-meta">{data.profile.room.building} · {data.profile.room.contractStatus === "ENDED" ? "สิ้นสุดสัญญาแล้ว" : "สัญญารายเดือน"}</p></div>
        <div className="card balance-card"><div className="balance-row"><div><p className="eyebrow">{data.invoice.status === "PENDING_REVIEW" ? "ยอดที่ส่งตรวจสอบ" : "ยอดที่ต้องชำระ"}</p><p className="amount">฿{formatBaht(data.invoice.outstanding ?? (data.invoice.status === "PAID" ? 0 : data.invoice.total))}</p><p className="muted small">{data.invoice.status === "PAID" ? "ชำระครบแล้ว ขอบคุณครับ" : data.invoice.status === "PENDING_REVIEW" ? "ได้รับสลิปแล้ว ไม่ต้องโอนซ้ำ" : "ภายใน " + formatThaiDate(data.invoice.dueAt)}</p></div><StatusPill status={data.invoice.status} /></div>{["ISSUED", "PENDING_PAYMENT", "PARTIALLY_PAID", "OVERDUE", "REJECTED"].includes(data.invoice.status) && <Link href={`/pay/${data.invoice.id}`} className="primary-button full-width" style={{ marginTop: 16 }}><Banknote size={19} />ชำระบิลนี้</Link>}</div>
      </section>
      <section className="section"><div className="section-heading"><h2>บิลเดือนนี้</h2><Link className="text-link" href={`/invoices/${data.invoice.id}`}>ดูรายละเอียด</Link></div><div className="card ledger">
        <div className="ledger-row"><div className="ledger-label"><span className="icon-box"><ReceiptText size={18} /></span><div><p>ค่าเช่าห้องและบริการ</p><p className="muted small">{data.invoice.items.length} รายการ</p></div></div><p className="ledger-value">฿{formatBaht(data.invoice.items.reduce((sum, item) => sum + item.amount, 0))}</p></div>
        <div className="ledger-row"><div className="ledger-label"><span className="icon-box teal"><Droplets size={18} /></span><div><p>ค่าน้ำ</p><p className="muted small">{water?.units ?? 0} หน่วย × ฿{water?.rate ?? 0}</p></div></div><p className="ledger-value">฿{formatBaht(water?.amount ?? 0)}</p></div>
        <div className="ledger-row"><div className="ledger-label"><span className="icon-box"><Bolt size={18} /></span><div><p>ค่าไฟ</p><p className="muted small">{electric?.units ?? 0} หน่วย × ฿{electric?.rate ?? 0}</p></div></div><p className="ledger-value">฿{formatBaht(electric?.amount ?? 0)}</p></div>
      </div></section>
      <section className="section"><div className="section-heading"><h2>ชำระล่าสุด</h2><Link className="text-link" href="/payments">ดูทั้งหมด</Link></div><div className="history-list">{data.payments.slice(0, 2).map((payment) => <Link href={`/invoices/${payment.invoiceId}`} className="card history-item" key={payment.id}><div className="history-main"><span className="month-box"><ReceiptText size={20} /></span><div><p>{payment.periodLabel}</p><StatusPill status={payment.status === "APPROVED" ? "PAID" : payment.status === "PENDING" ? "PENDING_REVIEW" : "REJECTED"} /><p className="muted small">{payment.paidAt ? formatThaiDate(payment.paidAt) : "รอตรวจสอบ"}</p></div></div><div className="history-amount">฿{formatBaht(payment.amount)}<ChevronRight size={15} style={{ display: "inline", marginLeft: 3 }} /></div></Link>)}</div></section>
    </div><BottomNav />
  </>;
}
