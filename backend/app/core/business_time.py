"""'Hoje' no sentido de negócio (fechamento de caixa, dashboard, fila) —
não o 'hoje' do fuso do servidor nem o 'hoje' em UTC puro.

Achado durante uma auditoria de qualidade: `dashboard_service.get_summary`
calculava "hoje" com `datetime.now(UTC).date()`, enquanto o fechamento de
atendimento (`appointment_service.complete_appointment`) gravava
`transaction_date` com `date.today()` (fuso do SISTEMA operacional do
servidor — varia conforme onde o container roda, nem sempre UTC). Como o
Brasil está sempre 3h atrás de UTC, um atendimento concluído entre ~21h e
23h59 (horário de Brasília) cai no dia seguinte em UTC — o valor sumia do
"faturamento de hoje" do dashboard justamente no fim do expediente, o
horário de mais movimento numa barbearia. `session.py` também fixa o fuso
da SESSÃO do Postgres nesse mesmo valor, pra `func.date(coluna_timestamptz)`
(usado em consultas do dashboard) concordar com o Python aqui.

Este produto é para barbearias brasileiras (validação de telefone BR, toda
a UI em pt-BR) — por isso um fuso fixo, e não um por tenant.
"""

from datetime import date, datetime, timedelta, timezone

BUSINESS_TZ = timezone(timedelta(hours=-3))
"""America/Sao_Paulo, sem horário de verão (extinto no Brasil desde 2019)."""


def business_now() -> datetime:
    return datetime.now(BUSINESS_TZ)


def business_today() -> date:
    return business_now().date()
