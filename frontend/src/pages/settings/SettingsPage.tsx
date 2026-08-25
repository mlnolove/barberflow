import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { getTenantSettings } from "@/api/settings";
import { AppearanceTab } from "@/pages/settings/AppearanceTab";
import { AuditLogTab } from "@/pages/settings/AuditLogTab";
import { BlockedDatesTab } from "@/pages/settings/BlockedDatesTab";
import { BusinessHoursTab } from "@/pages/settings/BusinessHoursTab";
import { FinancialAccountTab } from "@/pages/settings/FinancialAccountTab";
import { InfoTab } from "@/pages/settings/InfoTab";
import { PhotosTab } from "@/pages/settings/PhotosTab";
import { SchedulingTab } from "@/pages/settings/SchedulingTab";
import { SubscriptionTab } from "@/pages/settings/SubscriptionTab";
import { useAuthStore } from "@/store/authStore";

type TabKey =
  | "info"
  | "hours"
  | "scheduling"
  | "appearance"
  | "blocked"
  | "photos"
  | "financial-account"
  | "subscription"
  | "audit";

export function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission("settings.edit");
  const canViewAudit = hasPermission("audit.view");

  const TABS: { key: TabKey; label: string }[] = [
    { key: "info", label: "Informações" },
    { key: "hours", label: "Funcionamento" },
    { key: "scheduling", label: "Agendamento" },
    { key: "appearance", label: "Aparência" },
    { key: "blocked", label: "Datas bloqueadas" },
    { key: "photos", label: "Fotos" },
    { key: "financial-account", label: "Recebimento" },
    { key: "subscription", label: "Assinatura" },
    ...(canViewAudit ? [{ key: "audit" as const, label: "Auditoria" }] : []),
  ];
  const TAB_KEYS = new Set<string>(TABS.map((t) => t.key));

  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey>(
    requestedTab && TAB_KEYS.has(requestedTab) ? (requestedTab as TabKey) : "info",
  );

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
      <h1 className="font-serif text-xl font-semibold text-white">Configurações</h1>
      <p className="mt-1 text-sm text-ink-500">
        Dados da barbearia, horários de funcionamento, regras de agendamento e identidade visual.
      </p>
      {!canEdit && (
        <p className="mt-2 text-sm text-amber-400">
          Você pode visualizar as configurações, mas apenas o proprietário pode alterá-las.
        </p>
      )}

      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
              tab === t.key ? "border-gold text-gold" : "border-transparent text-ink-500 hover:text-ink-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading && <p className="text-sm text-ink-500">Carregando...</p>}
        {isError && <p className="text-sm text-red-400">Não foi possível carregar as configurações.</p>}
        {tenant && (
          <>
            {tab === "info" && <InfoTab tenant={tenant} canEdit={canEdit} />}
            {tab === "hours" && <BusinessHoursTab canEdit={canEdit} />}
            {tab === "scheduling" && <SchedulingTab tenant={tenant} canEdit={canEdit} />}
            {tab === "appearance" && <AppearanceTab tenant={tenant} canEdit={canEdit} />}
            {tab === "blocked" && <BlockedDatesTab canEdit={canEdit} />}
            {tab === "photos" && <PhotosTab canEdit={canEdit} />}
            {tab === "financial-account" && <FinancialAccountTab canEdit={canEdit} />}
            {tab === "subscription" && <SubscriptionTab canEdit={canEdit} />}
            {tab === "audit" && canViewAudit && <AuditLogTab />}
          </>
        )}
      </div>
    </div>
  );
}
