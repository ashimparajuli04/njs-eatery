from sqlmodel import Column, DateTime, Field, Relationship, SQLModel
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Index, Numeric
from pydantic import field_serializer
from typing import TYPE_CHECKING
from enum import Enum

from exceptions import ConflictError

if TYPE_CHECKING:
    from service_flow.tablesession.models.table_session import TableSession
    from service_flow.orderitem.models.order_item import OrderItem

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
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )
    served_at: datetime | None = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None,
    )
    final_total: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )
    
    # Relationships
    session: "TableSession" = Relationship(back_populates="orders")
    items: list["OrderItem"] = Relationship(
        back_populates="order",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    
    @property
    def total_amount(self) -> Decimal:
        """Use stored value if served, if pending calculate"""
        if self.final_total is not None:
            return self.final_total
        return sum(item.line_total for item in self.items)
    
    def toggle_served(self):
        """Finalize the order"""
        if self.status == OrderStatus.PENDING:
            self.status = OrderStatus.SERVED
            self.served_at = datetime.now(timezone.utc)
            self.final_total = sum(item.line_total for item in self.items)
        else:
            if self.session and self.session.ended_at is not None:
                raise ConflictError("Cannot un-serve an order in a closed session")
            self.status = OrderStatus.PENDING
            self.served_at = None
            self.final_total = None

    @field_serializer("final_total")
    def serialize_final_total(self, value: Decimal | None):
        return None if value is None else float(value)

    __table_args__ = (
        Index("ix_order_status_created_at", "status", "created_at"),
    )
        
    