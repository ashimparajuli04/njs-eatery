from typing import TypeVar

from sqlmodel import Session

from exceptions import NotFoundError

T = TypeVar("T")


def get_by_id(
    session: Session,
    model: type[T],
    record_id: int,
    detail: str = "Not found",
) -> T:
    record = session.get(model, record_id)
    if not record:
        raise NotFoundError(detail)
    return record


def update(session: Session, record: T, data) -> T:
    data_dict = data.model_dump(exclude_unset=True)

    for key, value in data_dict.items():
        setattr(record, key, value)

    session.add(record)
    session.commit()
    session.refresh(record)
    return record


def delete(session: Session, record: T) -> None:
    session.delete(record)
    session.commit()
