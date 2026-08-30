"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { createPromptPayPayload } from "@/lib/promptpay";

export function PromptPayQr({ amount, promptPayId, qrDataUrl }: { amount: number; promptPayId?: string; qrDataUrl?: string }) {
  const [src, setSrc] = useState<string>();
  const [error, setError] = useState<string>();
  useEffect(() => {
    if (qrDataUrl) { setSrc(qrDataUrl); setError(undefined); return; }
    if (!promptPayId) { setError("ยังไม่ได้ตั้งค่า PromptPay ของสาขานี้"); return; }
    try {
      const payload = createPromptPayPayload(promptPayId, amount);
      void QRCode.toDataURL(payload, { width: 480, margin: 1, errorCorrectionLevel: "M", color: { dark: "#172034", light: "#FFFFFF" } }).then(setSrc).catch(() => setError("สร้าง QR ไม่สำเร็จ"));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "สร้าง QR ไม่สำเร็จ"); }
  }, [amount, promptPayId, qrDataUrl]);
  if (error) return <p className="error-text" role="alert">{error}</p>;
  return <div className="qr-frame" aria-label={`QR พร้อมเพย์ยอด ${amount.toFixed(2)} บาท`}>{src ? <img src={src} alt={`QR พร้อมเพย์สำหรับชำระ ${amount.toFixed(2)} บาท`} /> : <div className="skeleton" style={{ aspectRatio: "1" }} />}</div>;
}
