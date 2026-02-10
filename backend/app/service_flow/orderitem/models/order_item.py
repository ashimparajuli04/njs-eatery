from sqlmodel import Field, Relationship, SQLModel
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.service_flow.order.models.order import Order
    from app.menu.models.menu_item import MenuItem

class OrderItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    
    order_id: int = Field(
        foreign_key="order.id",  # Delete items when order is deleted
    )
    menu_item_id: int = Field(
        foreign_key="menuitem.id"
    )
    
    quantity: int = Field(default=1, gt=0)  # Must be > 0
    price_at_time: float  # Snapshot of price when ordered
    note: str | None = None  # "extra cheese", "no onions", etc.
    
    # Relationships
    order: "Order" = Relationship(back_populates="items")
    menu_item: "MenuItem" = Relationship()
    
    # Helper property
    @property
    def line_total(self) -> float:
        """Total for this line item (price × quantity)"""
        return self.price_at_time * self.quantity