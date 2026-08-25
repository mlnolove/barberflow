export type FinancialAccountType = "PIX" | "BANK_ACCOUNT";

export interface FinancialAccount {
  account_type: FinancialAccountType;
  holder_name: string;
  masked_detail: string;
  updated_at: string;
}

export interface FinancialAccountUpsertPayload {
  account_type: FinancialAccountType;
  holder_name: string;
  pix_key?: string | null;
  bank_code?: string | null;
  agency?: string | null;
  account_number?: string | null;
}
