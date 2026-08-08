import { api } from "@/lib/api";
import type { Supplier, SupplierPayload } from "@/types/supplier";

export async function listSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<Supplier[]>("/suppliers");
  return data;
}

export async function createSupplier(payload: SupplierPayload): Promise<Supplier> {
  const { data } = await api.post<Supplier>("/suppliers", payload);
  return data;
}

export async function updateSupplier(
  id: string,
  payload: Partial<SupplierPayload>,
): Promise<Supplier> {
  const { data } = await api.patch<Supplier>(`/suppliers/${id}`, payload);
  return data;
}

export async function deactivateSupplier(id: string): Promise<Supplier> {
  const { data } = await api.post<Supplier>(`/suppliers/${id}/deactivate`);
  return data;
}

export async function reactivateSupplier(id: string): Promise<Supplier> {
  const { data } = await api.post<Supplier>(`/suppliers/${id}/reactivate`);
  return data;
}
