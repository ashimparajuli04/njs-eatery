from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, timezone
from sqlalchemy import Column, DateTime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.service_flow.diningtable.models.dining_table import DiningTable
    from app.service_flow.order.models.order import Order
    from app.customer.models.customer import Customer


class TableSession(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)

    table_id: int | None = Field(
        default = None,
        foreign_key="diningtable.id",
    )
    customer_id: int | None = Field(
        default = None,
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
    
    final_bill: float | None = None

    table: DiningTable = Relationship(back_populates="sessions")
    orders: list["Order"] = Relationship(
        back_populates="session",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )
    customer: "Customer" = Relationship(
        back_populates="sessions"
    )
    
    
    @property
    def total_bill(self) -> float:
        """Use stored value if closed, calculate if active"""
        if self.final_bill is not None:
            return self.final_bill
        return sum(order.total_amount for order in self.orders)
        
    @property    
    def customer_name(self) -> str | None:
        """Get the customer name from the related customer"""
        if self.customer:
            return self.customer.name
        return None
        
    def close_session(self):
        """Finalize the session and update customer stats"""
        self.ended_at = datetime.now(timezone.utc)
        self.final_bill = sum(order.total_amount for order in self.orders)
        self.table_id = None
        
        # Update customer stats if customer exists
        if self.customer:
            self.customer.visit_count += 1
            self.customer.total_spent += self.final_bill
        
    
        
    
