"use client";
import {
  ArrowUpRight,
  Banknote,
  Bell,
  Bolt,
  ChevronRight,
  Droplets,
  History,
  Home,
  ReceiptText,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { AppLoading } from "@/components/app-loading";
import { BottomNav } from "@/components/bottom-nav";
import { StatusPill } from "@/components/status-pill";
import { useResidentRefresh } from "@/lib/use-resident-refresh";
import { api } from "@/lib/api-client";
import { formatBaht, formatThaiDate } from "@/lib/format";
import {
  balanceDue,
  needsPayment,
  newestPayments,
} from "@/lib/resident-billing";
import type { Invoice, PaymentHistoryItem, ResidentProfile } from "@/lib/types";
export default function HomePage() {
  const [data, setData] = useState<{
    profile: ResidentProfile;
    invoice: Invoice | null;
    payments: PaymentHistoryItem[];
  }>();
  const [error, setError] = useState<string>();
  const onError = useCallback(
    (reason: unknown) =>
      setError(
        reason instanceof Error ? reason.message : "โหลดข้อมูลไม่สำเร็จ",
      ),
    [],
  );
  const onData = useCallback((value: Awaited<ReturnType<typeof api.home>>) => {
    setData(value);
    setError(undefined);
  }, []);
  useResidentRefresh(api.home, onData, onError);
  if (!data && !error) return <AppLoading />;
  if (error)
    return (
      <div className="page">
        <div className="card success-panel">
          <Bell size={34} />
          <h1>ดูข้อมูลไม่ได้</h1>
          <p className="muted">{error}</p>
          <button
            className="primary-button full-width"
            onClick={() => location.reload()}
          >
            ลองอีกครั้ง
          </button>
        </div>
      </div>
    );
  if (!data) return null;
  const invoice = data.invoice;
  const recent = newestPayments(data.payments).slice(0, 2);
  const water = invoice?.meters.find((meter) => meter.type === "WATER");
  const electric = invoice?.meters.find((meter) => meter.type === "ELECTRIC");
  return (
    <>
      <div className="page resident-home">
        <header className="resident-room-head">
          <div>
            <p>{data.profile.displayName}</p>
            <h1>ห้อง {data.profile.room.number}</h1>
            <span>{data.profile.room.branch}</span>
          </div>
          <span className="resident-room-icon">
            <Home size={25} />
          </span>
        </header>
        {invoice ? (
          <section
            className={
              "resident-focus-card " +
              (invoice.status === "PAID" ? "settled" : "")
            }
            aria-label="บิลที่ต้องดูแล"
          >
            <div className="resident-focus-top">
              <span>{invoice.periodLabel}</span>
              <StatusPill status={invoice.status} />
            </div>
            <p className="resident-focus-label">ยอดคงเหลือ</p>
            <strong className="resident-focus-amount">
              ฿{formatBaht(balanceDue(invoice))}
            </strong>
            <p className="resident-focus-due">
              {invoice.status === "PAID"
                ? "ชำระครบแล้ว"
                : invoice.status === "PENDING_REVIEW"
                  ? "ได้รับสลิปแล้ว ไม่ต้องโอนซ้ำ"
                  : "ครบกำหนด " + formatThaiDate(invoice.dueAt)}
            </p>
            {needsPayment(invoice) ? (
              <Link href={"/pay/" + invoice.id} className="focus-pay-button">
                <Banknote size={19} />
                ชำระบิลนี้
                <ArrowUpRight size={19} />
              </Link>
            ) : (
              <Link
                href={"/invoices/" + invoice.id}
                className="focus-pay-button"
              >
                {invoice.status === "PENDING_REVIEW"
                  ? "ดูผลตรวจสลิป"
                  : "ดูรายละเอียดบิล"}
                <ArrowUpRight size={19} />
              </Link>
            )}
          </section>
        ) : (
          <section className="card success-panel">
            <ReceiptText size={34} />
            <h2>ยังไม่มีบิลที่ต้องชำระ</h2>
            <p className="muted">บิลจะแสดงที่นี่เมื่อเจ้าหน้าที่ออกบิล</p>
          </section>
        )}
        <nav className="resident-shortcuts" aria-label="ทางลัด">
          <Link href="/invoices">
            <span className="shortcut-icon">
              <ReceiptText size={21} />
            </span>
            <strong>บิลทั้งหมด</strong>
            <ChevronRight size={16} />
          </Link>
          <Link href="/payments">
            <span className="shortcut-icon">
              <History size={21} />
            </span>
            <strong>ประวัติการชำระ</strong>
            <ChevronRight size={16} />
          </Link>
        </nav>
        {invoice && (
          <section className="section">
            <div className="section-heading">
              <h2>ค่าใช้จ่ายในบิล</h2>
              <Link className="text-link" href={"/invoices/" + invoice.id}>
                ดูรายละเอียด
              </Link>
            </div>
            <div className="card ledger resident-costs">
              {[
                {
                  label: "ค่าเช่าและบริการ",
                  icon: ReceiptText,
                  amount: invoice.items.reduce(
                    (sum, item) => sum + item.amount,
                    0,
                  ),
                },
                { label: "ค่าน้ำ", icon: Droplets, amount: water?.amount ?? 0 },
                { label: "ค่าไฟ", icon: Bolt, amount: electric?.amount ?? 0 },
              ].map(({ label, icon: ItemIcon, amount }) => (
                <div className="ledger-row" key={label}>
                  <span className="ledger-label">
                    <ItemIcon size={18} />
                    {label}
                  </span>
                  <strong>฿{formatBaht(amount)}</strong>
                </div>
              ))}
            </div>
          </section>
        )}
        <section className="section">
          <div className="section-heading">
            <h2>ชำระล่าสุด</h2>
            <Link className="text-link" href="/payments">
              ดูทั้งหมด
            </Link>
          </div>
          <div className="card recent-payment-list">
            {recent.length ? (
              recent.map((payment) => (
                <Link href={"/invoices/" + payment.invoiceId} key={payment.id}>
                  <span className="recent-payment-icon">
                    <ReceiptText size={18} />
                  </span>
                  <div>
                    <strong>{payment.periodLabel}</strong>
                    <small>
                      {payment.paidAt
                        ? formatThaiDate(payment.paidAt)
                        : "ไม่ระบุวันโอน"}
                    </small>
                  </div>
                  <div className="recent-payment-value">
                    <strong>฿{formatBaht(payment.amount)}</strong>
                    <StatusPill
                      status={
                        payment.status === "APPROVED"
                          ? "PAID"
                          : payment.status === "PENDING"
                            ? "PENDING_REVIEW"
                            : "REJECTED"
                      }
                    />
                  </div>
                  <ChevronRight size={15} />
                </Link>
              ))
            ) : (
              <p className="resident-empty-note">
                ยังไม่มีประวัติ เมื่อส่งสลิปจะดูผลได้ที่นี่
              </p>
            )}
          </div>
        </section>
      </div>
      <BottomNav />
    </>
  );
}
