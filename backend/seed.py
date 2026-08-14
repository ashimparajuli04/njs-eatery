"""Idempotent seed for local development.

Usage (inside the backend container):
    /opt/venv/bin/python3 seed.py
"""

from sqlmodel import Session, select

from customer.models.customer import Customer
from database import init_db, engine
from menu.models.menu_category import MenuCategory
from menu.models.menu_item import MenuItem
from menu.models.menu_subcategory import MenuSubCategory
from menu.schemas.menu_category import MenuCategoryCreate
from menu.schemas.menu_item import MenuItemCreate
from menu.schemas.menu_subcategory import MenuSubCategoryCreate
from menu.services.menucategory_service import create_category
from menu.services.menuitem_service import create_menu_item
from menu.services.menusubcategory_service import create_subcategory
from service_flow.diningtable.models.dining_table import DiningTable, TableType
from service_flow.diningtable.schemas.dining_table import DiningTableCreate
from service_flow.diningtable.services.diningtable_service import create_table
from user.models.user import User, UserRole
from user.schemas.user import UserCreate
from user.services.user_service import create_user
from service_flow.order.models.order import Order
from service_flow.orderitem.models.order_item import OrderItem

# Importing the remaining model modules registers every table with the
# SQLModel metadata so stringly-referenced relationships resolve at query time.
MODEL_REGISTRY = (Customer, Order, OrderItem)

MENU = {
    "Drinks": {
        "Hot": [
            ("Black Tea", 100),
            ("Milk Tea", 120),
            ("Coffee", 150),
        ],
        "Cold": [
            ("Iced Tea", 140),
            ("Cold Coffee", 180),
            ("Lemonade", 120),
        ],
    },
    "Food": {
        "Snacks": [
            ("French Fries", 200),
            ("Chicken Momo (10 pcs)", 280),
            ("Veg Spring Roll", 220),
        ],
        "Mains": [
            ("Chicken Fried Rice", 350),
            ("Mutton Curry + Rice", 520),
            ("Paneer Chowmein", 300),
        ],
    },
}

TABLES = (
    [(1, TableType.INDOOR), (2, TableType.INDOOR), (3, TableType.INDOOR),
     (4, TableType.INDOOR), (5, TableType.INDOOR)] +
    [(6, TableType.ROOFTOP), (7, TableType.ROOFTOP)] +
    [(8, TableType.TAKEAWAY)]
)


def _existing_user(session, email):
    return session.exec(select(User).where(User.email == email)).first()


def _existing_category(session, name):
    return session.exec(
        select(MenuCategory).where(MenuCategory.name == name)
    ).first()


def _existing_subcategory(session, category_id, name):
    return session.exec(
        select(MenuSubCategory).where(
            MenuSubCategory.category_id == category_id,
            MenuSubCategory.name == name,
        )
    ).first()


def _existing_table(session, number):
    return session.exec(
        select(DiningTable).where(DiningTable.number == number)
    ).first()


def seed_users():
    with Session(engine) as session:
        if not _existing_user(session, "admin@test.com"):
            create_user(
                session,
                UserCreate(
                    email="admin@test.com",
                    first_name="Admin",
                    last_name="User",
                    password="adminpass123",
                ),
            )
            admin = _existing_user(session, "admin@test.com")
            admin.role = UserRole.ADMIN
            session.add(admin)
            session.commit()
            print("created admin@test.com / adminpass123 (admin)")
        else:
            print("admin@test.com already exists")

        if not _existing_user(session, "staff@test.com"):
            create_user(
                session,
                UserCreate(
                    email="staff@test.com",
                    first_name="Staff",
                    last_name="User",
                    password="staffpass123",
                ),
            )
            print("created staff@test.com / staffpass123 (employee)")
        else:
            print("staff@test.com already exists")


def seed_menu():
    with Session(engine) as session:
        for cat_name, subs in MENU.items():
            category = _existing_category(session, cat_name)
            if not category:
                category = create_category(
                    session, MenuCategoryCreate(name=cat_name)
                )
                print(f"created category {cat_name}")
            else:
                print(f"category {cat_name} already exists")

            for sub_name, items in subs.items():
                subcategory = _existing_subcategory(session, category.id, sub_name)
                if not subcategory:
                    subcategory = create_subcategory(
                        session,
                        MenuSubCategoryCreate(
                            name=sub_name,
                            category_id=category.id,
                        ),
                    )
                    print(f"  created subcategory {cat_name}/{sub_name}")
                else:
                    print(f"  subcategory {cat_name}/{sub_name} already exists")

                for item_name, price in items:
                    if not _existing_item(session, item_name):
                        create_menu_item(
                            session,
                            MenuItemCreate(
                                name=item_name,
                                price=price,
                                category_id=category.id,
                                sub_category_id=subcategory.id,
                            ),
                        )
                        print(f"    created item {item_name} ({price})")
                    else:
                        print(f"    item {item_name} already exists")


def _existing_item(session, name):
    return session.exec(
        select(MenuItem).where(MenuItem.name == name)
    ).first()


def seed_tables():
    with Session(engine) as session:
        for number, table_type in TABLES:
            if not _existing_table(session, number):
                create_table(
                    session,
                    DiningTableCreate(number=number, type=table_type),
                )
                print(f"created table {number} ({table_type.value})")
            else:
                print(f"table {number} already exists")


if __name__ == "__main__":
    init_db()
    seed_users()
    seed_menu()
    seed_tables()
    print("Seed complete.")
