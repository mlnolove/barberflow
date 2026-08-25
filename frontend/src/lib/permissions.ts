/**
 * Catálogo de cargos e permissões — espelha `backend/app/core/permissions.py`
 * (fonte de verdade). Não existe endpoint que devolva esse catálogo, então
 * replicamos aqui, igual a outros enums estáveis do projeto (status, dias
 * da semana etc.).
 */
export const STAFF_ROLES = [
  { code: "OWNER", name: "Proprietário" },
  { code: "MANAGER", name: "Gerente" },
  { code: "BARBER", name: "Barbeiro" },
  { code: "RECEPTIONIST", name: "Recepcionista" },
] as const;

const ACTION_LABELS: Record<string, string> = {
  view: "Ver",
  create: "Criar",
  edit: "Editar",
  delete: "Excluir",
  cancel: "Cancelar",
  confirm: "Confirmar",
  start: "Iniciar",
  complete: "Finalizar",
  adjust: "Ajustar",
  manage: "Gerenciar",
  reply: "Responder",
};

export const PERMISSION_MODULES: { module: string; label: string; actions: string[] }[] = [
  { module: "clients", label: "Clientes", actions: ["view", "create", "edit", "delete"] },
  {
    module: "appointments",
    label: "Agendamentos",
    actions: ["view", "create", "edit", "cancel", "confirm", "start", "complete"],
  },
  { module: "services", label: "Serviços", actions: ["view", "create", "edit", "delete"] },
  { module: "employees", label: "Profissionais e equipe", actions: ["view", "create", "edit", "delete"] },
  { module: "inventory", label: "Estoque", actions: ["view", "create", "edit", "adjust"] },
  { module: "finance", label: "Financeiro", actions: ["view", "create", "edit", "delete"] },
  { module: "reports", label: "Relatórios", actions: ["view"] },
  { module: "settings", label: "Configurações", actions: ["view", "edit"] },
  { module: "audit", label: "Auditoria", actions: ["view"] },
  { module: "notifications", label: "Notificações", actions: ["view", "manage"] },
  { module: "messages", label: "Mensagens", actions: ["view", "reply"] },
];

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

export function roleName(code: string): string {
  return STAFF_ROLES.find((r) => r.code === code)?.name ?? code;
}
