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
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { accessToken: "resident-jwt", expiresInSeconds: 3600 } }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("./api-client");

    await expect(api.createResidentSession("line-id-token")).resolves.toEqual({ accessToken: "resident-jwt", expiresInSeconds: 3600 });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:4000/v1/miniapp/auth/line", expect.objectContaining({ method: "POST", body: JSON.stringify({ idToken: "line-id-token" }) }));
  });

  it("only enables mock mode when explicitly true", async () => {
    process.env.NEXT_PUBLIC_MOCK_MODE = "true";
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { api } = await import("./api-client");

    expect(api.isMock).toBe(true);
    await expect(api.createResidentSession("unused")).resolves.toMatchObject({ accessToken: "mock-resident-session" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
