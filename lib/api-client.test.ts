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
    const fetchMock = vi.fn().mockResolvedValue(
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

describe("resident API failure and upload contracts", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_MOCK_MODE;
  });
  const load = async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "false";
    return (await import("./api-client")).api;
  };
  it.each([401, 403, 409, 500])(
    "preserves HTTP %s errors from the API envelope",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockResolvedValue(
            new Response(
              JSON.stringify({ errors: [{ message: "server-message" }] }),
              { status },
            ),
          ),
      );
      const api = await load();
      await expect(api.invoices()).rejects.toMatchObject({
        status,
        message: "server-message",
      });
    },
  );
  it("handles network failure as 503", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(Error("offline")));
    await expect((await load()).invoices()).rejects.toMatchObject({
      status: 503,
    });
  });
  it("rejects non-JSON success response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>bad gateway</html>")),
    );
    await expect((await load()).invoices()).rejects.toMatchObject({
      status: 502,
    });
  });
  it("aborts requests that exceed timeout", async () => {
    const api = await load();
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url, options) =>
          new Promise((_resolve, reject) =>
            options.signal.addEventListener("abort", () =>
              reject(new DOMException("aborted", "AbortError")),
            ),
          ),
      ),
    );
    const result = api.invoices();
    const assertion = expect(result).rejects.toMatchObject({ status: 504 });
    await vi.advanceTimersByTimeAsync(20000);
    await assertion;
  });
  it("uploads multipart with resident token and server payment id", async () => {
    const values = new Map([["resident_access_token", "resident-jwt"]]);
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => values.get(key),
      setItem: (key: string, value: string) => values.set(key, value),
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "payment" } })),
      );
    vi.stubGlobal("fetch", fetchMock);
    const api = await load();
    const file = new File(["png"], "slip.png", { type: "image/png" });
    expect(
      await api.uploadSlip("invoice", file, "2026-09-06T10:00:00Z", 3000),
    ).toEqual({ paymentId: "payment" });
    const options = fetchMock.mock.calls[0][1];
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("invoiceId")).toBe("invoice");
    expect(options.body.get("amount")).toBe("3000");
    expect(options.headers.Authorization).toBe("Bearer resident-jwt");
    expect(options.headers).not.toHaveProperty("Content-Type");
  });
  it("claim stores returned resident token", async () => {
    const setItem = vi.fn();
    vi.stubGlobal("window", {});
    vi.stubGlobal("sessionStorage", { getItem: () => null, setItem });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({
              data: { accessToken: "claimed", expiresInSeconds: 3600 },
            }),
          ),
        ),
    );
    await (
      await load()
    ).claimBranch("branch", {
      idToken: "line",
      fullName: "test",
      roomNumber: "101",
    });
    expect(setItem).toHaveBeenCalledWith("resident_access_token", "claimed");
  });
});
