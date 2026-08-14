from sqlmodel import select, Session

from crud import delete
from exceptions import BadRequestError, NotFoundError
from service_flow.diningtable.models.dining_table import DiningTable
from service_flow.diningtable.schemas.dining_table import DiningTableCreate
from service_flow.tablesession.models.table_session import TableSession


def get_table_by_number(session: Session, number: int, detail: str | None = None):
    table = session.exec(
        select(DiningTable).where(DiningTable.number == number)
    ).first()

    if table is None and detail is not None:
        raise NotFoundError(detail)

    return table
    
def create_table(session: Session, data: DiningTableCreate) -> DiningTable:

    # 3. create user
    table = DiningTable(
        number=data.number,
        type=data.type
    )

    session.add(table)
    session.commit()
    session.refresh(table)
    return table

def delete_diningtable_hard(session: Session, table: DiningTable):
    has_sessions = session.exec(
        select(TableSession).where(TableSession.table_id == table.id)
    ).first()

    if has_sessions:
        raise BadRequestError("cannot delete a table with session history")

    return delete(session, table)