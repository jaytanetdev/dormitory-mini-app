import { DoorClosed } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return <div className="page" style={{ display: "grid", placeItems: "center" }}><div className="card success-panel"><DoorClosed size={42} /><h1>ไม่พบหน้านี้</h1><p className="muted">ลิงก์อาจหมดอายุหรือถูกย้ายแล้ว</p><Link className="primary-button full-width" href="/">กลับหน้าหลัก</Link></div></div>;
}
