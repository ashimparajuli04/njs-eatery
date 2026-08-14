from sqlmodel import select, func, Session

from crud import delete, get_by_id, update
from menu.models.menu_category import MenuCategory
from menu.schemas.menu_category import MenuCategoryCreate, MenuCategoryUpdate

def create_category(session, data: MenuCategoryCreate):
    max_order = session.exec(
        select(func.max(MenuCategory.display_order))
    ).one()

    next_order = (max_order or 0) + 1

    category = MenuCategory(
        **data.model_dump(),
        display_order=next_order
    )

    session.add(category)
    session.commit()
    session.refresh(category)

    return category
    
def get_category_by_id(session: Session, category_id: int) -> MenuCategory:
    return get_by_id(session, MenuCategory, category_id, "Category not found")

def update_category(
    *,
    session: Session,
    category: MenuCategory,
    data: MenuCategoryUpdate
) -> MenuCategory:
    return update(session, category, data)

def delete_menu_category_hard(session: Session, category: MenuCategory):
    return delete(session, category)