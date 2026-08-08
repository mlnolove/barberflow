import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { Customer, CustomerListParams, CustomerPayload } from "@/types/customer";

export async function listCustomers(params: CustomerListParams): Promise<Page<Customer>> {
  const { data } = await api.get<Page<Customer>>("/customers", { params });
  return data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const { data } = await api.get<Customer>(`/customers/${id}`);
  return data;
}

export async function createCustomer(payload: CustomerPayload): Promise<Customer> {
  const { data } = await api.post<Customer>("/customers", payload);
  return data;
}

export async function updateCustomer(
  id: string,
  payload: Partial<CustomerPayload>,
): Promise<Customer> {
  const { data } = await api.patch<Customer>(`/customers/${id}`, payload);
  return data;
}

export async function deactivateCustomer(id: string): Promise<Customer> {
  const { data } = await api.post<Customer>(`/customers/${id}/deactivate`);
  return data;
}

export async function reactivateCustomer(id: string): Promise<Customer> {
  const { data } = await api.post<Customer>(`/customers/${id}/reactivate`);
  return data;
}
