from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session

from app.user.models.user import User
from app.user.schemas.user import UserPublic, UserAdmin
from app.user.services.user_service import create_user, get_user_by_email, get_users, get_user_by_id
from app.auth.services.auth_service import get_current_active_user, require_admin

router = APIRouter(prefix="/users", tags=["admin-users"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get(
    "/userinfo",
    response_model=list[UserAdmin],
    dependencies=[Depends(require_admin)]
)
def read_users(session: SessionDep):
    return get_users(session)

