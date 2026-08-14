from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from auth.services.auth_service import get_current_active_user
from customer.schemas.customer import CustomerCreate, CustomerRead
from customer.services.customer_service import create_customer, get_customer_by_id, get_customer_by_number
from database import get_session


SessionDep = Annotated[Session, Depends(get_session)]

router = APIRouter(
    prefix="/customers",
    tags=["customer"],
)

@router.get(
    "/by-phone/{number}",
    response_model=CustomerRead,
    dependencies=[Depends(get_current_active_user)]
)
def read_customer_by_number(
    number:str,
    session: SessionDep
):
    customer = get_customer_by_number(session, number)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return customer
    
@router.get(
    "/by-id/{id}",
    response_model=CustomerRead,
    dependencies=[Depends(get_current_active_user)]
)
def read_customer_by_id(
    id:int,
    session: SessionDep
):
    customer = get_customer_by_id(session, id)
    
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    return customer

@router.post(
    "",
    response_model=CustomerRead,
    dependencies=[Depends(get_current_active_user)]
)
def create_customer_route(
    customer: CustomerCreate,
    session: SessionDep
):
    return create_customer(session, customer)
    


