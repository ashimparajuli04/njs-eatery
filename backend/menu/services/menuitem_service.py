from sqlmodel import select, func, Session
from fastapi import HTTPException

from menu.models.menu_item import MenuItem
from menu.schemas.menu_item import MenuItemCreate, MenuItemUpdate
from menu.models.menu_subcategory import MenuSubCategory



def create_menu_item(session, data: MenuItemCreate) -> MenuItem:
    # 1️⃣ Validate subcategory exists
    if data.sub_category_id is not None:
            # 1️⃣ Validate subcategory exists
            subcategory = session.get(MenuSubCategory, data.sub_category_id)
                     
            # 2️⃣ Ensure category ↔ subcategory match
            if subcategory.category_id != data.category_id:
                raise HTTPException(
                    status_code=400,
                    detail="Subcategory does not belong to category"
                )

    # 3️⃣ Get max display_order INSIDE this subcategory
    max_order = session.exec(
        select(func.max(MenuItem.display_order))
        .where(MenuItem.sub_category_id == data.sub_category_id)
    ).one()

    next_order = (max_order or 0) + 1

    # 4️⃣ Create item
    menu_item = MenuItem(
        **data.model_dump(),
        display_order=next_order
    )

    session.add(menu_item)
    session.commit()
    session.refresh(menu_item)

    return menu_item

def get_menuitem_by_id(session: Session, menuitem_id: int) -> MenuItem:
    item = session.get(MenuItem, menuitem_id)
    if not item:
        raise HTTPException(status_code=404, detail="menu item not found")
    return item
    
def update_menuitem(
    *,
    session: Session,
    item: MenuItem,
    data: MenuItemUpdate
) -> MenuItem:
    data_dict = data.model_dump(exclude_unset=True)

    for key, value in data_dict.items():
        setattr(item, key, value)

    session.add(item)
    session.commit()
    session.refresh(item)
    return item
    
def delete_menu_item_hard(session: Session, item: MenuItem):
    session.delete(item)
    session.commit()