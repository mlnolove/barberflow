"""Catálogo central de permissões e o conjunto padrão atribuído a cada role.

Esta é a única fonte de verdade sobre quais permissões existem no sistema.
Usada pelo seed (para popular `permissions` e `role_permissions`) e pelos
testes. Autorização em runtime nunca consulta este arquivo diretamente —
ela consulta as permissões efetivas do usuário no banco (role + overrides).
"""

MODULES = (
    "clients",
    "appointments",
    "services",
    "employees",
    "inventory",
    "finance",
    "reports",
    "settings",
    "audit",
    "notifications",
)

_ACTIONS_BY_MODULE: dict[str, tuple[str, ...]] = {
    "clients": ("view", "create", "edit", "delete"),
    "appointments": ("view", "create", "edit", "cancel", "confirm", "start", "complete"),
    "services": ("view", "create", "edit", "delete"),
    "employees": ("view", "create", "edit", "delete"),
    "inventory": ("view", "create", "edit", "adjust"),
    "finance": ("view", "create", "edit", "delete"),
    "reports": ("view",),
    "settings": ("view", "edit"),
    "audit": ("view",),
    "notifications": ("view", "manage"),
}

ALL_PERMISSIONS: list[str] = [
    f"{module}.{action}" for module, actions in _ACTIONS_BY_MODULE.items() for action in actions
]

ROLE_OWNER = "OWNER"
ROLE_MANAGER = "MANAGER"
ROLE_BARBER = "BARBER"
ROLE_RECEPTIONIST = "RECEPTIONIST"

ROLE_DEFINITIONS: dict[str, str] = {
    ROLE_OWNER: "Proprietário",
    ROLE_MANAGER: "Gerente",
    ROLE_BARBER: "Barbeiro",
    ROLE_RECEPTIONIST: "Recepcionista",
}

DEFAULT_ROLE_PERMISSIONS: dict[str, list[str]] = {
    # OWNER possui todas as permissões (seção 4).
    ROLE_OWNER: list(ALL_PERMISSIONS),
    ROLE_MANAGER: [
        "clients.view",
        "clients.create",
        "clients.edit",
        "appointments.view",
        "appointments.create",
        "appointments.edit",
        "appointments.cancel",
        "appointments.confirm",
        "appointments.start",
        "appointments.complete",
        "services.view",
        "services.create",
        "services.edit",
        "inventory.view",
        "inventory.create",
        "inventory.edit",
        "inventory.adjust",
        "finance.view",
        "employees.view",
        "reports.view",
        "notifications.view",
    ],
    ROLE_BARBER: [
        "appointments.view",
        "appointments.confirm",
        "appointments.start",
        "appointments.complete",
        "clients.view",
        "services.view",
        "notifications.view",
    ],
    ROLE_RECEPTIONIST: [
        "clients.view",
        "clients.create",
        "clients.edit",
        "appointments.view",
        "appointments.create",
        "appointments.edit",
        "appointments.cancel",
        "appointments.confirm",
        "services.view",
        "finance.view",
        "finance.create",
        "notifications.view",
    ],
}
