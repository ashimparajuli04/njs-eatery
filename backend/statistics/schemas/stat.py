from sqlmodel import SQLModel


class Period(SQLModel):
    days: int
    start_date: str
    end_date: str


class Totals(SQLModel):
    revenue: float
    sessions: int
    orders: int
    items_sold: int
    avg_bill: float
    unique_customers: int
    repeat_customers: int
    new_customers: int


class DailyRevenue(SQLModel):
    date: str
    revenue: float
    sessions: int


class TopItem(SQLModel):
    name: str
    quantity: int
    revenue: float


class TopCustomer(SQLModel):
    name: str
    phone_number: str
    visits: int
    total_spent: float


class AnalyticsSummary(SQLModel):
    period: Period
    totals: Totals
    daily_revenue: list[DailyRevenue]
    top_items: list[TopItem]
    top_customers: list[TopCustomer]
