import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { getTenantSettings } from "@/api/settings";
import { AppearanceTab } from "@/pages/settings/AppearanceTab";
import { BlockedDatesTab } from "@/pages/settings/BlockedDatesTab";
import { BusinessHoursTab } from "@/pages/settings/BusinessHoursTab";
import { InfoTab } from "@/pages/settings/InfoTab";
import { SchedulingTab } from "@/pages/settings/SchedulingTab";
import { useAuthStore } from "@/store/authStore";

type TabKey = "info" | "hours" | "scheduling" | "appearance" | "blocked";

const TABS: { key: TabKey; label: string }[] = [
  { key: "info", label: "Informações" },
  { key: "hours", label: "Funcionamento" },
  { key: "scheduling", label: "Agendamento" },
  { key: "appearance", label: "Aparência" },
  { key: "blocked", label: "Datas bloqueadas" },
];

export function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission("settings.edit");
  const [tab, setTab] = useState<TabKey>("info");

  const {
    data: tenant,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["settings-tenant"],
    queryFn: getTenantSettings,
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Configurações</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Dados da barbearia, horários de funcionamento, regras de agendamento e identidade visual.
      </p>
      {!canEdit && (
        <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
          Você pode visualizar as configurações, mas apenas o proprietário pode alterá-las.
        </p>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key
                ? "border-brand text-brand dark:text-white"
                : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-slate-500">Carregando...</p>}
        {isError && (
          <p className="text-sm text-red-600">Não foi possível carregar as configurações.</p>
        )}
        {tenant && (
          <>
            {tab === "info" && <InfoTab tenant={tenant} canEdit={canEdit} />}
            {tab === "hours" && <BusinessHoursTab canEdit={canEdit} />}
            {tab === "scheduling" && <SchedulingTab tenant={tenant} canEdit={canEdit} />}
            {tab === "appearance" && <AppearanceTab tenant={tenant} canEdit={canEdit} />}
            {tab === "blocked" && <BlockedDatesTab canEdit={canEdit} />}
          </>
        )}
      </div>
    </div>
  );
}
