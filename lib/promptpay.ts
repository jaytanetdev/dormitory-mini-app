const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

export function crc16(payload: string): string {
  let crc = 0xffff;
  for (let index = 0; index < payload.length; index += 1) {
    crc ^= payload.charCodeAt(index) << 8;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function normalizeTarget(raw: string): { tag: "01" | "02"; value: string } {
  const target = raw.replace(/\D/g, "");
  if (target.length === 10 && target.startsWith("0")) return { tag: "01", value: `0066${target.slice(1)}` };
  if (target.length === 13) return { tag: "02", value: target };
  throw new Error("PromptPay ID ต้องเป็นเบอร์โทร 10 หลัก หรือเลขประจำตัว 13 หลัก");
}

export function createPromptPayPayload(promptPayId: string, amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("ยอดชำระต้องมากกว่า 0 บาท");
  const target = normalizeTarget(promptPayId);
  const merchantInfo = field("00", "A000000677010111") + field(target.tag, target.value);
  const body = field("00", "01") + field("01", "12") + field("29", merchantInfo) + field("53", "764") + field("54", amount.toFixed(2)) + field("58", "TH") + "6304";
  return body + crc16(body);
}
