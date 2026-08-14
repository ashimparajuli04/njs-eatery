from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
from decimal import Decimal
from sqlalchemy import Column, DateTime, Numeric
from pydantic import field_serializer
from typing import TYPE_CHECKING, Optional, List

if TYPE_CHECKING:
    from service_flow.diningtable.models.dining_table import DiningTable
    from service_flow.order.models.order import Order
    from customer.models.customer import Customer


class TableSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    table_id: int | None = Field(
        default=None,
        foreign_key="diningtable.id",
    )

    customer_id: int | None = Field(
        default=None,
        foreign_key="customer.id",
    )

    started_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )

    ended_at: datetime | None = Field(
        sa_column=Column(DateTime(timezone=True), nullable=True),
        default=None,
    )

    final_bill: Decimal | None = Field(
        default=None,
        sa_column=Column(Numeric(10, 2), nullable=True),
    )

    table: Optional["DiningTable"] = Relationship(
        back_populates="sessions"
    )

    orders: List["Order"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )

    customer: Optional["Customer"] = Relationship(
        back_populates="sessions"
    )

    @property
    def total_bill(self) -> Decimal:
        if self.final_bill is not None:
            return self.final_bill
        return sum(order.total_amount for order in self.orders)

    @property
    def customer_name(self) -> str | None:
        return self.customer.name if self.customer else None

    def close_session(self):
        self.ended_at = datetime.now(timezone.utc)
        self.final_bill = sum(order.total_amount for order in self.orders)
        self.table_id = None

        if self.customer:
            self.customer.visit_count += 1
            self.customer.total_spent += self.final_bill

    @field_serializer("final_bill")
    def serialize_final_bill(self, value: Decimal | None):
        return None if value is None else float(value)
