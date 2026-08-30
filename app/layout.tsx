import type { Metadata, Viewport } from "next";
import "./globals.css";
import { LiffProvider } from "@/components/liff-provider";
import { ResidentGate } from "@/components/resident-gate";

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
          <main className="app-shell"><ResidentGate>{children}</ResidentGate></main>
        </LiffProvider>
      </body>
    </html>
  );
}
