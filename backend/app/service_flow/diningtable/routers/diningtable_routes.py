from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from sqlalchemy.orm import selectinload


from app.auth.services.auth_service import get_current_active_user
from app.database import get_session

from app.service_flow.diningtable.schemas.dining_table import DiningTableCreate, DiningTableRead
from app.service_flow.diningtable.models.dining_table import DiningTable
from app.service_flow.diningtable.services.diningtable_service import create_table, delete_diningtable_hard, get_table_by_number
from app.service_flow.tablesession.models.table_session import TableSession



SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/tables", tags=["tables"])

@router.get(
    "/",
    response_model=list[DiningTableRead],
    dependencies=[Depends(get_current_active_user)]
)
def get_tables(session: SessionDep):
    tables = session.exec(
        select(DiningTable)
        .options(
            selectinload(DiningTable.sessions)  # type:ignore
            .selectinload(TableSession.customer)  # type:ignore
        )
        .order_by(DiningTable.number) # type:ignore
    ).all()
    
    result = []
    for t in tables:
        s = t.active_session
        result.append(
            DiningTableRead(
                id=t.id,  # type: ignore
                number=t.number,
                type=t.type,
                is_occupied=t.is_occupied,
                active_session_id=s.id if s else None,
                customer_name=t.active_customer_name,  # Using property
                customer_arrival=s.started_at if s else None,  # Original logic
            )
        )
    return result
    
@router.post(
    "/add-table",
    response_model=DiningTableCreate,
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
    table = get_table_by_number(session, table_number)

    if not table:
        raise HTTPException(status_code=404, detail="table not found")

    delete_diningtable_hard(session, table)
