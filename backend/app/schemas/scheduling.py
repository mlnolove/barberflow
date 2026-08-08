import uuid
from datetime import date, time

from pydantic import BaseModel, ConfigDict, Field, model_validator


class BusinessHoursRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    weekday: int
    is_open: bool
    open_time: time | None
    close_time: time | None
    break_start_time: time | None
    break_end_time: time | None


class BusinessHoursUpdate(BaseModel):
    is_open: bool
    open_time: time | None = None
    close_time: time | None = None
    break_start_time: time | None = None
    break_end_time: time | None = None

    @model_validator(mode="after")
    def _validate(self) -> "BusinessHoursUpdate":
        if self.is_open:
            if not self.open_time or not self.close_time:
                raise ValueError("Informe o horário de abertura e fechamento.")
            if self.close_time <= self.open_time:
                raise ValueError("O horário de fechamento deve ser depois da abertura.")
            if bool(self.break_start_time) != bool(self.break_end_time):
                raise ValueError(
                    "Informe o início e o fim do intervalo, ou deixe os dois em branco."
                )
            if self.break_start_time and self.break_end_time:
                if self.break_end_time <= self.break_start_time:
                    raise ValueError("O fim do intervalo deve ser depois do início.")
                if self.break_start_time < self.open_time or self.break_end_time > self.close_time:
                    raise ValueError("O intervalo deve estar dentro do horário de funcionamento.")
        return self


class BlockedDateCreate(BaseModel):
    date: date
    reason: str | None = Field(default=None, max_length=255)


class BlockedDateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    date: date
    reason: str | None
