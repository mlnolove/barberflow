import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { CheckCircle } from "lucide-react";
import { motion } from "motion/react";

import { bookAppointment } from "@/api/clientAppointments";
import { getBarbershop } from "@/api/clientBarbershops";
import { ClientTopBar } from "@/components/client/ClientTopBar";
import { formatMoney } from "@/lib/format";
import { useBookingFlowStore } from "@/store/bookingFlowStore";

export function BookingConfirmPage() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const navigate = useNavigate();
  const booking = useBookingFlowStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const { data: shop } = useQuery({
    queryKey: ["client-barbershop", tenantId],
    queryFn: () => getBarbershop(tenantId!),
    enabled: Boolean(tenantId),
  });

  const mutation = useMutation({
    mutationFn: () =>
      bookAppointment({
        tenant_id: tenantId!,
        employee_id: booking.employeeId!,
        service_id: booking.serviceId!,
        starts_at: `${booking.date}T${booking.time}:00`,
      }),
    onError: (error) => {
      setServerError(
        isAxiosError(error) && typeof error.response?.data?.detail === "string"
          ? error.response.data.detail
          : "Não foi possível confirmar o agendamento. Tente novamente.",
      );
    },
  });

  if (mutation.isSuccess) {
    const appointment = mutation.data;
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ink-950 px-8">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 18 }}
          className="flex w-full flex-col items-center gap-6 text-center"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-gold/35 bg-gold/10">
            <CheckCircle size={36} className="text-gold" />
          </div>
          <div>
            <h2 className="mb-2 font-serif text-2xl text-white">
              {appointment.status === "PENDING" ? "Solicitado!" : "Agendado!"}
            </h2>
            <p className="text-sm leading-relaxed text-ink-400">
              {appointment.status === "PENDING"
                ? "A barbearia vai confirmar seu horário em breve."
                : "Seu corte foi confirmado."}
            </p>
          </div>
          <div className="w-full rounded-2xl border border-white/[0.08] bg-ink-900 p-5 text-left">
            <p className="text-sm font-semibold text-white">{appointment.barbershop.name}</p>
            <div className="mt-3 flex justify-between">
              <div>
                <p className="text-xs text-ink-600">Serviço</p>
                <p className="text-sm font-medium text-white">{appointment.service.name}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-600">Total</p>
                <p className="font-mono text-xl font-bold text-gold">{formatMoney(appointment.price)}</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate("/c/agendamentos")}
            className="h-12 w-full rounded-xl bg-gold text-sm font-semibold text-ink-950"
          >
            Ver meus agendamentos
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ink-950">
      <ClientTopBar title="Confirmar agendamento" onBack={() => navigate(-1)} />
      <div className="flex-1 px-5 pb-28">
        <div className="mb-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900">
          <div className="p-4">
            <h3 className="font-semibold text-white">{shop?.name}</h3>
            {shop?.address && <p className="mt-1 text-xs text-ink-400">{shop.address}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4 p-4 pt-0">
            {[
              ["Barbeiro", booking.employeeName],
              ["Serviço", booking.serviceName],
              ["Data", booking.date],
              ["Horário", booking.time],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="mb-0.5 text-xs text-ink-600">{label}</p>
                <p className="text-sm font-medium text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-ink-900 p-4">
          <div className="flex items-center justify-between pt-3">
            <span className="text-sm font-semibold text-white">Total</span>
            <span className="font-mono text-lg font-bold text-gold">
              {booking.servicePrice ? formatMoney(booking.servicePrice) : "—"}
            </span>
          </div>
        </div>

        {serverError && <p className="mt-4 text-sm text-red-400">{serverError}</p>}
      </div>
      <div className="fixed inset-x-0 bottom-0 border-t border-white/[0.06] bg-ink-950/95 px-5 pb-8 pt-4 backdrop-blur-md">
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="h-12 w-full rounded-xl bg-gold text-sm font-semibold text-ink-950 disabled:opacity-60"
        >
          {mutation.isPending ? "Confirmando..." : "Confirmar agendamento"}
        </button>
      </div>
    </div>
  );
}
