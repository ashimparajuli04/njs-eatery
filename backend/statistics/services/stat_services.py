from collections import Counter
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy.orm import selectinload
from sqlmodel import Session, select

from customer.models.customer import Customer
from service_flow.order.models.order import Order
from service_flow.orderitem.models.order_item import OrderItem
from service_flow.tablesession.models.table_session import TableSession

NEPAL_OFFSET = timedelta(hours=5, minutes=45)


class InvalidRangeError(ValueError):
    pass


def nepal_date(dt: datetime) -> date:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (dt + NEPAL_OFFSET).date()


def nepal_today() -> date:
    return nepal_date(datetime.now(timezone.utc))


def date_to_utc_range(day: date) -> tuple[datetime, datetime]:
    """Nepal day D spans [D 00:00 +05:45, D+1 00:00 +05:45) in UTC."""
    day_start_utc = datetime(
        day.year, day.month, day.day, tzinfo=timezone.utc
    ) - NEPAL_OFFSET
    return day_start_utc, day_start_utc + timedelta(days=1)


def parse_day(value: str) -> date:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise InvalidRangeError("Invalid date format. Use YYYY-MM-DD")


def resolve_range(
    days: int | None,
    start_date: str | None,
    end_date: str | None,
) -> tuple[date, date, int]:
    """Return (start_day, end_day, days) as Nepal dates."""
    if start_date is not None or end_date is not None:
        if start_date is None or end_date is None:
            raise InvalidRangeError(
                "Both start_date and end_date are required when overriding the range"
            )
        start_day = parse_day(start_date)
        end_day = parse_day(end_date)
        if end_day < start_day:
            raise InvalidRangeError("end_date must be on or after start_date")
        return start_day, end_day, (end_day - start_day).days + 1

    days = days if days is not None else 7
    end_day = nepal_today()
    start_day = end_day - timedelta(days=days - 1)
    return start_day, end_day, days


def _closed_sessions(session: Session, start_utc: datetime, end_utc: datetime):
    statement = (
        select(TableSession)
        .where(
            TableSession.ended_at.is_not(None),
            TableSession.ended_at >= start_utc,
            TableSession.ended_at < end_utc,
        )
        .options(
            selectinload(TableSession.orders)
            .selectinload(Order.items)
            .selectinload(OrderItem.menu_item)
        )
    )
    return session.exec(statement).all()


def _aggregate_items(sessions) -> list[dict]:
    item_agg: dict[str, list] = {}
    for ts in sessions:
        for order in ts.orders:
            for oi in order.items:
                name = oi.menu_item.name if oi.menu_item else "Unknown"
                agg = item_agg.setdefault(name, [0, Decimal("0")])
                agg[0] += oi.quantity
                agg[1] += oi.line_total

    return [
        {"name": name, "quantity": qty, "revenue": float(rev)}
        for name, (qty, rev) in sorted(
            item_agg.items(), key=lambda kv: kv[1][0], reverse=True
        )
    ]


def _daily_series(sessions, start_day: date, end_day: date) -> list[dict]:
    day_agg: dict[date, list] = {}
    for ts in sessions:
        day = nepal_date(ts.ended_at)
        agg = day_agg.setdefault(day, [Decimal("0"), 0])
        agg[0] += ts.final_bill or Decimal("0")
        agg[1] += 1

    result = []
    cur = start_day
    while cur <= end_day:
        revenue, count = day_agg.get(cur, (Decimal("0"), 0))
        result.append(
            {"date": cur.isoformat(), "revenue": float(revenue), "sessions": count}
        )
        cur += timedelta(days=1)
    return result


def summary(
    session: Session,
    *,
    days: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    start_day, end_day, days_n = resolve_range(days, start_date, end_date)
    start_utc, _ = date_to_utc_range(start_day)
    _, end_utc = date_to_utc_range(end_day)

    sesses = _closed_sessions(session, start_utc, end_utc)

    revenue = sum((ts.final_bill or Decimal("0")) for ts in sesses)
    session_count = len(sesses)
    order_count = sum(len(ts.orders) for ts in sesses)
    items_sold = sum(oi.quantity for ts in sesses for o in ts.orders for oi in o.items)
    avg_bill = float(revenue) / session_count if session_count else 0.0

    customer_ids = [
        ts.customer_id for ts in sesses if ts.customer_id is not None
    ]
    counts = Counter(customer_ids)
    unique_customers = len(counts)
    repeat_customers = sum(1 for c in counts.values() if c >= 2)

    new_customers = 0
    if customer_ids:
        rows = session.exec(
            select(Customer).where(Customer.id.in_(counts.keys()))
        ).all()
        new_customers = sum(
            1
            for c in rows
            if start_utc <= (c.customer_since or start_utc) < end_utc
        )

    top_items = _aggregate_items(sesses)[:5]
    top_customers = _top_customers(session, sesses)

    return {
        "period": {
            "days": days_n,
            "start_date": start_day.isoformat(),
            "end_date": end_day.isoformat(),
        },
        "totals": {
            "revenue": float(revenue),
            "sessions": session_count,
            "orders": order_count,
            "items_sold": items_sold,
            "avg_bill": avg_bill,
            "unique_customers": unique_customers,
            "repeat_customers": repeat_customers,
            "new_customers": new_customers,
        },
        "daily_revenue": _daily_series(sesses, start_day, end_day),
        "top_items": top_items,
        "top_customers": top_customers,
    }


def _top_customers(session: Session, sessions, limit: int = 5) -> list[dict]:
    customer_ids = {
        ts.customer_id for ts in sessions if ts.customer_id is not None
    }
    if not customer_ids:
        return []

    rows = session.exec(
        select(Customer)
        .where(Customer.id.in_(customer_ids))
        .order_by(Customer.total_spent.desc())
        .limit(limit)
    ).all()

    return [
        {
            "name": c.name,
            "phone_number": c.phone_number,
            "visits": c.visit_count,
            "total_spent": float(c.total_spent),
        }
        for c in rows
    ]


def daily_revenue(
    session: Session,
    *,
    days: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict:
    start_day, end_day, days_n = resolve_range(days, start_date, end_date)
    start_utc, _ = date_to_utc_range(start_day)
    _, end_utc = date_to_utc_range(end_day)

    sesses = _closed_sessions(session, start_utc, end_utc)

    return {
        "period": {
            "days": days_n,
            "start_date": start_day.isoformat(),
            "end_date": end_day.isoformat(),
        },
        "daily_revenue": _daily_series(sesses, start_day, end_day),
    }


def top_items(
    session: Session,
    *,
    days: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 5,
) -> list[dict]:
    start_day, end_day, _ = resolve_range(days, start_date, end_date)
    start_utc, _ = date_to_utc_range(start_day)
    _, end_utc = date_to_utc_range(end_day)

    sesses = _closed_sessions(session, start_utc, end_utc)
    return _aggregate_items(sesses)[:limit]


def top_customers(
    session: Session,
    *,
    days: int | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
    limit: int = 5,
) -> list[dict]:
    start_day, end_day, _ = resolve_range(days, start_date, end_date)
    start_utc, _ = date_to_utc_range(start_day)
    _, end_utc = date_to_utc_range(end_day)

    sesses = _closed_sessions(session, start_utc, end_utc)
    return _top_customers(session, sesses, limit=limit)
