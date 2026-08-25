import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock } from "lucide-react";

import { getBarbershop } from "@/api/clientBarbershops";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { formatMoney } from "@/lib/format";
import { useBookingFlowStore } from "@/store/bookingFlowStore";

export function ServiceSelectPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const serviceId = useBookingFlowStore((s) => s.serviceId);
  const setService = useBookingFlowStore((s) => s.setService);

  const { data: shop } = useQuery({
    queryKey: ["client-barbershop", tenantId],
    queryFn: () => getBarbershop(tenantId!),
    enabled: Boolean(tenantId),
  });

  const chosen = shop?.services.find((s) => s.id === serviceId);

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Escolha o serviço" onBack={() => navigate(-1)} />
      <div className="flex-1 px-5 pb-28">
        <div className="flex flex-col gap-2">
          {shop?.services.map((sv) => {
            const active = serviceId === sv.id;
            return (
              <button
                key={sv.id}
                onClick={() => setService(sv.id, sv.name, sv.price, sv.duration_minutes)}
                className="flex items-center justify-between rounded-2xl border p-4 transition-all"
                style={{
                  background: active ? "rgba(200,166,94,0.08)" : "#161614",
                  borderColor: active ? "rgba(200,166,94,0.5)" : "rgba(255,255,255,0.08)",
                }}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                    style={{
                      borderColor: active ? "#C8A65E" : "#333330",
                      background: active ? "#C8A65E" : "transparent",
                    }}
                  >
                    {active && <Check size={11} className="text-ink-950" strokeWidth={2.5} />}
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium text-white">{sv.name}</span>
                    <div className="mt-0.5 flex items-center gap-1">
                      <Clock size={9} className="text-ink-600" />
                      <span className="text-xs text-ink-600">{sv.duration_minutes} min</span>
                    </div>
                  </div>
                </div>
                <span className="font-mono text-sm font-semibold" style={{ color: active ? "#C8A65E" : "white" }}>
                  {formatMoney(sv.price)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => serviceId && navigate(`/c/barbearia/${tenantId}/horario`)}
          disabled={!serviceId}
          className="h-12 w-full rounded-xl text-sm font-semibold transition-all disabled:bg-ink-800 disabled:text-ink-600"
          style={serviceId ? { background: "#C8A65E", color: "#0C0C0B" } : undefined}
        >
          {chosen ? `Continuar — ${formatMoney(chosen.price)}` : "Selecione um serviço"}
        </button>
      </div>
    </div>
  );
}
