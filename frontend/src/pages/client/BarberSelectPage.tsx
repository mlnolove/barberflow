import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";

import { getBarbershop } from "@/api/clientBarbershops";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { useBookingFlowStore } from "@/store/bookingFlowStore";

export function BarberSelectPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const employeeId = useBookingFlowStore((s) => s.employeeId);
  const setBarber = useBookingFlowStore((s) => s.setBarber);

  const { data: shop } = useQuery({
    queryKey: ["client-barbershop", tenantId],
    queryFn: () => getBarbershop(tenantId!),
    enabled: Boolean(tenantId),
  });

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Escolha o barbeiro" onBack={() => navigate(-1)} />
      <div className="flex-1 px-5 pb-28">
        <div className="flex flex-col gap-3">
          {shop?.barbers.map((b) => {
            const active = employeeId === b.id;
            return (
              <button
                key={b.id}
                onClick={() => setBarber(b.id, b.full_name)}
                className="flex items-center gap-4 rounded-2xl border p-4 transition-all"
                style={{
                  background: active ? "rgba(200,166,94,0.08)" : "#161614",
                  borderColor: active ? "rgba(200,166,94,0.5)" : "rgba(255,255,255,0.08)",
                }}
              >
                <div className="h-14 w-14 shrink-0 rounded-full bg-ink-800" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{b.full_name}</p>
                  {b.role_title && <p className="text-xs text-ink-600">{b.role_title}</p>}
                </div>
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
                  style={{
                    borderColor: active ? "#C8A65E" : "#333330",
                    background: active ? "#C8A65E" : "transparent",
                  }}
                >
                  {active && <Check size={11} className="text-ink-950" strokeWidth={2.5} />}
                </div>
              </button>
            );
          })}
          {shop && shop.barbers.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-500">
              Esta barbearia ainda não cadastrou profissionais.
            </p>
          )}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => employeeId && navigate(`/c/barbearia/${tenantId}/servico`)}
          disabled={!employeeId}
          className="h-12 w-full rounded-xl text-sm font-semibold transition-all disabled:bg-ink-800 disabled:text-ink-600"
          style={employeeId ? { background: "#C8A65E", color: "#0C0C0B" } : undefined}
        >
          Continuar
        </button>
      </div>
    </div>
  );
}
