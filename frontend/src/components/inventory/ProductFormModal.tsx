import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { createProduct, updateProduct } from "@/api/inventory";
import { listSuppliers } from "@/api/suppliers";
import { Modal } from "@/components/Modal";
import type { Product } from "@/types/product";

const numeric = (message: string) =>
  z.string().min(1, message).refine((v) => !Number.isNaN(Number(v)) && Number(v) >= 0, "Valor inválido");

const productSchema = z.object({
  name: z.string().min(2, "Informe o nome do produto"),
  sku: z.string().optional(),
  category: z.string().optional(),
  description: z.string().optional(),
  min_stock: z.coerce.number().int().min(0, "Deve ser maior ou igual a zero"),
  cost_price: numeric("Informe o preço de custo"),
  sale_price: numeric("Informe o preço de venda"),
  supplier_id: z.string().optional(),
  initial_quantity: z.coerce.number().int().min(0).optional(),
});

type FormValues = z.infer<typeof productSchema>;

interface ProductFormModalProps {
  product?: Product;
  onClose: () => void;
}

export function ProductFormModal({ product, onClose }: ProductFormModalProps) {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const isEditing = Boolean(product);

  const { data: suppliers } = useQuery({ queryKey: ["suppliers"], queryFn: listSuppliers });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name ?? "",
      sku: product?.sku ?? "",
      category: product?.category ?? "",
      description: product?.description ?? "",
      min_stock: product?.min_stock ?? 0,
      cost_price: product?.cost_price ?? "0",
      sale_price: product?.sale_price ?? "",
      supplier_id: product?.supplier?.id ?? "",
      initial_quantity: 0,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = {
        name: values.name,
        sku: values.sku || null,
        category: values.category || null,
        description: values.description || null,
        min_stock: values.min_stock,
        cost_price: values.cost_price,
        sale_price: values.sale_price,
        supplier_id: values.supplier_id || null,
      };
      return isEditing
        ? updateProduct(product!.id, payload)
        : createProduct({ ...payload, initial_quantity: values.initial_quantity ?? 0 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      onClose();
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { detail?: string } } })?.response?.data?.detail ??
        "Não foi possível salvar o produto.";
      setServerError(message);
    },
  });

  return (
    <Modal title={isEditing ? "Editar produto" : "Novo produto"} onClose={onClose}>
      <form
        className="max-h-[70vh] space-y-4 overflow-y-auto pr-1"
        onSubmit={handleSubmit((v) => mutation.mutate(v))}
        noValidate
      >
        <div>
          <label htmlFor="name" className="field-label">
            Nome
          </label>
          <input
            id="name"
            className="field-input"
            {...register("name")}
          />
          {errors.name && <p className="field-error">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sku" className="field-label">
              SKU (opcional)
            </label>
            <input
              id="sku"
              className="field-input"
              {...register("sku")}
            />
          </div>
          <div>
            <label htmlFor="category" className="field-label">
              Categoria (opcional)
            </label>
            <input
              id="category"
              className="field-input"
              {...register("category")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cost_price" className="field-label">
              Preço de custo (R$)
            </label>
            <input
              id="cost_price"
              className="field-input"
              {...register("cost_price")}
            />
            {errors.cost_price && (
              <p className="field-error">{errors.cost_price.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="sale_price" className="field-label">
              Preço de venda (R$)
            </label>
            <input
              id="sale_price"
              className="field-input"
              {...register("sale_price")}
            />
            {errors.sale_price && (
              <p className="field-error">{errors.sale_price.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min_stock" className="field-label">
              Estoque mínimo
            </label>
            <input
              id="min_stock"
              type="number"
              className="field-input"
              {...register("min_stock")}
            />
            {errors.min_stock && (
              <p className="field-error">{errors.min_stock.message}</p>
            )}
          </div>
          {!isEditing && (
            <div>
              <label htmlFor="initial_quantity" className="field-label">
                Estoque inicial
              </label>
              <input
                id="initial_quantity"
                type="number"
                className="field-input"
                {...register("initial_quantity")}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="supplier_id" className="field-label">
            Fornecedor (opcional)
          </label>
          <select
            id="supplier_id"
            className="field-input"
            {...register("supplier_id")}
          >
            <option value="">Nenhum</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="field-label">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={2}
            className="field-input"
            {...register("description")}
          />
        </div>

        {serverError && <p className="text-sm text-red-400">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
