from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.auth.services.auth_service import get_current_active_user
from app.database import get_session
from app.menu.models.menu_item import MenuItem

router = APIRouter(
    prefix="/menu-items",
    tags=["menuitems"],
)

SessionDep = Annotated[Session, Depends(get_session)]

@router.get(
    "/",
    response_model=list[MenuItem],
    dependencies=[Depends(get_current_active_user)]
)
def read_menuitems(session: SessionDep):
    return session.exec(
        select(MenuItem).order_by(MenuItem.display_order) # type: ignore
    ).all()

