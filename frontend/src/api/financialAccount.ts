import { isAxiosError } from "axios";

import { api } from "@/lib/api";
import type { FinancialAccount, FinancialAccountUpsertPayload } from "@/types/financialAccount";

export async function getFinancialAccount(): Promise<FinancialAccount | null> {
  try {
    const { data } = await api.get<FinancialAccount>("/financial-account");
    return data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) return null;
    throw error;
  }
}

export async function upsertFinancialAccount(
  payload: FinancialAccountUpsertPayload,
): Promise<FinancialAccount> {
  const { data } = await api.put<FinancialAccount>("/financial-account", payload);
  return data;
}
