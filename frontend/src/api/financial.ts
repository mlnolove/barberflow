import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type {
  FinancialSummary,
  FinancialTransaction,
  FinancialTransactionPayload,
  PaymentMethod,
  TransactionType,
} from "@/types/financial";

export interface TransactionListParams {
  type?: TransactionType;
  category?: string;
  payment_method_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
}

export async function listTransactions(
  params: TransactionListParams,
): Promise<Page<FinancialTransaction>> {
  const { data } = await api.get<Page<FinancialTransaction>>("/financial/transactions", {
    params,
  });
  return data;
}

export async function createTransaction(
  payload: FinancialTransactionPayload,
): Promise<FinancialTransaction> {
  const { data } = await api.post<FinancialTransaction>("/financial/transactions", payload);
  return data;
}

export async function voidTransaction(id: string, reason: string): Promise<FinancialTransaction> {
  const { data } = await api.post<FinancialTransaction>(`/financial/transactions/${id}/void`, {
    reason,
  });
  return data;
}

export async function getSummary(dateFrom: string, dateTo: string): Promise<FinancialSummary> {
  const { data } = await api.get<FinancialSummary>("/financial/summary", {
    params: { date_from: dateFrom, date_to: dateTo },
  });
  return data;
}

export async function listPaymentMethods(): Promise<PaymentMethod[]> {
  const { data } = await api.get<PaymentMethod[]>("/financial/payment-methods");
  return data;
}

export async function setPaymentMethodActive(id: string, isActive: boolean): Promise<PaymentMethod> {
  const { data } = await api.patch<PaymentMethod>(`/financial/payment-methods/${id}`, {
    is_active: isActive,
  });
  return data;
}
