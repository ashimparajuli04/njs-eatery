from sqlmodel import Session

from crud import delete, get_by_id, update
from exceptions import NotFoundError
from service_flow.order.models.order import Order
from service_flow.order.schemas.order import OrderUpdate
from service_flow.tablesession.models.table_session import TableSession

def get_order_by_id(session: Session, id: int) -> Order:
    return get_by_id(session, Order, id, "order not found")

def create_order(table_session_id: int, session: Session) -> Order:
    tablesession = session.get(TableSession, table_session_id)
    if not tablesession:
        raise NotFoundError("table session not found")

    # 3. create user
    order = Order(
        session_id=table_session_id
    )

    session.add(order)
    session.commit()
    session.refresh(order)
    return order

def delete_order_hard(session: Session, order: Order):
    return delete(session, order)

def update_order(
    *,
    session: Session,
    order: Order,
    data: OrderUpdate
) -> Order:
    return update(session, order, data)