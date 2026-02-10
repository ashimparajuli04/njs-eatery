from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth.services.auth_service import get_current_active_user
from app.database import get_session
from app.menu.models.menu_subcategory import MenuSubCategory

router = APIRouter(
    prefix="/menu-subcategories",
    tags=["menu-subcategories"],
)

SessionDep = Annotated[Session, Depends(get_session)]
    
@router.get(
    "/",
    response_model=list[MenuSubCategory],
    dependencies=[Depends(get_current_active_user)]
)
def read_menu_subcategories(session: SessionDep):
    return session.exec(
        select(MenuSubCategory)
        .order_by(
            MenuSubCategory.category_id,       # type: ignore lolol
            MenuSubCategory.display_order,     # type: ignore 
        )  # pyright: ignore
    ).all()