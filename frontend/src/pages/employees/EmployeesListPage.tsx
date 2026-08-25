import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { deactivateEmployee, listEmployees, reactivateEmployee } from "@/api/employees";
import { EmployeeFormModal } from "@/components/employees/EmployeeFormModal";
import { useAuthStore } from "@/store/authStore";
import type { Employee } from "@/types/employee";

const LIMIT = 20;
const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

type StatusFilter = "all" | "active" | "inactive";

export function EmployeesListPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [page, setPage] = useState(1);
  const [editingEmployee, setEditingEmployee] = useState<Employee | undefined>(undefined);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["employees", { search, status, page }],
    queryFn: () =>
      listEmployees({
        q: search || undefined,
        is_active: status === "all" ? undefined : status === "active",
        page,
        limit: LIMIT,
      }),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (employee: Employee) =>
      employee.is_active ? deactivateEmployee(employee.id) : reactivateEmployee(employee.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["employees"] }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  function openCreate() {
    setEditingEmployee(undefined);
    setShowModal(true);
  }

  function openEdit(employee: Employee) {
    setEditingEmployee(employee);
    setShowModal(true);
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-xl font-semibold text-white">Profissionais</h1>
        {hasPermission("employees.create") && (
          <button onClick={openCreate} className="btn-primary">
            Novo profissional
          </button>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Buscar por nome, telefone ou e-mail"
          className="w-72 rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-ink-600"
        />
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as StatusFilter);
            setPage(1);
          }}
          className="rounded-md border border-white/[0.08] bg-ink-900 px-3 py-2 text-sm text-white"
        >
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="all">Todos</option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading && <p className="text-ink-500">Carregando...</p>}
        {isError && <p className="text-red-400">Não foi possível carregar os profissionais.</p>}
        {data && data.items.length === 0 && (
          <p className="text-ink-500">Nenhum profissional encontrado.</p>
        )}
        {data?.items.map((employee) => (
          <div key={employee.id} className="rounded-xl border border-white/[0.06] bg-ink-900 p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-medium text-white">{employee.full_name}</h3>
                {employee.role_title && <p className="text-xs text-ink-500">{employee.role_title}</p>}
              </div>
              <span className={employee.is_active ? "badge-active" : "badge-inactive"}>
                {employee.is_active ? "Ativo" : "Inativo"}
              </span>
            </div>

            <p className="mt-2 text-sm text-ink-300">{employee.phone}</p>

            {employee.specialties.length > 0 && (
              <p className="mt-1 text-xs text-ink-500">{employee.specialties.join(" · ")}</p>
            )}

            {employee.work_days.length > 0 && (
              <p className="mt-2 text-xs text-ink-500">
                {employee.work_days.map((d) => WEEKDAY_LABELS[d]).join(", ")}
                {employee.work_start_time &&
                  employee.work_end_time &&
                  ` · ${employee.work_start_time.slice(0, 5)}–${employee.work_end_time.slice(0, 5)}`}
              </p>
            )}

            {employee.services.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {employee.services.map((s) => (
                  <span key={s.id} className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-300">
                    {s.name}
                  </span>
                ))}
              </div>
            )}

            {hasPermission("employees.edit") && (
              <div className="mt-4 flex gap-2">
                <button onClick={() => openEdit(employee)} className="btn-secondary">
                  Editar
                </button>
                {hasPermission("employees.delete") && (
                  <button onClick={() => toggleStatusMutation.mutate(employee)} className="btn-secondary">
                    {employee.is_active ? "Desativar" : "Reativar"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-ink-500">
          <span>
            {data.total} profissiona{data.total !== 1 ? "is" : "l"} — página {page} de {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="rounded-md border border-white/[0.08] px-3 py-1 text-ink-300 disabled:opacity-40"
            >
              Anterior
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-md border border-white/[0.08] px-3 py-1 text-ink-300 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <EmployeeFormModal employee={editingEmployee} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
