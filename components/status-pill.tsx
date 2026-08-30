import type { InvoiceStatus } from "@/lib/contracts";
import { CheckCircle2, Clock3, TriangleAlert } from "lucide-react";

const labels: Record<InvoiceStatus, string> = {
  DRAFT: "ฉบับร่าง", ISSUED: "ออกบิลแล้ว", PENDING_PAYMENT: "รอชำระ", PENDING_REVIEW: "กำลังตรวจสลิป",
  PARTIALLY_PAID: "ชำระบางส่วน", PAID: "ชำระแล้ว", OVERDUE: "เกินกำหนด", REJECTED: "สลิปไม่ผ่าน", VOID: "ยกเลิก",
};

export function StatusPill({ status }: { status: InvoiceStatus }) {
  const className = status === "PAID" ? "paid" : status === "OVERDUE" || status === "REJECTED" ? "overdue" : "pending";
  const Icon = className === "paid" ? CheckCircle2 : className === "overdue" ? TriangleAlert : Clock3;
  return <span className={`status-pill ${className}`}><Icon size={14} aria-hidden="true" />{labels[status]}</span>;
}
