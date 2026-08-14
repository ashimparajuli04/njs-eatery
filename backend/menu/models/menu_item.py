from sqlmodel import Field, SQLModel, Relationship
from typing import TYPE_CHECKING
from decimal import Decimal
from sqlalchemy import Column, Numeric
from pydantic import field_serializer

if TYPE_CHECKING:
    from menu.models.menu_category import MenuCategory
    from menu.models.menu_subcategory import MenuSubCategory

class MenuItem(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    name: str
    price: Decimal = Field(sa_column=Column(Numeric(10, 2), nullable=False))
    category_id: int = Field(foreign_key="menucategory.id")
    description: str | None = None
    sub_category_id: int | None = Field(
        default=None,
        foreign_key="menusubcategory.id"
    )
    is_available: bool = True
    display_order: int = Field(index=True)
    
    # Relationships
    category: "MenuCategory" = Relationship(
        back_populates="items"
    )
    subcategory: "MenuSubCategory" = Relationship(
        back_populates="items"
    )

    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> float:
        return float(value)