from sqlmodel import select, Session

from app.service_flow.diningtable.models.dining_table import DiningTable
from app.service_flow.diningtable.schemas.dining_table import DiningTableCreate


def get_table_by_number(session: Session, number: int):
    return session.exec(
        select(DiningTable).where(DiningTable.number == number)
    ).first()
    
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
    session.delete(table)
    session.commit()