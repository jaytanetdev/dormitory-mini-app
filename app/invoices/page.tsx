"use client";

import { ArrowLeft, ChevronRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    void api.invoices()
      .then(setItems)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "โหลดรายการบิลไม่สำเร็จ"));
  }, []);

  if (!items && !error) return <AppLoading />;

  return <>
    <div className="page">
      <header className="page-head">
        <Link href="/" className="back-link" aria-label="กลับหน้าหลัก"><ArrowLeft size={20} /></Link>
        <div style={{ flex: 1 }}><p className="eyebrow">รายการเรียกเก็บ</p><h1 className="page-title">บิลของฉัน</h1></div>
      </header>
      {error ? <div className="card success-panel"><ReceiptText size={34} /><h2>โหลดรายการบิลไม่ได้</h2><p className="muted">{error}</p><button className="primary-button full-width" onClick={() => location.reload()}>ลองอีกครั้ง</button></div>
        : items?.length ? <div className="history-list">{items.map((invoice) => <Link href={`/invoices/${invoice.id}`} className="card history-item" key={invoice.id}>
          <div className="history-main"><span className="month-box"><ReceiptText size={20} /></span><div><p><strong>{invoice.periodLabel}</strong></p><p className="muted small">ครบกำหนด {formatThaiDate(invoice.dueAt)}</p></div></div>
          <div><p className="history-amount">฿{formatBaht(invoice.total)} <ChevronRight size={15} style={{ display: "inline" }} /></p><StatusPill status={invoice.status} /></div>
        </Link>)}</div>
        : <div className="card success-panel"><ReceiptText size={34} /><h2>ยังไม่มีใบแจ้งหนี้</h2><p className="muted">เมื่อเจ้าหน้าที่ออกบิล รายการจะแสดงที่หน้านี้</p></div>}
    </div>
    <BottomNav />
  </>;
}
