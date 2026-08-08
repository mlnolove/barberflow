import { api } from "@/lib/api";
import type { Page } from "@/types/common";
import type { InventoryMovement, ManualMovementType, Product, ProductPayload } from "@/types/product";

export interface ProductListParams {
  q?: string;
  is_active?: boolean;
  low_stock?: boolean;
  page?: number;
  limit?: number;
}

export async function listProducts(params: ProductListParams): Promise<Page<Product>> {
  const { data } = await api.get<Page<Product>>("/inventory/products", { params });
  return data;
}

export async function getProduct(id: string): Promise<Product> {
  const { data } = await api.get<Product>(`/inventory/products/${id}`);
  return data;
}

export async function createProduct(payload: ProductPayload): Promise<Product> {
  const { data } = await api.post<Product>("/inventory/products", payload);
  return data;
}

export async function updateProduct(
  id: string,
  payload: Partial<ProductPayload>,
): Promise<Product> {
  const { data } = await api.patch<Product>(`/inventory/products/${id}`, payload);
  return data;
}

export async function deactivateProduct(id: string): Promise<Product> {
  const { data } = await api.post<Product>(`/inventory/products/${id}/deactivate`);
  return data;
}

export async function reactivateProduct(id: string): Promise<Product> {
  const { data } = await api.post<Product>(`/inventory/products/${id}/reactivate`);
  return data;
}

export async function createStockMovement(
  productId: string,
  payload: { type: ManualMovementType; quantity: number; reason: string },
): Promise<Product> {
  const { data } = await api.post<Product>(`/inventory/products/${productId}/movements`, payload);
  return data;
}

export async function createStockAdjustment(
  productId: string,
  payload: { new_quantity: number; reason: string },
): Promise<Product> {
  const { data } = await api.post<Product>(`/inventory/products/${productId}/adjust`, payload);
  return data;
}

export async function listMovements(
  productId: string,
  params: { page?: number; limit?: number } = {},
): Promise<Page<InventoryMovement>> {
  const { data } = await api.get<Page<InventoryMovement>>(
    `/inventory/products/${productId}/movements`,
    { params },
  );
  return data;
}
