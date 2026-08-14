from sqlmodel import select, func, Session

from crud import delete, get_by_id, update
from menu.models.menu_subcategory import MenuSubCategory
from menu.schemas.menu_subcategory import MenuSubCategoryCreate, MenuSubCategoryUpdate


def create_subcategory(session, data: MenuSubCategoryCreate) -> MenuSubCategory:
    max_order = session.exec(
        select(func.max(MenuSubCategory.display_order))
        .where(MenuSubCategory.category_id == data.category_id)
    ).one()

    next_order = (max_order or 0) + 1

    subcategory = MenuSubCategory(
        **data.model_dump(),
        display_order=next_order
    )

    session.add(subcategory)
    session.commit()
    session.refresh(subcategory)

    return subcategory

def get_subcategory_by_id(session: Session, subcategory_id: int) -> MenuSubCategory:
    return get_by_id(session, MenuSubCategory, subcategory_id, "Sub Category not found")

def update_subcategory(
    *,
    session: Session,
    subcategory: MenuSubCategory,
    data: MenuSubCategoryUpdate
) -> MenuSubCategory:
    return update(session, subcategory, data)

def delete_menu_subcategory_hard(session: Session, subcategory: MenuSubCategory):
    return delete(session, subcategory)