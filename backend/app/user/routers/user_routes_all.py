from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session

from app.user.models.user import User
from app.user.schemas.user import UserCreate, UserPublic
from app.user.services.user_service import create_user, get_user_by_email, get_users, get_user_by_id
from app.auth.services.auth_service import get_current_active_user

router = APIRouter(prefix="/users", tags=["users"])

SessionDep = Annotated[Session, Depends(get_session)]

@router.get(
    "/",
    response_model=list[UserPublic],
    dependencies=[Depends(get_current_active_user)]
)
def read_users(session: SessionDep):
    return get_users(session)
    
@router.post(
    "/signup",
    response_model=UserPublic,
    status_code=201
)
def signup(user_in: UserCreate, session: SessionDep):
    if get_user_by_email(session, user_in.email):
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

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
    user = get_user_by_id(session, user_id)
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return user
    


