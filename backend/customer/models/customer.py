from datetime import datetime, timezone
from decimal import Decimal
from sqlmodel import Column, DateTime, Field, Relationship, SQLModel
from sqlalchemy import Numeric
from pydantic import field_serializer
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from service_flow.tablesession.models.table_session import TableSession


class Customer(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str = Field(max_length=100)
    phone_number: str = Field(max_length=20, unique=True, index=True)
    visit_count: int = Field(default=0)
    total_spent: Decimal = Field(default=Decimal("0"), sa_column=Column(Numeric(10, 2), nullable=False))
    customer_since: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
        default_factory=lambda: datetime.now(timezone.utc),
    )
    
    sessions: list["TableSession"] = Relationship(back_populates="customer")

    @field_serializer("total_spent")
    def serialize_total_spent(self, value: Decimal) -> float:
        return float(value)