import type { SupplierSummary } from "@/types/supplier";

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  category: string | null;
  description: string | null;
  current_quantity: number;
  min_stock: number;
  cost_price: string;
  sale_price: string;
  supplier: SupplierSummary | null;
  is_active: boolean;
  created_at: string;
  is_low_stock: boolean;
}

export interface ProductPayload {
  name: string;
  sku?: string | null;
  category?: string | null;
  description?: string | null;
  min_stock?: number;
  cost_price?: string;
  sale_price: string;
  supplier_id?: string | null;
  initial_quantity?: number;
}

export type MovementType = "ENTRY" | "EXIT" | "ADJUSTMENT" | "LOSS" | "SALE" | "RETURN";
export type ManualMovementType = "ENTRY" | "EXIT" | "LOSS" | "SALE" | "RETURN";

export interface InventoryMovement {
  id: string;
  product_id: string;
  type: MovementType;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  reason: string;
  created_by_user_id: string | null;
  created_at: string;
}
