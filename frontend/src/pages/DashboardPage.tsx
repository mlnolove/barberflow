import { useQuery } from "@tanstack/react-query";

import { listAppointments } from "@/api/appointments";
import { getDashboardSummary } from "@/api/dashboard";
import { AlertBadge } from "@/components/dashboard/AlertBadge";
import { ChartCard } from "@/components/dashboard/ChartCard";
import { CountBarChart } from "@/components/dashboard/CountBarChart";
import { MoneyBarChart } from "@/components/dashboard/MoneyBarChart";
import { PaymentMethodChart } from "@/components/dashboard/PaymentMethodChart";
import { RankedBarChart } from "@/components/dashboard/RankedBarChart";
import { RevenueAreaChart } from "@/components/dashboard/RevenueAreaChart";
import { StatTile } from "@/components/dashboard/StatTile";
import { UpcomingAppointmentsList } from "@/components/dashboard/UpcomingAppointmentsList";
import { getDayRange } from "@/lib/datetime";
import { formatMoney } from "@/lib/format";
import { useAuthStore } from "@/store/authStore";

function SimpleDashboard() {
  const user = useAuthStore((state) => state.user);
  const range = getDayRange(new Date().toISOString().slice(0, 10));

  const { data: appointments, isLoading } = useQuery({
    queryKey: ["appointments", { start: range.start.toISOString(), end: range.end.toISOString() }],
    queryFn: () =>
      listAppointments({ start: range.start.toISOString(), end: range.end.toISOString() }),
  });

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Olá, {user?.full_name}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400">Seus atendimentos de hoje</p>

      <div className="mt-6 rounded-xl border border-slate-200 dark:border-slate-800">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-slate-400">Carregando...</p>}
        {appointments && appointments.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            Nenhum atendimento hoje.
          </p>
        )}
        {appointments && appointments.length > 0 && (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="w-12 shrink-0 font-semibold tabular-nums">
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="flex-1">
                  <p className="font-medium">{a.customer.full_name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{a.service.name}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {a.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FullDashboard() {
  const user = useAuthStore((state) => state.user);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: getDashboardSummary,
  });

  if (isLoading) {
    return <div className="p-6 text-slate-500">Carregando...</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-red-600">Não foi possível carregar o dashboard.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold">Olá, {user?.full_name}</h1>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="Faturamento hoje" value={formatMoney(data.kpis.revenue_today)} />
        <StatTile label="Faturamento do mês" value={formatMoney(data.kpis.revenue_month)} />
        <StatTile label="Despesas do mês" value={formatMoney(data.kpis.expenses_month)} />
        <StatTile label="Agendamentos hoje" value={String(data.kpis.appointments_today)} />
        <StatTile label="Ticket médio" value={formatMoney(data.kpis.average_ticket)} />
        <StatTile label="Clientes cadastrados" value={String(data.kpis.total_customers)} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <AlertBadge
          label="produtos com estoque baixo"
          count={data.alerts.low_stock_products}
          severity="critical"
        />
        <AlertBadge
          label="agendamentos pendentes"
          count={data.alerts.pending_appointments}
          severity="warning"
        />
        <AlertBadge
          label="começam nas próximas 2h"
          count={data.alerts.starting_soon}
          severity="warning"
        />
        <AlertBadge
          label="serviços desativados"
          count={data.alerts.inactive_services}
          severity="neutral"
        />
      </div>

      <div className="mt-6">
        <UpcomingAppointmentsList items={data.upcoming_appointments} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Faturamento por dia (14 dias)">
          <RevenueAreaChart data={data.revenue_by_day} />
        </ChartCard>
        <ChartCard title="Faturamento mensal (6 meses)">
          <MoneyBarChart data={data.revenue_by_month} />
        </ChartCard>
        <ChartCard title="Serviços mais realizados (30 dias)">
          <RankedBarChart data={data.top_services} emptyLabel="Nenhum atendimento concluído ainda." />
        </ChartCard>
        <ChartCard title="Profissionais com mais atendimentos (30 dias)">
          <RankedBarChart
            data={data.top_professionals}
            emptyLabel="Nenhum atendimento concluído ainda."
          />
        </ChartCard>
        <ChartCard title="Formas de pagamento (30 dias)">
          <PaymentMethodChart
            data={data.payment_method_breakdown}
            emptyLabel="Nenhum recebimento ainda."
          />
        </ChartCard>
        <ChartCard title="Evolução de clientes (6 meses)">
          <CountBarChart data={data.customer_growth} seriesColor="var(--chart-series-3)" />
        </ChartCard>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const hasPermission = useAuthStore((state) => state.hasPermission);
  return hasPermission("reports.view") ? <FullDashboard /> : <SimpleDashboard />;
}
