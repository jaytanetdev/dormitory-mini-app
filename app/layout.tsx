import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./theme.css";
import "./usability.css";
import { ThemeToggle } from "@/components/theme-toggle";
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
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#fff2e8" }, { media: "(prefers-color-scheme: dark)", color: "#130f1b" }],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('dormitory-theme');document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()` }} /></head>
      <body>
        <LiffProvider>
          <main className="app-shell"><div className="appearance-bar"><span>อยู่ดี <small>ห้องพักของคุณ</small></span><ThemeToggle /></div><ResidentGate>{children}</ResidentGate><footer className="legal-footer"><Link href="/terms">ข้อกำหนดการใช้งาน</Link><span>·</span><Link href="/privacy">นโยบายความเป็นส่วนตัว</Link></footer></main>
        </LiffProvider>
      </body>
    </html>
  );
}
