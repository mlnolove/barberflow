import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Percent, ReceiptText, TrendingDown, TrendingUp, Users } from "lucide-react";

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
import type { MoneyPoint } from "@/types/dashboard";

/** Caminho SVG (viewBox 0 0 300 60) normalizado a partir de pontos reais de
 * faturamento — usado no sparkline do card de destaque do dashboard. */
function sparklinePath(points: MoneyPoint[]): string {
  const values = points.map((p) => Number(p.value));
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = values.length > 1 ? 300 / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = 56 - ((v - min) / range) * 48;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

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
      <h1 className="font-serif text-xl font-semibold text-white">Olá, {user?.full_name}</h1>
      <p className="text-sm text-ink-500">Seus atendimentos de hoje</p>

      <div className="mt-6 rounded-xl border border-white/[0.06] bg-ink-900">
        {isLoading && <p className="px-4 py-6 text-center text-sm text-ink-600">Carregando...</p>}
        {appointments && appointments.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-ink-600">Nenhum atendimento hoje.</p>
        )}
        {appointments && appointments.length > 0 && (
          <ul className="divide-y divide-white/[0.05]">
            {appointments.map((a) => (
              <li key={a.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="w-12 shrink-0 font-mono font-semibold tabular-nums text-white">
                  {new Date(a.starts_at).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <div className="flex-1">
                  <p className="font-medium text-white">{a.customer.full_name}</p>
                  <p className="text-xs text-ink-500">{a.service.name}</p>
                </div>
                <span className="rounded-full bg-ink-800 px-2 py-0.5 text-xs text-ink-400">
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
    return <div className="p-6 text-ink-500">Carregando...</div>;
  }

  if (isError || !data) {
    return <div className="p-6 text-red-400">Não foi possível carregar o dashboard.</div>;
  }

  const revenueByMonth = data.revenue_by_month;
  const currentMonth = Number(revenueByMonth.at(-1)?.value ?? 0);
  const previousMonth = Number(revenueByMonth.at(-2)?.value ?? 0);
  const monthPctChange = previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : null;

  return (
    <div className="p-6">
      <h1 className="font-serif text-xl font-semibold text-white">Olá, {user?.full_name}</h1>

      {/* Card de destaque: faturamento do mês, com sparkline dos últimos dias
          e variação real contra o mês anterior. */}
      <div className="animate-rise-in relative mt-4 overflow-hidden rounded-2xl border border-gold/[0.15] bg-gradient-to-br from-[#1a1510] to-ink-900 p-5">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold opacity-[0.06]" />
        <div className="relative flex items-center justify-between">
          <span className="text-xs text-ink-300">Faturamento do mês</span>
          {monthPctChange !== null && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold ${
                monthPctChange >= 0 ? "bg-emerald-500/[0.12] text-emerald-400" : "bg-red-500/[0.12] text-red-400"
              }`}
            >
              {monthPctChange >= 0 ? <TrendingUp size={10} strokeWidth={3} /> : <TrendingDown size={10} strokeWidth={3} />}
              {Math.abs(monthPctChange)}%
            </span>
          )}
        </div>
        <p className="relative mt-2 font-mono text-3xl font-semibold text-white">
          {formatMoney(data.kpis.revenue_month)}
        </p>
        {previousMonth > 0 && (
          <p className="relative mt-1 text-xs text-ink-500">vs. {formatMoney(previousMonth)} no mês anterior</p>
        )}
        {data.revenue_by_day.length > 1 && (
          <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="relative mt-2 h-14 w-full">
            <path
              d={sparklinePath(data.revenue_by_day)}
              fill="none"
              stroke="var(--color-brand)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDasharray: 400, animation: "draw-line 1s cubic-bezier(0.16,1,0.3,1) both" }}
            />
          </svg>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatTile label="Faturamento hoje" value={formatMoney(data.kpis.revenue_today)} icon={ReceiptText} />
        <StatTile label="Despesas do mês" value={formatMoney(data.kpis.expenses_month)} icon={TrendingDown} />
        <StatTile label="Agendamentos hoje" value={String(data.kpis.appointments_today)} icon={CalendarClock} />
        <StatTile label="Ticket médio" value={formatMoney(data.kpis.average_ticket)} icon={Percent} />
        <StatTile label="Clientes cadastrados" value={String(data.kpis.total_customers)} icon={Users} />
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

      <div className="animate-rise-in mt-6">
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
