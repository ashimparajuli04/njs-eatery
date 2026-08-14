from sqlmodel import Session, select

from crud import delete, get_by_id
from exceptions import NotFoundError
from menu.models.menu_item import MenuItem
from service_flow.order.models.order import Order
from service_flow.orderitem.models.order_item import OrderItem
from service_flow.orderitem.schemas.order_item import OrderItemCreate


def get_order_item_by_id(session: Session, id: int) -> OrderItem:
    return get_by_id(session, OrderItem, id, "order item not found")

def create_order_item(session: Session, data: OrderItemCreate, order_id: int) -> OrderItem:
    order = session.get(Order, order_id)
    if not order:
        raise NotFoundError("order not found")
        
    menu_item = session.get(MenuItem, data.menu_item_id)
    if not menu_item:
        raise NotFoundError("menu item not found")
    
    # Check if this menu item already exists in the order
    existing_item = session.exec(
        select(OrderItem).where(
            OrderItem.order_id == order_id,
            OrderItem.menu_item_id == data.menu_item_id,
            OrderItem.note == data.note
        )
    ).first()

    if existing_item:
        existing_item.quantity += data.quantity
        session.add(existing_item)
        session.commit()
        session.refresh(existing_item)
        return existing_item

    # No existing item — create a new row
    order_item = OrderItem(
        **data.model_dump(exclude={"price_at_time"}),
        order_id=order_id,
        price_at_time=menu_item.price
    )
    session.add(order_item)
    session.commit()
    session.refresh(order_item)
    return order_item

def create_order_items_bulk(
    session: Session,
    order_id: int,
    items: list[OrderItemCreate],
) -> list[OrderItem]:
    """Create/merge order items for an order in one transaction (one commit)."""
    order = session.get(Order, order_id)
    if not order:
        raise NotFoundError("order not found")

    menu_item_ids = {item.menu_item_id for item in items}
    menu_items = session.exec(
        select(MenuItem).where(MenuItem.id.in_(menu_item_ids))
    ).all()
    menu_item_by_id = {mi.id: mi for mi in menu_items}
    missing = menu_item_ids - set(menu_item_by_id)
    if missing:
        raise NotFoundError("menu item not found")

    existing_items = session.exec(
        select(OrderItem).where(OrderItem.order_id == order_id)
    ).all()
    by_key = {(oi.menu_item_id, oi.note): oi for oi in existing_items}

    result: list[OrderItem] = []
    touched: set[tuple[int, str | None]] = set()

    for item in items:
        key = (item.menu_item_id, item.note)
        if key in touched:
            continue
        touched.add(key)

        quantity = sum(
            i.quantity for i in items if (i.menu_item_id, i.note) == key
        )
        existing = by_key.get(key)

        if existing:
            existing.quantity += quantity
            result.append(existing)
        else:
            order_item = OrderItem(
                **item.model_dump(exclude={"price_at_time", "quantity"}),
                order_id=order_id,
                quantity=quantity,
                price_at_time=menu_item_by_id[item.menu_item_id].price,
            )
            session.add(order_item)
            result.append(order_item)

    session.commit()
    for order_item in result:
        session.refresh(order_item)
    return result
    
def delete_order_item_hard(session: Session, orderitem: OrderItem):
    return delete(session, orderitem)