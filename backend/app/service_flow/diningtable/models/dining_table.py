from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.service_flow.tablesession.models.table_session import TableSession
    
class TableType(str, Enum):
    INDOOR = "indoor"
    ROOFTOP = "rooftop"
    TAKEAWAY = "takeaway"

class DiningTable(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    number: int = Field(unique=True, index=True)
    sessions: list["TableSession"] = Relationship(back_populates="table")
    type: TableType
    
    @property
    def active_session(self) -> "TableSession | None":
        return next(
            (s for s in self.sessions if s.ended_at is None),
            None
        )
    
    @property
    def is_occupied(self) -> bool:
        return self.active_session is not None
    
    @property
    def active_customer_name(self) -> str | None:
        """Get the customer name from the active session"""
        session = self.active_session
        if session and session.customer:
            return session.customer.name
        return None