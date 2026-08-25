from datetime import datetime

from pydantic import BaseModel


class AvailabilitySlot(BaseModel):
    starts_at: datetime
    ends_at: datetime


class AvailabilityResponse(BaseModel):
    date: str
    employee_id: str
    service_id: str
    slots: list[AvailabilitySlot]
