"use client";
import { ArrowLeft, ChevronRight, ReceiptText, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import { newestPayments } from "@/lib/resident-billing";
import type { PaymentHistoryItem } from "@/lib/types";

const filters = [
  { key: "ALL", label: "ทั้งหมด" },
  { key: "APPROVED", label: "ตรวจผ่าน" },
  { key: "PENDING", label: "รอตรวจ" },
  { key: "REJECTED", label: "ไม่ผ่าน" },
];
export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentHistoryItem[]>();
  const [error, setError] = useState<string>();
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const onData = useCallback((value: PaymentHistoryItem[]) => {
    setItems(value);
    setError(undefined);
  }, []);
  const onError = useCallback(
    (reason: unknown) =>
      setError(reason instanceof Error ? reason.message : "โหลดประวัติไม่ได้"),
    [],
  );
  useResidentRefresh(api.payments, onData, onError);
  const ordered = useMemo(() => newestPayments(items ?? []), [items]);
  const visible = ordered.filter(
    (item) =>
      (filter === "ALL" || item.status === filter) &&
      (item.periodLabel + " " + (item.invoiceNumber ?? ""))
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );
  if (!items && !error) return <AppLoading />;
  return (
    <>
      <div className="page resident-history">
        <header className="page-head">
          <Link href="/" className="back-link" aria-label="กลับหน้าหลัก">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="page-title">ประวัติการชำระ</h1>
            <p className="muted small">ติดตามผลตรวจสลิปและดูใบเสร็จ</p>
          </div>
        </header>
        {error && (
          <div className="notice" role="alert">
            {error}
            <button className="text-link" onClick={() => location.reload()}>
              ลองอีกครั้ง
            </button>
          </div>
        )}
        <section className="card history-summary">
          <div>
            <span>ชำระแล้วทั้งหมด</span>
            <strong>
              ฿
              {formatBaht(
                ordered
                  .filter((item) => item.status === "APPROVED")
                  .reduce((sum, item) => sum + item.amount, 0),
              )}
            </strong>
          </div>
          <p>
            {ordered.filter((item) => item.status === "PENDING").length}{" "}
            รายการรอตรวจสอบ
          </p>
        </section>
        <div className="resident-filters" aria-label="กรองผลตรวจสลิป">
          {filters.map((option) => (
            <button
              key={option.key}
              aria-pressed={filter === option.key}
              onClick={() => setFilter(option.key)}
            >
              {option.label}
              <span>
                {option.key === "ALL"
                  ? ordered.length
                  : ordered.filter((item) => item.status === option.key).length}
              </span>
            </button>
          ))}
        </div>
        <label className="resident-search">
          <Search size={18} />
          <input
            aria-label="ค้นหาประวัติตามเดือนหรือเลขบิล"
            placeholder="ค้นหาเดือนหรือเลขบิล"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <p className="history-count">
          {visible.length} รายการ · ล่าสุดก่อน
        </p>
        {visible.length ? (
          <div className="history-list">
            {visible.map((payment) => (
              <Link
                href={"/invoices/" + payment.invoiceId}
                className="card payment-history-row"
                key={payment.id}
              >
                <div className="payment-history-top">
                  <strong>{payment.periodLabel}</strong>
                  <b>฿{formatBaht(payment.amount)}</b>
                </div>
                <div className="payment-history-meta">
                  <span
                    className={
                      "status-pill " +
                      (payment.status === "APPROVED"
                        ? "paid"
                        : payment.status === "REJECTED"
                          ? "overdue"
                          : "pending")
                    }
                  >
                    {payment.status === "APPROVED"
                      ? "ตรวจผ่านแล้ว"
                      : payment.status === "REJECTED"
                        ? "สลิปไม่ผ่าน"
                        : "รอตรวจสอบ"}
                  </span>
                  <span>
                    {payment.paidAt
                      ? "โอน " + formatThaiDate(payment.paidAt)
                      : "ไม่ระบุวันโอน"}
                  </span>
                </div>
                {payment.rejectReason && (
                  <p className="error-text">{payment.rejectReason}</p>
                )}
                <div className="payment-history-foot">
                  <span>
                    {payment.receiptNumber
                      ? "ใบเสร็จ " + payment.receiptNumber
                      : (payment.invoiceNumber ?? "รายละเอียดการชำระ")}
                  </span>
                  <span>
                    ดูรายละเอียด <ChevronRight size={15} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          !error && (
            <div className="card success-panel">
              <ReceiptText size={32} />
              <h2>
                {ordered.length
                  ? "ไม่พบรายการที่เลือก"
                  : "ยังไม่มีประวัติการชำระ"}
              </h2>
              <p className="muted">
                {ordered.length
                  ? "เปลี่ยนตัวกรองหรือล้างคำค้นหา"
                  : "เมื่อส่งสลิป รายการและผลตรวจจะแสดงที่นี่"}
              </p>
              <Link href="/invoices" className="secondary-button full-width">
                ดูบิลของฉัน
              </Link>
            </div>
          )
        )}
      </div>
      <BottomNav />
    </>
  );
}
