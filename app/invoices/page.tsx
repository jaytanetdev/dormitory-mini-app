"use client";
import { ArrowLeft, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { balanceDue, needsPayment } from "@/lib/resident-billing";
import type { Invoice } from "@/lib/types";
export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState("DUE");
  const onError = useCallback(
    (reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "โหลดบิลไม่ได้"),
    [],
  );
  const onData = useCallback((value: Invoice[]) => {
    setItems(value);
    setError(undefined);
  }, []);
  useResidentRefresh(api.invoices, onData, onError);
  if (!items && !error) return <AppLoading />;
  const all = items ?? [];
  const outstanding = all.reduce((sum, item) => sum + balanceDue(item), 0);
  const visible = all.filter(
    (item) =>
      filter === "ALL" ||
      (filter === "DUE" ? balanceDue(item) > 0 : item.status === "PAID"),
  );
  return (
    <>
      <div className="page">
        <header className="page-head">
          <Link href="/" className="back-link" aria-label="กลับหน้าหลัก">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">บิลของฉัน</h1>
            <p className="muted small">เลือกบิลเพื่อดูรายละเอียดหรือชำระเงิน</p>
          </div>
        </header>
        {error && (
          <p role="alert" className="notice">
            {error}
            <button className="text-link" onClick={() => location.reload()}>
              ลองอีกครั้ง
            </button>
          </p>
        )}
        <section className="card history-summary">
          <div>
            <span>ยอดคงเหลือทุกบิล</span>
            <strong>฿{formatBaht(outstanding)}</strong>
          </div>
          <p>หักยอดที่เจ้าหน้าที่อนุมัติแล้ว</p>
        </section>
        <div className="resident-filters" aria-label="กรองบิล">
          {[
            { key: "DUE", label: "ยังชำระไม่ครบ" },
            { key: "PAID", label: "ชำระครบแล้ว" },
            { key: "ALL", label: "ทั้งหมด" },
          ].map((item) => (
            <button
              key={item.key}
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {visible.length ? (
          <div className="history-list">
            {visible.map((invoice) => (
              <article className="card payment-history-row" key={invoice.id}>
                <div className="payment-history-top">
                  <strong>{invoice.periodLabel}</strong>
                  <StatusPill status={invoice.status} />
                </div>
                <p className="muted small">
                  {invoice.number} · ห้อง {invoice.roomNumber}
                </p>
                <div className="resident-bill-balance">
                  <span>
                    {invoice.status === "PAID" ? "ยอดบิล" : "คงเหลือ"}
                  </span>
                  <b>
                    ฿
                    {formatBaht(
                      invoice.status === "PAID"
                        ? invoice.total
                        : balanceDue(invoice),
                    )}
                  </b>
                </div>
                <p className="muted small">
                  ครบกำหนด {formatThaiDate(invoice.dueAt)}
                </p>
                {invoice.status === "PENDING_REVIEW" && (
                  <p className="review-hint">
                    ได้รับสลิปแล้ว รอตรวจสอบ ไม่ต้องโอนซ้ำ
                  </p>
                )}
                <div className="resident-bill-actions">
                  <Link
                    href={"/invoices/" + invoice.id}
                    className="secondary-button"
                  >
                    ดูบิล
                  </Link>
                  {needsPayment(invoice) && (
                    <Link
                      href={"/pay/" + invoice.id}
                      className="primary-button"
                    >
                      ชำระบิลนี้
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          !error && (
            <div className="card success-panel">
              <ReceiptText size={32} />
              <h2>
                {all.length ? "ไม่มีบิลในกลุ่มนี้" : "ยังไม่มีใบแจ้งหนี้"}
              </h2>
              <p className="muted">
                {all.length
                  ? "เลือกทั้งหมดเพื่อดูบิลย้อนหลัง"
                  : "เมื่อเจ้าหน้าที่ออกบิล รายการจะแสดงที่นี่"}
              </p>
              {all.length > 0 && (
                <button
                  className="secondary-button full-width"
                  onClick={() => setFilter("ALL")}
                >
                  ดูบิลทั้งหมด
                </button>
              )}
            </div>
          )
        )}
      </div>
      <BottomNav />
    </>
  );
}
