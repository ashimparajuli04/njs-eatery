from sqlmodel import select, func, Session

from crud import delete, get_by_id, update
from exceptions import BadRequestError, NotFoundError
from menu.models.menu_category import MenuCategory
from menu.models.menu_item import MenuItem
from menu.schemas.menu_item import MenuItemCreate, MenuItemUpdate
from menu.models.menu_subcategory import MenuSubCategory


def create_menu_item(session, data: MenuItemCreate) -> MenuItem:
    if data.sub_category_id is not None:
        subcategory = session.exec(
            select(MenuSubCategory)
            .where(MenuSubCategory.id == data.sub_category_id)
            .with_for_update()
        ).first()

        if not subcategory:
            raise NotFoundError("sub category not found")

        if subcategory.category_id != data.category_id:
            raise BadRequestError("Subcategory does not belong to category")

        category_id = subcategory.category_id
        order_filters = [MenuItem.sub_category_id == data.sub_category_id]
    else:
        category = session.exec(
            select(MenuCategory)
            .where(MenuCategory.id == data.category_id)
            .with_for_update()
        ).first()

        if not category:
            raise NotFoundError("category not found")

        category_id = data.category_id
        order_filters = [
            MenuItem.category_id == data.category_id,
            MenuItem.sub_category_id.is_(None),
        ]

    max_order = session.exec(
        select(func.max(MenuItem.display_order)).where(*order_filters)
    ).one()

    next_order = (max_order or 0) + 1

    menu_item = MenuItem(
        **data.model_dump(exclude={"category_id"}),
        category_id=category_id,
        display_order=next_order
    )

    session.add(menu_item)
    session.commit()
    session.refresh(menu_item)

    return menu_item

def get_menuitem_by_id(session: Session, menuitem_id: int) -> MenuItem:
    return get_by_id(session, MenuItem, menuitem_id, "menu item not found")

def update_menuitem(
    *,
    session: Session,
    item: MenuItem,
    data: MenuItemUpdate
) -> MenuItem:
    if data.sub_category_id is not None:
        subcategory = session.get(MenuSubCategory, data.sub_category_id)
        if not subcategory:
            raise NotFoundError("sub category not found")

        if data.category_id is not None and subcategory.category_id != data.category_id:
            raise BadRequestError("Subcategory does not belong to category")

        item.category_id = subcategory.category_id
    elif data.category_id is not None and item.sub_category_id is not None:
        subcategory = session.get(MenuSubCategory, item.sub_category_id)
        if not subcategory:
            raise NotFoundError("sub category not found")

        if subcategory.category_id != data.category_id:
            raise BadRequestError("Subcategory does not belong to category")

        item.category_id = subcategory.category_id

    return update(session, item, data)

def delete_menu_item_hard(session: Session, item: MenuItem):
    return delete(session, item)