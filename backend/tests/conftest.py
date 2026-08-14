import os

import psycopg2
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, create_engine

from app import app
from auth.utils.auth_utils import get_password_hash
from database import get_session
from user.models.user import User, UserRole

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5433/njs_cafe_test",
)


def _ensure_test_database():
    db_name = TEST_DATABASE_URL.rsplit("/", 1)[-1]
    maintenance_url = TEST_DATABASE_URL.rsplit("/", 1)[0] + "/postgres"
    conn = psycopg2.connect(maintenance_url)
    conn.autocommit = True
    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (db_name,))
        if cur.fetchone() is None:
            cur.execute(f'CREATE DATABASE "{db_name}"')
    conn.close()


_ensure_test_database()

test_engine = create_engine(TEST_DATABASE_URL)


def override_get_session():
    with Session(test_engine) as session:
        yield session


@pytest.fixture()
def client():
    SQLModel.metadata.drop_all(test_engine)
    SQLModel.metadata.create_all(test_engine)

    app.dependency_overrides[get_session] = override_get_session
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def db_session():
    with Session(test_engine) as session:
        yield session


def create_user(session, email, password, role=UserRole.EMPLOYEE):
    user = User(
        email=email,
        first_name="Test",
        last_name="User",
        password_hash=get_password_hash(password),
        role=role,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


@pytest.fixture()
def admin_user(db_session):
    return create_user(db_session, "admin@test.com", "adminpass123", UserRole.ADMIN)


@pytest.fixture()
def employee_user(db_session):
    return create_user(db_session, "staff@test.com", "staffpass123", UserRole.EMPLOYEE)


def login(client, email, password):
    resp = client.post(
        "/auth/token",
        data={"username": email, "password": password},
    )
    assert resp.status_code == 200, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


@pytest.fixture()
def admin_headers(client, admin_user):
    return login(client, "admin@test.com", "adminpass123")


@pytest.fixture()
def employee_headers(client, employee_user):
    return login(client, "staff@test.com", "staffpass123")
