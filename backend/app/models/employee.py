import uuid
from datetime import time

from sqlalchemy import ARRAY, ForeignKey, Numeric, SmallInteger, String, Time, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import SoftDeleteMixin, TenantScopedMixin, TimestampMixin, UUIDPKMixin


class Employee(UUIDPKMixin, TimestampMixin, SoftDeleteMixin, TenantScopedMixin, Base):
    """Profissional que realiza atendimentos (ex.: barbeiro).

    Distinto de `User`: representa o perfil de trabalho (especialidades,
    comissão, horário) exibido na agenda, não a conta de login. Pode
    opcionalmente estar vinculado a um `User` (via `user_id`) quando o
    profissional também acessa o sistema.
    """

    __tablename__ = "employees"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, unique=True
    )
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role_title: Mapped[str | None] = mapped_column(String(100), nullable=True)
    specialties: Mapped[list[str]] = mapped_column(ARRAY(String(100)), default=list, nullable=False)
    commission_percentage: Mapped[float] = mapped_column(Numeric(5, 2), default=0, nullable=False)
    work_start_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    work_end_time: Mapped[time | None] = mapped_column(Time, nullable=True)
    work_days: Mapped[list[int]] = mapped_column(ARRAY(SmallInteger), default=list, nullable=False)

    services: Mapped[list["EmployeeService"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )


class EmployeeService(Base):
    """Associação N:N entre profissional e os serviços que ele realiza."""

    __tablename__ = "employee_services"
    __table_args__ = (UniqueConstraint("employee_id", "service_id", name="uq_employee_service"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    employee_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    service_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("services.id", ondelete="CASCADE"), nullable=False
    )

    employee: Mapped["Employee"] = relationship(back_populates="services")
    service: Mapped["Service"] = relationship()  # noqa: F821
