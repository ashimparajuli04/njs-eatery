from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session

from database import get_session

from user.models.user import User
from user.schemas.user import UserCreate, UserPublic
from user.services.user_service import create_user, get_active_users, get_user_by_id
from auth.services.auth_service import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get(
    "",
    response_model=list[UserPublic],
    dependencies=[Depends(get_current_active_user)]
)
def read_users(session: SessionDep):
    return get_active_users(session)
    
@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=201
)
def signup(user_in: UserCreate, session: SessionDep):
    return create_user(
        session,
        user_in
    )

@router.get(
    "/me",
    response_model=UserPublic
)
def read_me(
    current_user: User = Depends(get_current_active_user),
):
    return current_user

@router.get(
    "/by-id/{user_id}",
    response_model=UserPublic,
    dependencies=[Depends(get_current_active_user)]
)
def read_user(user_id: int, session: SessionDep):
    return get_user_by_id(session, user_id)
    


