from sqlmodel import Field, Relationship, SQLModel
from datetime import datetime, timezone
from typing import TYPE_CHECKING
from enum import Enum

if TYPE_CHECKING:
    from app.service_flow.tablesession.models.table_session import TableSession
    from app.service_flow.orderitem.models.order_item import OrderItem

class OrderStatus(str, Enum):
    PENDING = "pending"   # Order placed, being prepared
    SERVED = "served"     # Delivered to table

class Order(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    session_id: int = Field(
        foreign_key="tablesession.id",
    )
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    
    # Timestamps
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc)
    )
    served_at: datetime | None = None
    final_total: float | None = None
    
    # Relationships
    session: "TableSession" = Relationship(back_populates="orders")
    items: list["OrderItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    @property
    def total_amount(self) -> float:
        """Use stored value if served, calculate if pending"""
        if self.final_total is not None:
            return self.final_total
        return sum(item.line_total for item in self.items)
    
    def mark_served(self):
        """Finalize the order"""
        self.status = OrderStatus.SERVED
        self.served_at = datetime.now(timezone.utc)
        self.final_total = sum(item.line_total for item in self.items)