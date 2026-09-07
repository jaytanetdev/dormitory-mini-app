import { afterEach, describe, expect, it, vi } from "vitest";
const raw = { id: "bill", number: "INV-1", status: "OVERDUE", total: "1000", dueDate: "2026-09-01", room: { number: "101" }, period: { year: 2026, month: 9 } };
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); delete process.env.NEXT_PUBLIC_MOCK_MODE; });
async function client(invoice: object) {
  process.env.NEXT_PUBLIC_MOCK_MODE = "false";
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: invoice }), { status: 200 })));
  return (await import("./api-client")).api;
}
describe("resident payment state", () => {
  it("shows review instead of overdue after slip submission", async () => {
    const api = await client({ ...raw, payments: [{ id: "p1", amount: "1000", status: "PENDING" }] });
    expect(await api.invoice("bill")).toMatchObject({ status: "PENDING_REVIEW", outstanding: 1000 });
  });
  it("deducts only approved amounts for partial payments", async () => {
    const api = await client({ ...raw, status: "PARTIALLY_PAID", payments: [{ amount: "400", status: "APPROVED" }, { amount: "600", status: "REJECTED" }] });
    expect(await api.invoice("bill")).toMatchObject({ status: "PARTIALLY_PAID", outstanding: 600 });
  });
  it("shows zero due on a paid invoice even with a stale pending slip", async () => {
    const api = await client({ ...raw, status: "PAID", payments: [{ amount: "1000", status: "PENDING" }] });
    expect(await api.invoice("bill")).toMatchObject({ status: "PAID", outstanding: 0 });
  });
  it("preserves individual pending and rejected history entries", async () => {
    const api = await client([{ ...raw, payments: [{ id: "a", amount: "400", status: "APPROVED" }, { id: "b", amount: "600", status: "PENDING" }, { id: "c", amount: "600", status: "REJECTED" }] }]);
    expect((await api.payments()).map(p => [p.id, p.status, p.amount])).toEqual([["a", "APPROVED", 400], ["b", "PENDING", 600], ["c", "REJECTED", 600]]);
  });
});
