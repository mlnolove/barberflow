import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import DateTime, Enum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import TenantScopedMixin, TimestampMixin, UUIDPKMixin


class QueueStatus(StrEnum):
    WAITING = "WAITING"
    CALLED = "CALLED"
    IN_SERVICE = "IN_SERVICE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


OPEN_QUEUE_STATUSES = (QueueStatus.WAITING, QueueStatus.CALLED, QueueStatus.IN_SERVICE)


class QueueEntry(UUIDPKMixin, TimestampMixin, TenantScopedMixin, Base):
    """Entrada na fila de ordem de chegada (Modo 2, seção 7). Não guarda
    posição — ela é sempre recalculada na leitura, contando quantas
    entradas `WAITING` (do mesmo escopo `employee_id`) chegaram antes
    (`joined_at`). Isso é o que a especificação pede em "nunca confie na
    posição enviada pelo aplicativo": nem existe uma coluna de posição que
    um client pudesse tentar sobrescrever."""

    __tablename__ = "queue_entries"

    customer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False
    )
    employee_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )
    """Preferência de barbeiro — opcional (seção 7: "caso a configuração
    permita"). Quando nulo, a entrada concorre na fila geral do tenant."""
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="RESTRICT"), nullable=False
    )
    status: Mapped[QueueStatus] = mapped_column(
        Enum(QueueStatus, native_enum=False, length=20), default=QueueStatus.WAITING, nullable=False
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    """Gerado em Python (`datetime.now(UTC)`), não `server_default=func.now()`
    — dentro de uma mesma transação Postgres, `now()` fica congelado no
    instante em que a transação começou, então duas entradas criadas na
    mesma transação ficariam com o MESMO `joined_at` e a posição empataria
    (achado nos testes: `db_session` mantém uma transação viva o teste
    inteiro). `datetime.now()` do Python avança de verdade a cada chamada."""
    called_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    customer: Mapped["Customer"] = relationship()  # noqa: F821
    employee: Mapped["Employee"] = relationship()  # noqa: F821
    service: Mapped["Service"] = relationship()  # noqa: F821
