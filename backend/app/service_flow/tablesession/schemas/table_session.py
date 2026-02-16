from datetime import datetime
from sqlmodel import SQLModel
from app.service_flow.order.schemas.order import OrderRead

class TableSessionCreate(SQLModel):
    table_id: int
    
class TableSessionUpdate(SQLModel):
    customer_id: int | None = None
    
class TableSessionRead(SQLModel):
    id: int
    table_id: int | None
    customer_id: int | None
    total_bill: float
    final_bill: float | None = None
    started_at: datetime
    ended_at: datetime | None = None
    orders: list[OrderRead] = []
    
class TableSessionPagination(SQLModel):
    id: int
    table_id: int
    customer_name: str | None
    final_bill: float
    started_at: datetime
    ended_at: datetime
    
    