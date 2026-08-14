from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session
from menu.models.menu_category import MenuCategory
from menu.schemas.menu_category import MenuCategoryCreate, MenuCategoryUpdate
from menu.services.menucategory_service import create_category, get_category_by_id, update_category, delete_menu_category_hard
from auth.services.auth_service import require_admin

router = APIRouter(
    prefix="/admin/menu/categories",
    tags=["menu-categories"],
)

SessionDep = Annotated[Session, Depends(get_session)]

@router.post("",
    response_model=MenuCategory,
    dependencies=[Depends(require_admin)]
)
def create_menu_category(
    data: MenuCategoryCreate,
    session: Session = Depends(get_session)
):
    return create_category(session, data)

@router.patch(
    "/{category_id}",
    response_model=MenuCategory,
    dependencies=[Depends(require_admin)]
)
def patch_category(
    category_id: int,
    data: MenuCategoryUpdate,
    session: SessionDep,
):
    category = get_category_by_id(session, category_id)

    return update_category(session=session, category=category, data=data)
    
@router.delete(
    "/{category_id}",
    status_code=204,
    dependencies=[Depends(require_admin)]
)
def delete_category(
    category_id: int,
    session: SessionDep,
):
    category = get_category_by_id(session, category_id)

    delete_menu_category_hard(session, category)