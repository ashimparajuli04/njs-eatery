from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from app.auth.services.auth_service import get_current_active_user
from app.database import get_session

from app.service_flow.order.schemas.order import OrderCreate
from app.service_flow.order.services.order_service import create_order
from app.service_flow.tablesession.models.table_session import TableSession
from app.service_flow.tablesession.schemas.table_session import TableSessionCreate, TableSessionRead, TableSessionUpdate
from app.service_flow.tablesession.services.tablesession_service import create_table_session, delete_table_session_hard, get_table_session_by_id, update_table_session

from app.service_flow.order.models.order import Order

SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/table-sessions", tags=["table-sessions"])

@router.post(
    "",
    response_model=TableSessionRead,
    status_code=201,
    dependencies=[Depends(get_current_active_user)]
)
def creating_table_session(table_in: TableSessionCreate, session: SessionDep):
    return create_table_session(
        session,
        table_in
    )
    
@router.post(
    "/{table_session_id}/orders",
    response_model=OrderCreate,
    status_code=201,
    dependencies=[Depends(get_current_active_user)]
)
def creating_order(table_session_id: int, session: SessionDep):
    return create_order(
        table_session_id,
        session,
    )

@router.post(
    "/{session_id}/close",
    dependencies=[Depends(get_current_active_user)]
)
def close_table_session(session_id: int, session: SessionDep):
    tablesession = session.get(TableSession, session_id)

    if not tablesession:
        raise HTTPException(status_code=404, detail="Session not found")

    if tablesession.ended_at is not None:
        raise HTTPException(status_code=400, detail="Session already closed")

    tablesession.close_session()

    session.add(tablesession)
    session.commit()
    session.refresh(tablesession)
    
@router.get(
    "/{session_id}",
    response_model=TableSessionRead,
    dependencies=[Depends(get_current_active_user)]
)
def get_table_session(session_id: int, session: SessionDep):

    statement = (
        select(TableSession)
        .where(TableSession.id == session_id)
        .options(
            selectinload(TableSession.orders) #type: ignore
            .selectinload(Order.items) #type: ignore
        )
    )

    table_session = session.exec(statement).first()

    if not table_session:
        raise HTTPException(status_code=404, detail="Session not found")

    return table_session

    
@router.delete(
    "/{table_session_id}",
    status_code=204,
    dependencies=[Depends(get_current_active_user)]
)
def delete_table_session(
    table_session_id: int,
    session: SessionDep,
):
    table_session = get_table_session_by_id(session, table_session_id)

    if not table_session:
        raise HTTPException(status_code=404, detail="table session not found")

    delete_table_session_hard(session, table_session)
    
@router.patch(
    "/{table_session_id}",
    response_model=TableSession,
    dependencies=[Depends(get_current_active_user)]
)
def patch_category(
    table_session_id: int,
    data: TableSessionUpdate,
    session: SessionDep,
):
    tablesession = get_table_session_by_id(session, table_session_id)

    return update_table_session(session=session, tablesession=tablesession, data=data) # type: ignore