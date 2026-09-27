import { describe, expect, it } from "vitest";
import { balanceDue, needsPayment, newestPayments } from "./resident-billing";
import { mockInvoices } from "./mock-data";
describe("resident bill actions", () => {
  it("shows remaining balance for partially paid bills", () => {
    const bill = {
      ...mockInvoices[0],
      status: "PARTIALLY_PAID" as const,
      outstanding: 1200,
    };
    expect(balanceDue(bill)).toBe(1200);
    expect(needsPayment(bill)).toBe(true);
  });
  it("never asks residents to pay again while a slip is pending or a bill is paid", () => {
    expect(needsPayment({ ...mockInvoices[0], status: "PENDING_REVIEW" })).toBe(
      false,
    );
    expect(needsPayment({ ...mockInvoices[0], status: "PAID" })).toBe(false);
  });
  it("orders by submitted date even when bills are from different periods", () => {
    const base = {
      invoiceId: "i",
      periodLabel: "",
      amount: 1,
      status: "PENDING" as const,
    };
    expect(
      newestPayments([
        { ...base, id: "old", createdAt: "2026-09-01" },
        { ...base, id: "new", createdAt: "2026-09-27" },
      ]).map((item) => item.id),
    ).toEqual(["new", "old"]);
  });
});
