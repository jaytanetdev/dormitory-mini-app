import type { ApiEnvelope } from "@dormitory/contracts";
import { mockInvite, mockInvoices, mockPayments, mockProfile } from "./mock-data";
import type { BranchClaimInfo, ClaimInvite, Invoice, PaymentHistoryItem, ResidentProfile } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/v1";
const MOCK_MODE = process.env.NEXT_PUBLIC_MOCK_MODE === "true";
const SLIP_UPLOAD_URL = process.env.NEXT_PUBLIC_SLIP_UPLOAD_URL;

interface ResidentSession { accessToken: string; expiresInSeconds: number; }
interface ClaimSession extends ResidentSession { resident?: { id: string; displayName?: string }; }
interface RawProfile {
  id: string; fullName: string; branch: { id: string; name: string };
  contracts: Array<{ room: { id: string; number: string; building: { name: string; property: { name: string } } } }>;
}
interface RawInvoiceItem { id: string; code: string; description: string; quantity: string | number; unitPrice: string | number; amount: string | number; metadata?: unknown; }
interface RawInvoice {
  id: string; number: string; status: Invoice["status"]; total: string | number; dueDate: string; issuedAt?: string | null; paidAt?: string | null;
  room: { number: string }; period: { year: number; month: number }; items?: RawInvoiceItem[];
  payments?: Array<{ id?: string; amount: string | number; paidAt?: string; status?: "PENDING" | "APPROVED" | "REJECTED" }>;
}
interface RawInvite { expiresAt: string; room: { number: string }; property: { name: string }; residentHint?: string; }
interface RawBranchClaim { branch: { name: string; address?: string | null; phone?: string | null }; line?: { liffId?: string | null; displayName?: string | null }; }

export class ApiClientError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = typeof window === "undefined" ? null : sessionStorage.getItem("resident_access_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
  const envelope = await response.json().catch(() => null) as (ApiEnvelope<T> & { errors?: Array<{ message?: string }> }) | null;
  if (!response.ok) throw new ApiClientError(response.status, envelope?.errors?.[0]?.message ?? (response.status === 401 ? "ยังไม่ได้ผูกบัญชี LINE กับห้อง" : response.status === 403 ? "คุณไม่มีสิทธิ์ดูข้อมูลนี้" : "เชื่อมต่อระบบไม่สำเร็จ ลองอีกครั้ง"));
  if (!envelope) throw new ApiClientError(502, "รูปแบบข้อมูลจากระบบไม่ถูกต้อง");
  return envelope.data;
}

const delay = <T>(value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), 280));
const thaiMonths = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
const periodLabel = (period: { year: number; month: number }) => `${thaiMonths[period.month - 1] ?? "เดือน"} ${period.year + 543}`;
const asNumber = (value: string | number) => typeof value === "number" ? value : Number(value);
const metadataRecord = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};

function mapInvoice(raw: RawInvoice): Invoice {
  const rawItems = raw.items ?? [];
  const meterItems = rawItems.filter((item) => item.code === "WATER" || item.code === "ELECTRIC");
  return {
    id: raw.id, number: raw.number, status: raw.status, total: asNumber(raw.total), dueAt: raw.dueDate,
    issuedAt: raw.issuedAt ?? raw.dueDate, roomNumber: raw.room.number, periodLabel: periodLabel(raw.period),
    items: rawItems.filter((item) => item.code !== "WATER" && item.code !== "ELECTRIC").map((item) => ({ id: item.id, label: item.description, amount: asNumber(item.amount) })),
    meters: meterItems.map((item) => {
      const metadata = metadataRecord(item.metadata);
      const previous = typeof metadata.previousValue === "number" ? metadata.previousValue : Number(metadata.previousValue ?? 0);
      const current = typeof metadata.currentValue === "number" ? metadata.currentValue : Number(metadata.currentValue ?? previous + asNumber(item.quantity));
      return { type: item.code as "WATER" | "ELECTRIC", previous, current, units: asNumber(item.quantity), rate: asNumber(item.unitPrice), amount: asNumber(item.amount) };
    }),
  };
}

