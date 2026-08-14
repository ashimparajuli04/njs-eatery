from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Case
from sqlalchemy.orm import selectinload
from sqlmodel import Session, select, func

from auth.services.auth_service import get_current_active_user
from database import get_session
from service_flow.order.models.order import Order, OrderStatus
from service_flow.order.schemas.order import OrderRead
from service_flow.order.services.order_service import delete_order_hard, get_order_by_id
from service_flow.orderitem.schemas.order_item import OrderItemCreate
from service_flow.orderitem.services.orderitem_services import create_order_item, create_order_items_bulk


SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/orders", tags=["orders"])

@router.post(
    "/{order_id}/items",
    status_code=201,
    dependencies=[Depends(get_current_active_user)]
)
def create_order_item_route(
    order_id: int,
    order_item_in: OrderItemCreate,
    session: SessionDep,
):
    return create_order_item(
        session,
        order_item_in,
        order_id
    )

@router.post(
    "/{order_id}/items/bulk",
    status_code=201,
    dependencies=[Depends(get_current_active_user)]
)
def create_order_items_bulk_route(
    order_id: int,
    order_items_in: list[OrderItemCreate],
    session: SessionDep,
):
    return create_order_items_bulk(
        session,
        order_id,
        order_items_in,
    )
    
@router.delete(
    "/{id}",
    status_code=204,
    dependencies=[Depends(get_current_active_user)]
)
def delete_order(
    id: int,
    session: SessionDep,
):
    order = get_order_by_id(session, id)

    delete_order_hard(session, order)
    
@router.patch(
    "/{order_id}/toggle-status",
    response_model=Order,
    dependencies=[Depends(get_current_active_user)]
)
def patch_order(
    order_id: int,
    session: SessionDep,
):
    order = get_order_by_id(session, order_id)

    order.toggle_served()
    session.add(order)
    session.commit()
    session.refresh(order)

    return order

@router.get(
    "",
    response_model=dict,  # Changed to return paginated response
    dependencies=[Depends(get_current_active_user)]
)
def read_orders(
    session: SessionDep,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page")
):
    # Base query
    statement = (
        select(Order)
        .options(selectinload(Order.items))
        .order_by(
            Case(
                (Order.status == OrderStatus.PENDING, 0),
                else_=1
            ),
            Case(
                (Order.status == OrderStatus.PENDING, Order.created_at),
                else_=None
            ).asc(),
            Case(
                (Order.status == OrderStatus.SERVED, Order.served_at),
                else_=None
            ).desc()
        )
    )
    
    # Get total count
    count_statement = select(func.count()).select_from(Order)
    total = session.exec(count_statement).one()
    
    # Apply pagination
    offset = (page - 1) * page_size
    paginated_statement = statement.offset(offset).limit(page_size)
    orders = session.exec(paginated_statement).all()
    
    orders_read = [OrderRead.model_validate(order) for order in orders]
    
    return {
        "orders": orders_read,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": (total + page_size - 1) // page_size
    }