import type { ClaimInvite, Invoice, PaymentHistoryItem, ResidentProfile } from "./types";

export const mockProfile: ResidentProfile = {
  id: "resident-001",
  displayName: "คุณมินตรา",
  room: { id: "room-a302", number: "A302", building: "อาคารสวนแก้ว", branch: "สาขารัชดา" },
};

export const mockInvoices: Invoice[] = [
  {
    id: "inv-2026-08",
    number: "INV-RC-2608-0302",
    periodLabel: "สิงหาคม 2569",
    issuedAt: "2026-08-25T00:00:00.000Z",
    dueAt: "2026-09-05T00:00:00.000Z",
    status: "PENDING_PAYMENT",
    total: 4724,
    roomNumber: "A302",
    items: [
      { id: "rent", label: "ค่าเช่าห้อง", amount: 3800 },
      { id: "internet", label: "ค่าอินเทอร์เน็ต", amount: 150 },
    ],
    meters: [
      { type: "WATER", previous: 155, current: 164, units: 9, rate: 18, amount: 162 },
      { type: "ELECTRIC", previous: 2920, current: 3008, units: 88, rate: 6.95, amount: 612 },
    ],
  },
  {
    id: "inv-2026-07", number: "INV-RC-2607-0302", periodLabel: "กรกฎาคม 2569",
    issuedAt: "2026-07-25T00:00:00.000Z", dueAt: "2026-08-05T00:00:00.000Z", status: "PAID", total: 4598,
    roomNumber: "A302", items: [{ id: "rent", label: "ค่าเช่าห้อง", amount: 3800 }],
    meters: [{ type: "WATER", previous: 146, current: 155, units: 9, rate: 18, amount: 162 }, { type: "ELECTRIC", previous: 2828, current: 2920, units: 92, rate: 6.91, amount: 636 }],
  },
];

export const mockPayments: PaymentHistoryItem[] = [
  { id: "pay-0726", invoiceId: "inv-2026-07", periodLabel: "กรกฎาคม 2569", amount: 4598, paidAt: "2026-08-02T11:24:00.000Z", status: "APPROVED" },
  { id: "pay-0626", invoiceId: "inv-2026-06", periodLabel: "มิถุนายน 2569", amount: 4511, paidAt: "2026-07-03T08:41:00.000Z", status: "APPROVED" },
  { id: "pay-0526", invoiceId: "inv-2026-05", periodLabel: "พฤษภาคม 2569", amount: 4467, paidAt: "2026-06-01T12:18:00.000Z", status: "APPROVED" },
];

export const mockInvite: ClaimInvite = {
  token: "demo-invite", roomNumber: "A302", propertyName: "อยู่ดี เรสซิเดนซ์", branchName: "สาขารัชดา", expiresAt: "2026-09-01T12:00:00.000Z",
};
