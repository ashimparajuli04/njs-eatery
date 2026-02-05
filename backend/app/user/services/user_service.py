# user/services/user_service.py
# user/services/user_service.py
from sqlmodel import Session, select
from sqlalchemy.exc import IntegrityError
from pydantic import EmailStr, ValidationError, TypeAdapter

from app.user.models.user import User
from app.auth.utils.auth_utils import get_password_hash
from app.user.schemas.user import UserCreate

email_adapter = TypeAdapter(EmailStr)

def create_user(session: Session, data: UserCreate) -> User:
    # 1. validate + normalize email
    try:
        email = email_adapter.validate_python(data.email).lower()
    except ValidationError:
        raise ValueError("Invalid email format")

    # 2. check uniqueness (app-level)
    existing_user = session.exec(
        select(User).where(User.email == email)
    ).first()

    if existing_user:
        raise ValueError("Email already registered")

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
        raise ValueError("Email already registered")

    session.refresh(user)
    return user

def get_users(session: Session):
    return session.exec(select(User)).all()

def get_user_by_email(session: Session, email: str):
    return session.exec(
        select(User).where(User.email == email)
    ).first()
   
def get_user_by_id(session: Session, user_id: int) -> User | None:
    return session.get(User, user_id)

