import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";

import { deactivateSupplier, listSuppliers, reactivateSupplier } from "@/api/suppliers";
import { SupplierFormModal } from "@/components/inventory/SupplierFormModal";
import { useAuthStore } from "@/store/authStore";
import type { Supplier } from "@/types/supplier";

export function SuppliersListPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [editingSupplier, setEditingSupplier] = useState<Supplier | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  const { data: suppliers, isLoading, isError } = useQuery({
    queryKey: ["suppliers"],
    queryFn: listSuppliers,
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (supplier: Supplier) =>
      supplier.is_active ? deactivateSupplier(supplier.id) : reactivateSupplier(supplier.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
  });

  function openCreate() {
    setEditingSupplier(undefined);
    setShowModal(true);
  }

  function openEdit(supplier: Supplier) {
    setEditingSupplier(supplier);
    setShowModal(true);
  }

  return (
    <div className="p-6">
      <Link to="/estoque" className="text-sm text-brand-secondary hover:underline">
        ← Voltar para estoque
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Fornecedores</h1>
        {hasPermission("inventory.create") && (
          <button
            onClick={openCreate}
            className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Novo fornecedor
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Telefone</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-600">
                  Não foi possível carregar os fornecedores.
                </td>
              </tr>
            )}
            {suppliers?.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  Nenhum fornecedor cadastrado.
                </td>
              </tr>
            )}
            {suppliers?.map((supplier) => (
              <tr key={supplier.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-3 font-medium">{supplier.name}</td>
                <td className="px-4 py-3">{supplier.phone ?? "—"}</td>
                <td className="px-4 py-3">{supplier.email ?? "—"}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      supplier.is_active
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                    }`}
                  >
                    {supplier.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {hasPermission("inventory.edit") && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(supplier)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => toggleStatusMutation.mutate(supplier)}
                        className="rounded-md border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                      >
                        {supplier.is_active ? "Desativar" : "Reativar"}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <SupplierFormModal supplier={editingSupplier} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