export const api = {
  isMock: MOCK_MODE,
  createResidentSession: async (idToken: string): Promise<ResidentSession> => {
    if (MOCK_MODE) return delay({ accessToken: "mock-resident-session", expiresInSeconds: 3600 });
    return request("/miniapp/auth/line", { method: "POST", body: JSON.stringify({ idToken }) });
  },
  profile: async (): Promise<ResidentProfile> => {
    if (MOCK_MODE) return delay(mockProfile);
    const raw = await request<RawProfile>("/miniapp/me");
    const contract = raw.contracts[0];
    if (!contract) throw new ApiClientError(404, "ไม่พบสัญญาห้องที่กำลังใช้งาน");
    return { id: raw.id, displayName: raw.fullName, room: { id: contract.room.id, number: contract.room.number, building: contract.room.building.name, branch: raw.branch.name } };
  },
  invoices: async (): Promise<Invoice[]> => MOCK_MODE ? delay(mockInvoices) : (await request<RawInvoice[]>("/miniapp/invoices")).map(mapInvoice),
  invoice: (id: string): Promise<Invoice> => {
    const value = mockInvoices.find((invoice) => invoice.id === id) ?? mockInvoices[0];
    return MOCK_MODE ? delay(value) : request<RawInvoice>(`/miniapp/invoices/${id}`).then(mapInvoice);
  },
  paymentQr: async (id: string): Promise<{ amount: number; accountName: string; qrDataUrl: string }> => {
    if (MOCK_MODE) return delay({ amount: mockInvoices.find((invoice) => invoice.id === id)?.total ?? 0, accountName: "บัญชี PromptPay", qrDataUrl: "" });
    return request<{ amount: number; accountName: string; qrDataUrl: string }>(`/miniapp/invoices/${id}/payment-qr`);
  },
  payments: async (): Promise<PaymentHistoryItem[]> => {
    if (MOCK_MODE) return delay(mockPayments);
    const invoices = await request<RawInvoice[]>("/miniapp/invoices");
    return invoices.flatMap((invoice) => {
      const approved = (invoice.payments ?? []).reduce((sum, payment) => sum + asNumber(payment.amount), 0);
      if (approved <= 0) return [];
      return [{ id: `payment-${invoice.id}`, invoiceId: invoice.id, periodLabel: periodLabel(invoice.period), amount: approved, paidAt: invoice.paidAt ?? undefined, status: "APPROVED" as const }];
    });
  },
  invite: async (token: string): Promise<ClaimInvite> => {
    if (MOCK_MODE) return delay({ ...mockInvite, token });
    const raw = await request<RawInvite>(`/miniapp/invites/${token}`);
    return { token, roomNumber: raw.room.number, propertyName: raw.property.name, branchName: "", expiresAt: raw.expiresAt };
  },
  claim: async (token: string, idToken: string): Promise<ClaimSession> => {
    const result = MOCK_MODE
      ? await delay<ClaimSession>({ accessToken: "mock-resident-session", expiresInSeconds: 3600, resident: { id: "resident-001" } })
      : await request<ClaimSession>(`/miniapp/invites/${token}/claim`, { method: "POST", body: JSON.stringify({ idToken }) });
    if (typeof window !== "undefined") sessionStorage.setItem("resident_access_token", result.accessToken);
    return result;
  },
  branchClaimInfo: async (claimCode: string): Promise<BranchClaimInfo> => {
    if (MOCK_MODE) return delay({ claimCode, branchName: "สาขาตัวอย่าง", address: "กรุงเทพมหานคร", lineDisplayName: "หออยู่ดี", liffId: null });
    const raw = await request<RawBranchClaim>(`/miniapp/branches/${claimCode}`);
    return { claimCode, branchName: raw.branch.name, address: raw.branch.address, phone: raw.branch.phone, lineDisplayName: raw.line?.displayName, liffId: raw.line?.liffId };
  },
  claimBranch: async (claimCode: string, input: { idToken: string; roomNumber: string; fullName: string; phone?: string; email?: string }): Promise<ClaimSession> => {
    const result = MOCK_MODE
      ? await delay<ClaimSession>({ accessToken: "mock-resident-session", expiresInSeconds: 3600, resident: { id: "resident-001", displayName: input.fullName } })
      : await request<ClaimSession>(`/miniapp/branches/${claimCode}/claim`, { method: "POST", body: JSON.stringify(input) });
    if (typeof window !== "undefined") sessionStorage.setItem("resident_access_token", result.accessToken);
    return result;
  },
  uploadSlip: async (invoiceId: string, file: File, paidAt: string, amount: number): Promise<{ paymentId: string }> => {
    if (MOCK_MODE) return delay({ paymentId: `payment-${invoiceId}` });
    if (!SLIP_UPLOAD_URL) throw new ApiClientError(503, "ยังไม่ได้ตั้งค่าพื้นที่อัปโหลดสลิป กรุณาติดต่อเจ้าหน้าที่");
    const upload = new FormData(); upload.append("file", file);
    const uploadResponse = await fetch(SLIP_UPLOAD_URL, { method: "POST", body: upload });
    if (!uploadResponse.ok) throw new ApiClientError(uploadResponse.status, "อัปโหลดรูปสลิปไม่สำเร็จ กรุณาลองอีกครั้ง");
    const uploaded = await uploadResponse.json() as { url?: string; data?: { url?: string } };
    const fileUrl = uploaded.data?.url ?? uploaded.url;
    if (!fileUrl) throw new ApiClientError(502, "ระบบจัดเก็บรูปไม่ได้ส่ง URL กลับมา");
    const payment = await request<{ id?: string; paymentId?: string }>("/miniapp/payments", {
      method: "POST",
      body: JSON.stringify({ invoiceId, amount, paidAt, fileUrl, fileName: file.name, mimeType: file.type, size: file.size }),
    });
    return { paymentId: payment.paymentId ?? payment.id ?? "" };
  },
};
