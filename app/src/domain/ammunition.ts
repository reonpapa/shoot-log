export type AmmunitionFamily = "shot-shell" | "rifle";
export type LedgerEntryType = "opening" | "acquisition" | "consumption" | "disposal" | "transfer" | "adjustment-in" | "adjustment-out";

export interface AmmunitionCategory {
  id: string;
  name: string;
  family: AmmunitionFamily;
}

export interface Firearm {
  id: string;
  name: string;
  identifier: string;
  originalPermitDate?: string;
  originalPermitNumber?: string;
  permitDate?: string;
  permitNumber?: string;
  inspectionDate?: string;
  validUntil?: string;
  renewalStartDate?: string;
  renewalDeadline?: string;
  kind?: string;
  actionType?: string;
  manufacturer?: string;
  model?: string;
  overallLength?: string;
  barrelLength?: string;
  caliber?: string;
  magazine?: string;
  compatibleAmmo?: string;
  purpose?: string;
}

export interface AmmunitionProductLink {
  ammunitionName: string;
  categoryId: string;
}

export interface ManualLedgerEntry {
  id: string;
  date: string;
  type: LedgerEntryType;
  categoryId: string;
  quantity: number;
  firearmId?: string;
  application: string;
  createdAt: string;
}

export interface AmmunitionLedgerData {
  trackingStartDate: string;
  permitProfile: {
    certificateNumber: string;
    originalIssueDate: string;
    issueDate: string;
  };
  categories: AmmunitionCategory[];
  firearms: Firearm[];
  productLinks: AmmunitionProductLink[];
  entries: ManualLedgerEntry[];
}

export const emptyAmmunitionLedger = (): AmmunitionLedgerData => ({ trackingStartDate: "", permitProfile: { certificateNumber: "", originalIssueDate: "", issueDate: "" }, categories: [], firearms: [], productLinks: [], entries: [] });

export const entryTypeLabels: Record<LedgerEntryType, string> = {
  opening: "開始残弾",
  acquisition: "購入・譲受",
  consumption: "その他の消費",
  disposal: "廃棄",
  transfer: "譲渡",
  "adjustment-in": "残弾補正（増）",
  "adjustment-out": "残弾補正（減）",
};

export const isReceiptType = (type: LedgerEntryType): boolean => ["opening", "acquisition", "adjustment-in"].includes(type);
