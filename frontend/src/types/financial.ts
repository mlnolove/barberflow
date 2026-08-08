export type TransactionType = "INCOME" | "EXPENSE";

export interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  category: string;
  description: string;
  amount: string;
  transaction_date: string;
  payment_method: PaymentMethod;
  responsible_user_id: string | null;
  appointment_id: string | null;
  reversal_of_id: string | null;
  is_voided: boolean;
  notes: string | null;
  created_at: string;
}

export interface FinancialTransactionPayload {
  type: TransactionType;
  category: string;
  description: string;
  amount: string;
  transaction_date: string;
  payment_method_id: string;
  notes?: string | null;
}

export interface FinancialSummary {
  period_start: string;
  period_end: string;
  total_income: string;
  total_expense: string;
  balance: string;
  transaction_count: number;
}
