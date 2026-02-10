from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.auth.services.auth_service import require_admin
from app.database import get_session

from app.service_flow.diningtable.schemas.dining_table import DiningTableCreate

from app.service_flow.diningtable.services.diningtable_service import create_table, delete_diningtable_hard, get_table_by_number


SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(prefix="/admin/tables", tags=["tables"])

@router.post(
    "/add-table",
    response_model=DiningTableCreate,
    status_code=201,
    dependencies=[Depends(require_admin)]
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
    dependencies=[Depends(require_admin)]
)
def delete_table(
    table_number: int,
    session: SessionDep,
):
    table = get_table_by_number(session, table_number)

    if not table:
        raise HTTPException(status_code=404, detail="table not found")

    delete_diningtable_hard(session, table)