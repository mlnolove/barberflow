import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";

import { listStaffUsers } from "@/api/users";
import { PermissionsModal } from "@/components/team/PermissionsModal";
import { UserFormModal } from "@/components/team/UserFormModal";
import { useAuthStore } from "@/store/authStore";
import type { StaffUser } from "@/types/user";

export function TeamListPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const currentUser = useAuthStore((state) => state.user);
  const [editingUser, setEditingUser] = useState<StaffUser | undefined>(undefined);
  const [showFormModal, setShowFormModal] = useState(false);
  const [permissionsUser, setPermissionsUser] = useState<StaffUser | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["staff-users"],
    queryFn: listStaffUsers,
  });

  function openCreate() {
    setEditingUser(undefined);
    setShowFormModal(true);
  }

  function openEdit(user: StaffUser) {
    setEditingUser(user);
    setShowFormModal(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Equipe</h1>
        {hasPermission("employees.create") && (
          <button onClick={openCreate} className="btn-primary">
            Adicionar membro
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-500">Contas de acesso ao sistema — quem loga e o que cada um pode fazer.</p>

      <div className="table-card mt-4">
        <table className="w-full text-left text-sm">
          <thead className="table-head">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Cargo</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink-500">
                  Carregando...
                </td>
              </tr>
            )}
            {isError && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-red-400">
                  Não foi possível carregar a equipe.
                </td>
              </tr>
            )}
            {data?.map((u) => (
              <tr key={u.id} className="border-t border-white/[0.05] text-white">
                <td className="px-4 py-3 font-medium">
                  {u.full_name}
                  {u.id === currentUser?.id && <span className="ml-2 text-xs text-ink-600">(você)</span>}
                </td>
                <td className="px-4 py-3 text-ink-300">{u.email}</td>
                <td className="px-4 py-3">{u.role.name}</td>
                <td className="px-4 py-3">
                  <span className={u.is_active ? "badge-active" : "badge-inactive"}>
                    {u.is_active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {hasPermission("employees.edit") && (
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setPermissionsUser(u)}
                        className="flex items-center gap-1.5 rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
                      >
                        <ShieldCheck size={12} />
                        Permissões
                      </button>
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-md border border-white/[0.08] px-2.5 py-1 text-xs text-ink-300 hover:bg-ink-800"
                      >
                        Editar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showFormModal && <UserFormModal user={editingUser} onClose={() => setShowFormModal(false)} />}
      {permissionsUser && (
        <PermissionsModal user={permissionsUser} onClose={() => setPermissionsUser(null)} />
      )}
    </div>
  );
}
