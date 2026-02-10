from sqlmodel import SQLModel, Field, Relationship
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.service_flow.tablesession.models.table_session import TableSession

class DiningTable(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True)
    number: int = Field(unique=True, index=True)  # 1–15

    sessions: list["TableSession"] = Relationship(
        back_populates="table",
    )
    
    @property
    def active_session(self) -> "TableSession | None":
        return next(
            (s for s in self.sessions if s.ended_at is None),
            None
        )

    @property
    def is_occupied(self) -> bool:
        return self.active_session is not None