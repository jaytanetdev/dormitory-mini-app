import type { InvoiceStatus } from "@dormitory/contracts";

export interface ResidentProfile {
  id: string;
  displayName: string;
  linePictureUrl?: string;
  room: { id: string; number: string; building: string; branch: string };
}

export interface MeterCharge {
  type: "WATER" | "ELECTRIC";
  previous: number;
  current: number;
  units: number;
  rate: number;
  amount: number;
}

export interface InvoiceItem { id: string; label: string; amount: number; }

export interface Invoice {
  id: string;
  number: string;
  periodLabel: string;
  issuedAt: string;
  dueAt: string;
  status: InvoiceStatus;
  total: number;
  roomNumber: string;
  items: InvoiceItem[];
  meters: MeterCharge[];
}

export interface PaymentHistoryItem {
  id: string;
  invoiceId: string;
  periodLabel: string;
  amount: number;
  paidAt?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

export interface ClaimInvite {
  token: string;
  roomNumber: string;
  propertyName: string;
  branchName: string;
  expiresAt: string;
}

/** Public branch data resolved from the resident registration URL. */
export interface BranchClaimInfo {
  claimCode: string;
  branchName: string;
  address?: string | null;
  phone?: string | null;
  lineDisplayName?: string | null;
  liffId?: string | null;
}
