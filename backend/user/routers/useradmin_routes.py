from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session

from user.schemas.user import UserAdmin, UserUpdate
from user.services.user_service import get_users, get_user_by_id, update_user, delete_user_hard
from auth.services.auth_service import get_current_active_user, require_admin

router = APIRouter(prefix="/admin/users", tags=["users"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get(
    "",
    response_model=list[UserAdmin],
    dependencies=[Depends(get_current_active_user)]
)
def read_users(session: SessionDep):
    return get_users(session)

@router.patch(
    "/{user_id}",
    response_model=UserAdmin,
    dependencies=[Depends(require_admin)]
)
def patch_user(
    user_id: int,
    data: UserUpdate,
    session: SessionDep,
):
    user = get_user_by_id(session, user_id)

    return update_user(session=session, user=user, data=data)
    
@router.delete(
    "/{user_id}",
    status_code=204,
    dependencies=[Depends(require_admin)]
)
def delete_user(
    user_id: int,
    session: SessionDep,
):
    user = get_user_by_id(session, user_id)

    delete_user_hard(session, user)



