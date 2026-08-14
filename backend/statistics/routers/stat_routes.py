from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlmodel import Session, col, select

from auth.services.auth_service import get_current_active_user
from database import get_session
from service_flow.tablesession.models.table_session import TableSession
from statistics.schemas.stat import AnalyticsSummary, TopCustomer, TopItem
from statistics.services.stat_services import (
    InvalidRangeError,
    daily_revenue as daily_revenue_data,
    summary,
    top_customers as top_customers_data,
    top_items as top_items_data,
)
SessionDep = Annotated[Session, Depends(get_session)]
router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get(
    "/summary",
    response_model=AnalyticsSummary,
    dependencies=[Depends(get_current_active_user)],
)
def get_analytics_summary(
    session: SessionDep,
    days: int = Query(7, ge=1, le=30, description="Days to look back"),
    start_date: str | None = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str | None = Query(None, description="End date in YYYY-MM-DD"),
):
    try:
        return summary(
            session,
            days=days,
            start_date=start_date,
            end_date=end_date,
        )
    except InvalidRangeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get(
    "/revenue/daily",
    response_model=dict,
    dependencies=[Depends(get_current_active_user)],
)
def get_daily_revenue(
    session: SessionDep,
    days: int = Query(7, ge=1, le=30, description="Days to look back"),
    start_date: str | None = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str | None = Query(None, description="End date in YYYY-MM-DD"),
):
    try:
        return daily_revenue_data(
            session,
            days=days,
            start_date=start_date,
            end_date=end_date,
        )
    except InvalidRangeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get(
    "/top-items",
    response_model=list[TopItem],
    dependencies=[Depends(get_current_active_user)],
)
def get_top_items(
    session: SessionDep,
    days: int = Query(30, ge=1, le=365, description="Days to look back"),
    limit: int = Query(5, ge=1, le=20, description="Number of items"),
    start_date: str | None = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str | None = Query(None, description="End date in YYYY-MM-DD"),
):
    try:
        return top_items_data(
            session,
            days=days,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
    except InvalidRangeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get(
    "/top-customers",
    response_model=list[TopCustomer],
    dependencies=[Depends(get_current_active_user)],
)
def get_top_customers(
    session: SessionDep,
    days: int = Query(30, ge=1, le=365, description="Days to look back"),
    limit: int = Query(5, ge=1, le=20, description="Number of customers"),
    start_date: str | None = Query(None, description="Start date in YYYY-MM-DD"),
    end_date: str | None = Query(None, description="End date in YYYY-MM-DD"),
):
    try:
        return top_customers_data(
            session,
            days=days,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
        )
    except InvalidRangeError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get(
    "/revenue/weekly",
    dependencies=[Depends(get_current_active_user)],
)
def get_weekly_revenue(
    session: SessionDep,
    start_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    end_date: str = Query(..., description="End date in YYYY-MM-DD format"),
):
    """
    Get daily revenue for a date range (typically a week).
    Returns total revenue for each day.
    """
    # Parse dates as UTC-aware; data is stored in timestamptz (UTC)
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        end = datetime.strptime(end_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        # Include the entire end date
        end = end + timedelta(days=1)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Invalid date format. Use YYYY-MM-DD",
        )

    # Query for closed sessions within date range, grouped by day
    statement = (
        select(
            func.date(TableSession.ended_at).label('date'),
            func.sum(TableSession.final_bill).label('revenue')
        )
        .where(
            col(TableSession.ended_at).is_not(None),  # Only closed sessions
            TableSession.ended_at >= start,
            TableSession.ended_at < end
        )
        .group_by(func.date(TableSession.ended_at))
        .order_by(func.date(TableSession.ended_at))
    )

    results = session.exec(statement).all()

    # Format response
    daily_revenue = [
        {
            "date": str(result.date),
            "revenue": float(result.revenue) if result.revenue else 0.0
        }
        for result in results
    ]

    # Calculate total for the period
    total_revenue = sum(item["revenue"] for item in daily_revenue)

    return {
        "start_date": start_date,
        "end_date": end_date,
        "daily_revenue": daily_revenue,
        "total_revenue": total_revenue,
        "days_count": len(daily_revenue)
    }
