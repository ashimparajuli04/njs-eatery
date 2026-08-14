# schemas/menu_item.py
from decimal import Decimal
from sqlmodel import SQLModel

class MenuItemCreate(SQLModel):
    name: str
    price: Decimal
    category_id: int
    sub_category_id: int | None = None
    description: str | None = None

    class Config:
        extra = "forbid"

class MenuItemUpdate(SQLModel):
    name: str | None = None
    price: Decimal | None = None
    category_id: int | None = None
    sub_category_id: int | None = None
    description: str | None = None