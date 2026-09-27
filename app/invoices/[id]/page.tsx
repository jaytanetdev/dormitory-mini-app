"use client";
import { ArrowLeft, Bolt, Droplets, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { balanceDue, needsPayment } from "@/lib/resident-billing";
import { formatBaht, formatThaiDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";
export default function InvoicePage() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice>();
  const [error, setError] = useState<string>();
  const load = useCallback(() => api.invoice(id), [id]);
  const onData = useCallback((value: Invoice) => {
    setInvoice(value);
    setError(undefined);
  }, []);
  const onError = useCallback(
    (reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "โหลดบิลไม่สำเร็จ"),
    [],
  );
  useResidentRefresh(load, onData, onError);
  useEffect(() => {
    if (invoice?.id && window.location.hash === "#bill-payments") {
      document
        .getElementById("bill-payments")
        ?.scrollIntoView({ block: "start" });
    }
  }, [invoice?.id]);
  if (error && !invoice)
    return (
      <div className="page">
        <p role="alert" className="error-text">
          {error}
        </p>
        <Link href="/invoices" className="secondary-button full-width">
          กลับไปที่บิลของฉัน
        </Link>
      </div>
    );
  if (!invoice) return <AppLoading />;
  return (
    <>
      <div className="page resident-invoice">
        <header className="page-head">
          <Link
            href="/invoices"
            className="back-link"
            aria-label="กลับไปที่บิลของฉัน"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">รายละเอียดบิล</h1>
            <p className="muted small">ห้อง {invoice.roomNumber}</p>
          </div>
        </header>
        <section className="card invoice-hero">
          <div className="invoice-hero-top">
            <div>
              <h2>{invoice.periodLabel}</h2>
              <p className="muted small">{invoice.number}</p>
            </div>
            <StatusPill status={invoice.status} />
          </div>
          <div className="invoice-total">
            <span className="muted">ยอดบิล</span>
            <strong>฿{formatBaht(invoice.total)}</strong>
          </div>
          <p className="invoice-due">
            ครบกำหนด {formatThaiDate(invoice.dueAt)}
          </p>
          {needsPayment(invoice) && (
            <Link
              href={"/pay/" + invoice.id}
              className="primary-button full-width"
            >
              ชำระ ฿{formatBaht(balanceDue(invoice))}
            </Link>
          )}
          {invoice.status === "PENDING_REVIEW" && (
            <a className="secondary-button full-width" href="#bill-payments">
              ดูสลิปที่ส่ง
            </a>
          )}
        </section>
        {invoice.status === "PENDING_REVIEW" && (
          <p className="payment-state-note" role="status">
            ได้รับสลิปแล้ว รอเจ้าหน้าที่ตรวจสอบ ไม่ต้องโอนซ้ำ
          </p>
        )}
        <section className="section">
          <div className="section-heading">
            <h2>ค่าเช่าและบริการ</h2>
          </div>
          <div className="card ledger">
            {invoice.items.map((item) => (
              <div className="ledger-row" key={item.id}>
                <span>{item.label}</span>
                <strong>฿{formatBaht(item.amount)}</strong>
              </div>
            ))}
          </div>
        </section>
        {invoice.meters.length > 0 && (
          <section className="section">
            <div className="section-heading">
              <h2>ค่าน้ำและค่าไฟ</h2>
            </div>
            <div className="resident-meter-list">
              {invoice.meters.map((meter) => (
                <div className="card resident-meter" key={meter.type}>
                  <div className="resident-meter-top">
                    <span
                      className={
                        "icon-box " + (meter.type === "WATER" ? "teal" : "")
                      }
                    >
                      {meter.type === "WATER" ? (
                        <Droplets size={20} />
                      ) : (
                        <Bolt size={20} />
                      )}
                    </span>
                    <div>
                      <strong>
                        {meter.type === "WATER" ? "ค่าน้ำ" : "ค่าไฟ"}
                      </strong>
                      <p>
                        {meter.units} หน่วย × ฿{meter.rate}
                      </p>
                    </div>
                    <b>฿{formatBaht(meter.amount)}</b>
                  </div>
                  <details>
                    <summary>ดูเลขมิเตอร์</summary>
                    <dl>
                      <div>
                        <dt>ครั้งก่อน</dt>
                        <dd>{meter.previous}</dd>
                      </div>
                      <div>
                        <dt>ครั้งล่าสุด</dt>
                        <dd>{meter.current}</dd>
                      </div>
                    </dl>
                  </details>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="section" id="bill-payments">
          <div className="section-heading">
            <h2>การชำระบิลนี้</h2>
            <Link className="text-link" href="/payments">
              ประวัติทั้งหมด
            </Link>
          </div>
          <div className="card ledger">
            <div className="ledger-row invoice-balance">
              <span>ยอดคงเหลือ</span>
              <strong>฿{formatBaht(balanceDue(invoice))}</strong>
            </div>
            {invoice.payments?.length ? (
              invoice.payments.map((payment) => (
                <div className="resident-payment-detail" key={payment.id}>
                  <div className="payment-history-top">
                    <strong>฿{formatBaht(payment.amount)}</strong>
                    <StatusPill
                      status={
                        payment.status === "APPROVED"
                          ? "PAID"
                          : payment.status === "REJECTED"
                            ? "REJECTED"
                            : "PENDING_REVIEW"
                      }
                    />
                  </div>
                  <p className="muted small">
                    {payment.paidAt
                      ? "โอน " + formatThaiDate(payment.paidAt)
                      : "ไม่ระบุวันโอน"}
                  </p>
                  {payment.rejectReason && (
                    <p className="error-text">เหตุผล: {payment.rejectReason}</p>
                  )}
                  {payment.receiptNumber && (
                    <p className="small">ใบเสร็จ {payment.receiptNumber}</p>
                  )}
                  {payment.slipUrl && (
                    <a
                      href={payment.slipUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-link"
                    >
                      เปิดสลิปที่ส่ง
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="resident-empty-note">
                <ReceiptText size={22} />
                <p>ยังไม่มีการส่งสลิปสำหรับบิลนี้</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <BottomNav />
    </>
  );
}
