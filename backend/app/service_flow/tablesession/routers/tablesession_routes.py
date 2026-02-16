from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import selectinload
from sqlmodel import Session, col, func, select

from app.auth.services.auth_service import get_current_active_user
from app.database import get_session

from app.service_flow.order.schemas.order import OrderCreate
from app.service_flow.order.services.order_service import create_order
from app.service_flow.tablesession.models.table_session import TableSession
from app.service_flow.tablesession.schemas.table_session import TableSessionCreate, TableSessionPagination, TableSessionRead, TableSessionUpdate
from app.service_flow.tablesession.services.tablesession_service import create_table_session, delete_table_session_hard, get_table_session_by_id, update_table_session

from app.service_flow.order.models.order import Order, OrderStatus

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
        
    unserved_orders = [
        order for order in tablesession.orders
        if order.status != OrderStatus.SERVED
    ]

    if unserved_orders:
        raise HTTPException(
            status_code=400,
            detail="Cannot close session: all orders must be served"
        )

    tablesession.close_session()

    session.add(tablesession)
    session.commit()
    session.refresh(tablesession)
    

@router.get(
    "/history/paginated",
    response_model=dict, 
    dependencies=[Depends(get_current_active_user)]
)
def get_table_sessions_paginated(
    session: SessionDep,
    page: int = Query(1, ge=1, description="Page number starting from 1"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page")
):
    # Calculate offset
    offset = (page - 1) * page_size
    
    # Query for closed sessions only, ordered by ended_at descending
    statement = (
        select(TableSession)
        .options(selectinload(TableSession.customer))  # ← This is essential!
        .where(col(TableSession.ended_at).is_not(None))
        .order_by(TableSession.ended_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    
    sessions = session.exec(statement).all()
    
    # Get total count for pagination metadata
    count_statement = (
        select(func.count(TableSession.id)) # type:ignore
        .where(col(TableSession.ended_at).is_not(None))
    )
    total = session.exec(count_statement).one()
    
    # Convert to pagination schema
    items = [
        TableSessionPagination(
            id=s.id,
            table_id=s.table_id,
            customer_name=s.customer_name,
            final_bill=s.final_bill,  
            started_at=s.started_at,  
            ended_at=s.ended_at
        )
        for s in sessions
    ]
    
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }

    
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