from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.service_flow.diningtable.models.dining_table import DiningTable
    from app.service_flow.order.models.order import Order


class TableSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    table_id: int = Field(
        foreign_key="diningtable.id",
    )
    customer_name: str | None = None

    started_at: datetime = Field(
            default_factory=lambda: datetime.now(timezone.utc)
        )
    ended_at: datetime | None = None
    final_bill: float | None = None

    table: DiningTable = Relationship(back_populates="sessions")
    orders: list["Order"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    @property
    def total_bill(self) -> float:
        """Use stored value if closed, calculate if active"""
        if self.final_bill is not None:
            return self.final_bill
        return sum(order.total_amount for order in self.orders)
        
    def close_session(self):
        """Finalize the session"""
        self.ended_at = datetime.now(timezone.utc)
        self.final_bill = sum(order.total_amount for order in self.orders)
