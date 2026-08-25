import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Building2,
  CalendarClock,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  Image,
  Palette,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import { getTenantSettings } from "@/api/settings";
import { useMediaQuery } from "@/lib/useMediaQuery";
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

interface TabDef {
  key: TabKey;
  label: string;
  icon: LucideIcon;
}

export function SettingsPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  const canEdit = hasPermission("settings.edit");
  const canViewAudit = hasPermission("audit.view");
  const isDesktop = useMediaQuery("(min-width: 768px)");

  const TABS: TabDef[] = [
    { key: "info", label: "Informações", icon: Building2 },
    { key: "hours", label: "Funcionamento", icon: Clock },
    { key: "scheduling", label: "Agendamento", icon: CalendarClock },
    { key: "appearance", label: "Aparência", icon: Palette },
    { key: "blocked", label: "Datas bloqueadas", icon: CalendarX },
    { key: "photos", label: "Fotos", icon: Image },
    { key: "financial-account", label: "Recebimento", icon: CreditCard },
    { key: "subscription", label: "Assinatura", icon: Sparkles },
    ...(canViewAudit ? [{ key: "audit" as const, label: "Auditoria", icon: FileText }] : []),
  ];
  const TAB_KEYS = new Set<string>(TABS.map((t) => t.key));
  const tabDef = (key: TabKey) => TABS.find((t) => t.key === key)!;

  // Grupos do menu mobile — mesma lógica de "juntar as opções dentro das
  // devidas abas" do resto do painel do dono re-vestido.
  const GROUPS: { label: string; keys: TabKey[] }[] = [
    { label: "Barbearia", keys: ["info", "photos"] },
    { label: "Agendamento", keys: ["hours", "scheduling", "blocked"] },
    { label: "Financeiro", keys: ["financial-account", "subscription"] },
    { label: "Aparência", keys: ["appearance"] },
    ...(canViewAudit ? [{ label: "Segurança", keys: ["audit" as TabKey] }] : []),
  ];

  const [searchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const [tab, setTab] = useState<TabKey | null>(
    requestedTab && TAB_KEYS.has(requestedTab) ? (requestedTab as TabKey) : null,
  );
  const effectiveTab: TabKey | null = tab ?? (isDesktop ? "info" : null);

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
      {(isDesktop || effectiveTab === null) && (
        <>
          <h1 className="font-serif text-xl font-semibold text-white">Configurações</h1>
          <p className="mt-1 text-sm text-ink-500">
            Dados da barbearia, horários de funcionamento, regras de agendamento e identidade visual.
          </p>
          {!canEdit && (
            <p className="mt-2 text-sm text-amber-400">
              Você pode visualizar as configurações, mas apenas o proprietário pode alterá-las.
            </p>
          )}
        </>
      )}

      {isDesktop ? (
        <div className="mt-6 flex gap-1 overflow-x-auto border-b border-white/[0.06]">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`-mb-px shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition ${
                effectiveTab === t.key
                  ? "border-gold text-gold"
                  : "border-transparent text-ink-500 hover:text-ink-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : effectiveTab === null ? (
        <div className="mt-6">
          {GROUPS.map((group) => (
            <div key={group.label} className="mb-5">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-ink-500">
                {group.label}
              </p>
              <div className="rounded-2xl border border-white/[0.06] bg-ink-900">
                {group.keys.map((key, index) => {
                  const t = tabDef(key);
                  const Icon = t.icon;
                  const isHours = key === "hours";
                  return (
                    <button
                      key={key}
                      onClick={() => setTab(key)}
                      className={`flex w-full items-center justify-between px-4 py-3.5 text-left ${
                        index < group.keys.length - 1 ? "border-b border-white/[0.05]" : ""
                      } ${isHours ? "bg-gold/[0.05]" : ""}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-lg ${
                            isHours ? "bg-gold/[0.12]" : "bg-ink-800"
                          }`}
                        >
                          <Icon size={13} className={isHours ? "text-gold" : "text-ink-300"} strokeWidth={1.75} />
                        </div>
                        <span className={`text-sm ${isHours ? "font-medium text-white" : "text-white"}`}>
                          {t.label}
                        </span>
                      </div>
                      <ChevronRight size={15} className={isHours ? "text-gold" : "text-ink-600"} />
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="-mx-6 mb-4 flex items-center gap-3 border-b border-white/[0.06] px-6 pb-4">
          <button
            onClick={() => setTab(null)}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-400 hover:bg-ink-800"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="font-serif text-lg font-semibold text-white">{tabDef(effectiveTab).label}</span>
        </div>
      )}

      <div className="mt-6">
        {isLoading && <p className="text-sm text-ink-500">Carregando...</p>}
        {isError && <p className="text-sm text-red-400">Não foi possível carregar as configurações.</p>}
        {tenant && effectiveTab && (
          <>
            {effectiveTab === "info" && <InfoTab tenant={tenant} canEdit={canEdit} />}
            {effectiveTab === "hours" && <BusinessHoursTab canEdit={canEdit} />}
            {effectiveTab === "scheduling" && <SchedulingTab tenant={tenant} canEdit={canEdit} />}
            {effectiveTab === "appearance" && <AppearanceTab tenant={tenant} canEdit={canEdit} />}
            {effectiveTab === "blocked" && <BlockedDatesTab canEdit={canEdit} />}
            {effectiveTab === "photos" && <PhotosTab canEdit={canEdit} />}
            {effectiveTab === "financial-account" && <FinancialAccountTab canEdit={canEdit} />}
            {effectiveTab === "subscription" && <SubscriptionTab canEdit={canEdit} />}
            {effectiveTab === "audit" && canViewAudit && <AuditLogTab />}
          </>
        )}
      </div>
    </div>
  );
}
