# user/services/user_service.py
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from pydantic import EmailStr, ValidationError, TypeAdapter

from crud import delete, get_by_id, update
from exceptions import BadRequestError
from user.models.user import User
from auth.utils.auth_utils import get_password_hash
from user.schemas.user import UserCreate, UserUpdate

email_adapter = TypeAdapter(EmailStr)

def create_user(session: Session, data: UserCreate) -> User:
    # 1. validate + normalize email
    try:
        email = email_adapter.validate_python(data.email).lower()
    except ValidationError:
        raise BadRequestError("Invalid email format")

    # 2. check uniqueness (app-level)
    existing_user = session.exec(
        select(User).where(User.email == email)
    ).first()

    if existing_user:
        raise BadRequestError("Email already registered")

    # 3. create user
    user = User(
        email=email,
        first_name=data.first_name,
        middle_name=data.middle_name,
        last_name=data.last_name,
        password_hash=get_password_hash(data.password),
    )

    session.add(user)

    # 4. final DB-level protection
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        raise BadRequestError("Email already registered")

    session.refresh(user)
    return user

def get_users(session: Session):
    return session.exec(select(User)).all()

def get_active_users(session: Session):
    return session.exec(
        select(User).where(User.is_active)
    ).all()

def get_user_by_email(session: Session, email: str):
    return session.exec(
        select(User).where(User.email == email)
    ).first()
   
def get_user_by_id(session: Session, user_id: int) -> User:
    return get_by_id(session, User, user_id, "User not found")

def update_user(
    *,
    session: Session,
    user: User,
    data: UserUpdate
) -> User:
    return update(session, user, data)

def delete_user_hard(session: Session, user: User):
    return delete(session, user)




