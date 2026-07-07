export const CRM_STATUSES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export const DATA_SOURCES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type CrmStatus = (typeof CRM_STATUSES)[number];
export type DataSource = (typeof DATA_SOURCES)[number];

export interface CrmRecord {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: CrmStatus | "";
  crm_note: string;
  data_source: DataSource | "";
  possession_time: string;
  description: string;
}

export interface SkippedRecord {
  rowIndex: number;
  reason: string;
  raw: Record<string, string>;
}

export interface ImportResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalProcessed: number;
}

export interface BatchProgress {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  totalRows: number;
  processedRows: number;
  totalBatches: number;
  completedBatches: number;
  currentBatch: number;
  result?: ImportResult;
  error?: string;
}

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  totalRows: number;
}

export type AppStep = "upload" | "preview" | "processing" | "results";

export const CRM_DISPLAY_FIELDS: { key: keyof CrmRecord; label: string }[] = [
  { key: "created_at", label: "Created At" },
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "country_code", label: "Country Code" },
  { key: "mobile_without_country_code", label: "Mobile" },
  { key: "company", label: "Company" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "lead_owner", label: "Lead Owner" },
  { key: "crm_status", label: "Status" },
  { key: "crm_note", label: "Notes" },
  { key: "data_source", label: "Source" },
  { key: "possession_time", label: "Possession" },
  { key: "description", label: "Description" },
];
