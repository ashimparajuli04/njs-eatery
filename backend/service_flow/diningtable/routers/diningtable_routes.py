from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, select
from sqlalchemy.orm import selectinload


from auth.services.auth_service import get_current_active_user
from database import get_session

from service_flow.diningtable.schemas.dining_table import DiningTableCreate, DiningTableDetail, DiningTableRead
from service_flow.diningtable.models.dining_table import DiningTable
from service_flow.diningtable.services.diningtable_service import create_table, delete_diningtable_hard, get_table_by_number
from service_flow.tablesession.models.table_session import TableSession



SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/tables", tags=["tables"])

@router.get(
    "",
    response_model=list[DiningTableRead],
    dependencies=[Depends(get_current_active_user)]
)
def get_tables(session: SessionDep):
    tables = session.exec(
        select(DiningTable)
        .order_by(DiningTable.number)
    ).all()

    # Load only active sessions (ended_at IS NULL) in one query, not all history
    active_sessions = session.exec(
        select(TableSession)
        .where(
            col(TableSession.ended_at).is_(None),
            col(TableSession.table_id).is_not(None),
        )
        .options(
            selectinload(TableSession.customer)
        )
    ).all()

    session_by_table = {s.table_id: s for s in active_sessions}

    result = []
    for t in tables:
        s = session_by_table.get(t.id)
        result.append(
            DiningTableRead(
                id=t.id,  # type: ignore
                number=t.number,
                type=t.type,
                is_occupied=s is not None,
                active_session_id=s.id if s else None,
                customer_name=s.customer_name if s else None,
                customer_arrival=s.started_at if s else None,
            )
        )
    return result
    
@router.post(
    "",
    response_model=DiningTableDetail,
    status_code=201,
    dependencies=[Depends(get_current_active_user)]
)
def creating_table(table_in: DiningTableCreate, session: SessionDep):
    if get_table_by_number(session, table_in.number):
        raise HTTPException(
            status_code=400,
            detail="table already exists"
        )

    return create_table(
        session,
        table_in
    )
    
@router.delete(
    "/{table_number}",
    status_code=204,
    dependencies=[Depends(get_current_active_user)]
)
def delete_table(
    table_number: int,
    session: SessionDep,
):
    table = get_table_by_number(session, table_number, "table not found")

    delete_diningtable_hard(session, table)
