from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from database import get_session
from menu.models.menu_category import MenuCategory
from auth.services.auth_service import get_current_active_user

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(
    prefix="/menu/categories",
    tags=["menu-categories"],
)

@router.get("",
    response_model=list[MenuCategory],
    dependencies=[Depends(get_current_active_user)]
)
def read_menu_categories(session: SessionDep):
    return session.exec(
        select(MenuCategory)
        .order_by(MenuCategory.display_order)  # pyright: ignore
    ).all()