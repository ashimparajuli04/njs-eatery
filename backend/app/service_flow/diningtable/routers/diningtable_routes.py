from typing import Annotated
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload


from app.auth.services.auth_service import get_current_active_user
from app.database import get_session

from app.service_flow.diningtable.schemas.dining_table import DiningTableRead
from app.service_flow.diningtable.models.dining_table import DiningTable



SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/tables", tags=["tables"])

@router.get(
    "/",
    response_model=list[DiningTableRead],
    dependencies=[Depends(get_current_active_user)]
)
def get_tables(session: SessionDep):
    tables = session.exec(
        select(DiningTable).options(selectinload(DiningTable.sessions)) # type:ignore
    ).all()

    return [
        DiningTableRead(
            id=t.id, # type:ignore
            number=t.number,
            is_occupied=t.is_occupied,
            active_session_id=t.active_session.id if t.active_session else None,
            customer_name=t.active_session.customer_name if t.active_session else None,
        )
        for t in tables
    ]
