import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LiffProvider } from "@/components/liff-provider";
import { ResidentGate } from "@/components/resident-gate";
import Link from "next/link";

export const metadata: Metadata = {
  title: "อยู่ดี | บิลห้องของคุณ",
  description: "ดูบิล ชำระค่าเช่า และติดตามประวัติการชำระ",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#F5F8FB",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <LiffProvider>
          <main className="app-shell"><ResidentGate>{children}</ResidentGate><footer className="legal-footer"><Link href="/terms">ข้อกำหนดการใช้งาน</Link><span>·</span><Link href="/privacy">นโยบายความเป็นส่วนตัว</Link></footer></main>
        </LiffProvider>
      </body>
    </html>
  );
}
