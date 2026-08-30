import { describe, expect, it } from "vitest";
import { createPromptPayPayload, crc16 } from "./promptpay";

describe("PromptPay payload", () => {
  it("encodes phone and exact amount with a valid CRC", () => {
    const payload = createPromptPayPayload("081-234-5678", 4724);
    expect(payload).toContain("0066812345678");
    expect(payload).toContain("54074724.00");
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
  });
  it("rejects invalid target", () => expect(() => createPromptPayPayload("123", 20)).toThrow());
});
