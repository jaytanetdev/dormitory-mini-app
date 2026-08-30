export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PENDING_PAYMENT"
  | "PENDING_REVIEW"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "REJECTED"
  | "VOID";

export interface ApiEnvelope<T> {
  data: T;
  meta?: Record<string, unknown>;
}
