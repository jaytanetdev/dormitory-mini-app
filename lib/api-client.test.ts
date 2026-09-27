import { afterEach, describe, expect, it, vi } from "vitest";

describe("resident authentication contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it("exchanges a LINE ID token at the resident auth endpoint", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({
            data: { accessToken: "resident-jwt", expiresInSeconds: 3600 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("./api-client");

    await expect(api.createResidentSession("line-id-token")).resolves.toEqual({
      accessToken: "resident-jwt",
      expiresInSeconds: 3600,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:4000/v1/miniapp/auth/line",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ idToken: "line-id-token" }),
      }),
    );
  });

  it("only enables mock mode when explicitly true", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("./api-client");

    expect(api.isMock).toBe(true);
    await expect(api.createResidentSession("unused")).resolves.toMatchObject({
      accessToken: "mock-resident-session",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("keeps slip results, rejection reasons and receipt numbers separate from the balance", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              id: "bill-1",
              number: "INV-1",
              status: "PARTIALLY_PAID",
              total: "5000",
              dueDate: "2026-09-30",
              room: { number: "101" },
              period: { year: 2026, month: 9 },
              payments: [
                {
                  id: "approved",
                  amount: "2000",
                  status: "APPROVED",
                  receipt: { number: "RC-1" },
                },
                {
                  id: "pending",
                  amount: "3000",
                  status: "PENDING",
                  createdAt: "2026-09-27T10:00:00Z",
                },
                {
                  id: "rejected",
                  amount: "5000",
                  status: "REJECTED",
                  rejectReason: "ยอดไม่ตรง",
                  slip: { fileUrl: "https://example.test/slip.png" },
                },
              ],
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const { api } = await import("./api-client");
    const invoice = await api.invoice("bill-1");
    expect(invoice.outstanding).toBe(3000);
    expect(invoice.status).toBe("PENDING_REVIEW");
    expect(invoice.payments?.[0].receiptNumber).toBe("RC-1");
    expect(invoice.payments?.[2]).toMatchObject({
      status: "REJECTED",
      rejectReason: "ยอดไม่ตรง",
      slipUrl: "https://example.test/slip.png",
    });
  });
});
