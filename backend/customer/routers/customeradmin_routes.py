from typing import Annotated

from fastapi import APIRouter, Depends
from sqlmodel import Session

from auth.services.auth_service import get_current_active_user
from customer.schemas.customer import CustomerInfo
from customer.services.customer_service import get_customer_by_id
from database import get_session


SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(
    prefix="/admin/customers",
    tags=["customer"],
)

@router.get(
    "/{id}/info",
    response_model=CustomerInfo,
    dependencies=[Depends(get_current_active_user)]
)
def read_customer_info_by_id(
    id:int,
    session: SessionDep
):
    customer = get_customer_by_id(session, id)

    return customer