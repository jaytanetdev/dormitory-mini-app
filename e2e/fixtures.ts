/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful test fixtures intentionally model varying API response shapes. */
import { test as base, expect, type Page } from "@playwright/test";
export type State = {
  invoices: any[];
  unlinked: boolean;
  fail: string;
  requests: { path: string; method: string; body: string | null }[];
};
export const bill = (id = "due", status = "ISSUED", payments: any[] = []) => ({
  id,
  number: "INV-" + id,
  status,
  total: 5000,
  dueDate: "2026-09-05T00:00:00Z",
  room: { number: "101" },
  period: { year: 2026, month: 9 },
  items: [
    {
      id: "rent",
      code: "RENT",
      description: "ค่าเช่าห้อง",
      quantity: 1,
      unitPrice: 5000,
      amount: 5000,
    },
  ],
  payments,
});
export const profile = {
  id: "resident",
  fullName: "ลูกบ้านทดสอบ",
  branch: { id: "branch", name: "สาขาทดสอบ" },
  contracts: [
    {
      status: "ACTIVE",
      room: {
        id: "room",
        number: "101",
        building: { name: "อาคาร A", property: { name: "หอทดสอบ" } },
      },
    },
  ],
};
export const test = base.extend<{ state: State }>({
  state: [
    async ({ page }, use) => {
      const state: State = {
        invoices: [
          bill(),
          bill("paid", "PAID", [
            {
              id: "approved",
              amount: 5000,
              status: "APPROVED",
              paidAt: "2026-08-05T00:00:00Z",
              receipt: { number: "RC-QA-001" },
            },
          ]),
        ],
        unlinked: false,
        fail: "",
        requests: [],
      };
      await page.route("http://127.0.0.1:3199/v1/**", async (route) => {
        const request = route.request(),
          path = new URL(request.url()).pathname.replace("/v1", "");
        state.requests.push({
          path,
          method: request.method(),
          body: request.postData(),
        });
        const send = (data: unknown, status = 200) =>
          route.fulfill({
            status,
            contentType: "application/json",
            headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify(
              status >= 400 ? { errors: [{ message: data }] } : { data },
            ),
          });
        if (request.method() === "OPTIONS")
          return route.fulfill({
            status: 204,
            headers: {
              "access-control-allow-origin": "*",
              "access-control-allow-headers": "*",
              "access-control-allow-methods": "*",
            },
          });
        if (state.fail && path.includes(state.fail))
          return send("ทดสอบระบบขัดข้อง", 500);
        if (path === "/miniapp/auth/line")
          return send(
            state.unlinked
              ? "ยังไม่ได้ผูกห้อง"
              : { accessToken: "qa-resident", expiresInSeconds: 3600 },
            state.unlinked ? 401 : 200,
          );
        if (path === "/miniapp/me") return send(profile);
        if (path === "/miniapp/home")
          return send({
            profile,
            invoices: state.invoices,
            invoice: state.invoices.find((i) => i.status !== "PAID") ?? null,
          });
        if (path === "/miniapp/invoices") return send(state.invoices);
        if (path.startsWith("/miniapp/invoices/")) {
          const id = path.split("/")[3],
            invoice = state.invoices.find((i) => i.id === id);
          if (!invoice) return send("ไม่พบบิล", 404);
          if (path.endsWith("/payment-qr"))
            return send({
              amount:
                5000 -
                (invoice.payments ?? [])
                  .filter((p: any) => p.status === "APPROVED")
                  .reduce((s: number, p: any) => s + Number(p.amount), 0),
              accountName: "บัญชีทดสอบ",
              promptPayTarget: "0812345678",
              qrDataUrl:
                "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
            });
          return send(invoice);
        }
        if (path === "/miniapp/payments/slip") {
          state.invoices[0].payments.push({
            id: "new-slip",
            status: "PENDING",
            amount: 5000,
            paidAt: "2026-09-06T10:00:00Z",
          });
          return send({ id: "new-slip" });
        }
        if (path.endsWith("/claim")) {
          state.unlinked = false;
          return send({
            accessToken: "claimed",
            expiresInSeconds: 3600,
            resident: { id: "resident" },
          });
        }
        if (path.startsWith("/miniapp/invites/"))
          return path.includes("expired")
            ? send("ลิงก์หมดอายุ", 410)
            : send({
                expiresAt: "2026-10-01",
                room: { number: "101" },
                property: { name: "หอทดสอบ" },
                branch: { name: "สาขาทดสอบ" },
              });
        if (path.startsWith("/miniapp/branches/"))
          return send({
            branch: { name: "สาขาทดสอบ", address: "กรุงเทพฯ" },
            line: { displayName: "หอทดสอบ", liffId: "e2e-liff" },
          });
        throw new Error(
          "Unhandled API request " + request.method() + " " + path,
        );
      });
      await use(state);
    },
    { auto: true },
  ],
});
export { expect };
export async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 2,
    ),
  ).toBeTruthy();
}
