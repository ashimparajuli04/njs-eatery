from sqlmodel import Session, select

from crud import get_by_id
from customer.models.customer import Customer
from customer.schemas.customer import CustomerCreate
from exceptions import BadRequestError


def get_customer_by_number(session: Session, number: str):
    return session.exec(
        select(Customer).where(Customer.phone_number == number)
    ).first()
    
def get_customer_by_id(session: Session, id: int) -> Customer:
    return get_by_id(session, Customer, id, "Customer not found")
    
def create_customer(session: Session, data: CustomerCreate) -> Customer:
    if get_customer_by_number(session, data.phone_number):
        raise BadRequestError("customer already exists")

    # 3. create user
    customer = Customer(
        **data.model_dump()
    )

    session.add(customer)
    session.commit()
    session.refresh(customer)
    return customer