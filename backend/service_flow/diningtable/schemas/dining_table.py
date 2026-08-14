from sqlmodel import SQLModel
from datetime import datetime

from service_flow.diningtable.models.dining_table import TableType

class DiningTableCreate(SQLModel):
    number: int
    type: TableType

class DiningTableDetail(SQLModel):
    id: int
    number: int
    type: TableType

class DiningTableRead(SQLModel):
    id: int
    number: int
    type: TableType
    is_occupied: bool
    active_session_id: int | None
    customer_name: str | None  
    customer_arrival: datetime | None
