import type { Invoice, PaymentHistoryItem } from "./types";

export function balanceDue(invoice: Invoice): number {
  return invoice.status === "PAID" || invoice.status === "VOID"
    ? 0
    : Math.max(0, invoice.outstanding ?? invoice.total);
}
export function needsPayment(invoice: Invoice): boolean {
  return (
    balanceDue(invoice) > 0 &&
    !["PENDING_REVIEW", "DRAFT", "VOID"].includes(invoice.status)
  );
}
export function newestPayments(
  items: PaymentHistoryItem[],
): PaymentHistoryItem[] {
  const time = (item: PaymentHistoryItem) => {
    const value = Date.parse(item.createdAt ?? item.paidAt ?? "");
    return Number.isNaN(value) ? 0 : value;
  };
  return [...items].sort((a, b) => time(b) - time(a));
}
