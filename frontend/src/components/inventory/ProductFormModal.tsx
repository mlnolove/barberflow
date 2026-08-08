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
          <label htmlFor="name" className="block text-sm font-medium">
            Nome
          </label>
          <input
            id="name"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("name")}
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="sku" className="block text-sm font-medium">
              SKU (opcional)
            </label>
            <input
              id="sku"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("sku")}
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium">
              Categoria (opcional)
            </label>
            <input
              id="category"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("category")}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="cost_price" className="block text-sm font-medium">
              Preço de custo (R$)
            </label>
            <input
              id="cost_price"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("cost_price")}
            />
            {errors.cost_price && (
              <p className="mt-1 text-xs text-red-600">{errors.cost_price.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="sale_price" className="block text-sm font-medium">
              Preço de venda (R$)
            </label>
            <input
              id="sale_price"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("sale_price")}
            />
            {errors.sale_price && (
              <p className="mt-1 text-xs text-red-600">{errors.sale_price.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="min_stock" className="block text-sm font-medium">
              Estoque mínimo
            </label>
            <input
              id="min_stock"
              type="number"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
              {...register("min_stock")}
            />
            {errors.min_stock && (
              <p className="mt-1 text-xs text-red-600">{errors.min_stock.message}</p>
            )}
          </div>
          {!isEditing && (
            <div>
              <label htmlFor="initial_quantity" className="block text-sm font-medium">
                Estoque inicial
              </label>
              <input
                id="initial_quantity"
                type="number"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                {...register("initial_quantity")}
              />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="supplier_id" className="block text-sm font-medium">
            Fornecedor (opcional)
          </label>
          <select
            id="supplier_id"
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
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
          <label htmlFor="description" className="block text-sm font-medium">
            Descrição (opcional)
          </label>
          <textarea
            id="description"
            rows={2}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            {...register("description")}
          />
        </div>

        {serverError && <p className="text-sm text-red-600">{serverError}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
