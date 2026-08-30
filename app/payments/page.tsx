"use client";

import { ArrowLeft, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import type { PaymentHistoryItem } from "@/lib/types";

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentHistoryItem[]>([]);
  useEffect(() => { void api.payments().then(setItems); }, []);
  return <><div className="page"><header className="page-head"><Link href="/" className="back-link" aria-label="กลับหน้าหลัก"><ArrowLeft size={20} /></Link><div style={{ flex: 1 }}><p className="eyebrow">สมุดรับเงิน</p><h1 className="page-title">ประวัติการชำระ</h1></div></header>
    {items.length ? <div className="history-list">{items.map((payment) => <Link href={`/invoices/${payment.invoiceId}`} className="card history-item" key={payment.id}><div className="history-main"><span className="month-box"><ReceiptText size={20} /></span><div><p><strong>{payment.periodLabel}</strong></p><p className="muted small">{payment.paidAt ? `ชำระ ${formatThaiDate(payment.paidAt)}` : "รอตรวจสอบ"}</p></div></div><div><p className="history-amount">฿{formatBaht(payment.amount)}</p><span className={`status-pill ${payment.status === "APPROVED" ? "paid" : "pending"}`}>{payment.status === "APPROVED" ? "เรียบร้อย" : "รอตรวจ"}</span></div></Link>)}</div> : <div className="card success-panel"><ReceiptText size={34} /><h2>ยังไม่มีประวัติ</h2><p className="muted">รายการที่ชำระแล้วจะแสดงตรงนี้</p></div>}
  </div><BottomNav /></>;
}
