from sqlmodel import Session

from crud import delete, get_by_id, update
from customer.models.customer import Customer
from exceptions import BadRequestError, NotFoundError
from service_flow.diningtable.models.dining_table import DiningTable
from service_flow.tablesession.models.table_session import TableSession
from service_flow.tablesession.schemas.table_session import TableSessionCreate, TableSessionUpdate

def get_table_session_by_id(session: Session, id: int) -> TableSession:
    return get_by_id(session, TableSession, id, "table session not found")

def create_table_session(session: Session, data: TableSessionCreate) -> TableSession:
    diningtable = session.get(DiningTable, data.table_id)
    if not diningtable:
        raise NotFoundError("Dining table not found")
    
    # 2. Enforce business rule
    if diningtable.is_occupied:
        raise BadRequestError("Dining table is already occupied")
    # 3. create user
    tablesession = TableSession(
        table_id=data.table_id,
    )

    session.add(tablesession)
    session.commit()
    session.refresh(tablesession)
    return tablesession
    
def delete_table_session_hard(session: Session, table: TableSession):
    return delete(session, table)

def update_table_session(
    *,
    session: Session,
    tablesession: TableSession,
    data: TableSessionUpdate
) -> TableSession:
    if data.customer_id is not None:
        customer = session.get(Customer, data.customer_id)
        if not customer:
            raise NotFoundError("customer not found")

    return update(session, tablesession, data)