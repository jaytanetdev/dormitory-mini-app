export function AppLoading() {
  return <div className="app-loading" aria-live="polite" role="status">
    <div className="app-loading-mark"><span /></div>
    <strong>กำลังเปิดระบบหอพัก</strong>
    <p>กำลังยืนยันบัญชี LINE และโหลดข้อมูลของคุณ</p>
    <div className="app-loading-dots" aria-hidden="true"><i /><i /><i /></div>
  </div>;
}
