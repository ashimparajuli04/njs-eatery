from datetime import datetime, timezone, timedelta

import pytest


def test_invalid_date_400(client, admin_headers):
    resp = client.get(
        "/analytics/revenue/weekly",
        headers=admin_headers,
        params={"start_date": "not-a-date", "end_date": "2026-08-14"},
    )
    assert resp.status_code == 400


def test_revenue_counts_only_closed_sessions(client, admin_headers):
    item = make_menu(client, admin_headers, "Latte", 200)
    table = make_table(client, admin_headers)

    closed_session = make_session(client, admin_headers, table["id"])
    closed_order = make_order(client, admin_headers, closed_session["id"])
    client.post(
        f"/orders/{closed_order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 1},
    )
    client.patch(f"/orders/{closed_order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{closed_session['id']}/close", headers=admin_headers)

    table2 = make_table(client, admin_headers, number=2)
    open_session = make_session(client, admin_headers, table2["id"])
    open_order = make_order(client, admin_headers, open_session["id"])
    client.post(
        f"/orders/{open_order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 5},
    )

    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=7)).isoformat()
    end = today.isoformat()
    resp = client.get(
        "/analytics/revenue/weekly",
        headers=admin_headers,
        params={"start_date": start, "end_date": end},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["total_revenue"] == 200


def test_summary_zero_data(client, admin_headers):
    resp = client.get("/analytics/summary", headers=admin_headers, params={"days": 7})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["totals"]["revenue"] == 0
    assert body["totals"]["sessions"] == 0
    assert body["totals"]["orders"] == 0
    assert body["totals"]["items_sold"] == 0
    assert body["totals"]["avg_bill"] == 0
    assert body["totals"]["unique_customers"] == 0
    assert body["totals"]["repeat_customers"] == 0
    assert body["totals"]["new_customers"] == 0
    assert body["top_items"] == []
    assert body["top_customers"] == []
    assert body["period"]["days"] == 7
    assert len(body["daily_revenue"]) == 7
    assert all(day["revenue"] == 0 and day["sessions"] == 0 for day in body["daily_revenue"])


def test_summary_counts_and_rankings(client, admin_headers):
    item = make_menu(client, admin_headers, "Black Tea", 249.95)
    item2 = make_menu(client, admin_headers, "Milk Tea", 120)
    customer = client.post(
        "/customers",
        headers=admin_headers,
        json={"name": "Sita", "phone_number": "9801111111"},
    ).json()

    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    client.patch(
        f"/table-sessions/{session_['id']}",
        headers=admin_headers,
        json={"customer_id": customer["id"]},
    )
    order = make_order(client, admin_headers, session_["id"])
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 2},
    )
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item2["id"], "quantity": 1},
    )
    client.patch(f"/orders/{order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{session_['id']}/close", headers=admin_headers)

    today = datetime.now(timezone.utc).date()
    start = (today - timedelta(days=6)).isoformat()
    end = today.isoformat()

    resp = client.get(
        "/analytics/summary",
        headers=admin_headers,
        params={"start_date": start, "end_date": end},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["totals"]["revenue"] == pytest.approx(2 * 249.95 + 120)
    assert body["totals"]["sessions"] == 1
    assert body["totals"]["orders"] == 1
    assert body["totals"]["items_sold"] == 3
    assert body["totals"]["avg_bill"] == pytest.approx(2 * 249.95 + 120)
    assert body["totals"]["unique_customers"] == 1
    assert body["totals"]["repeat_customers"] == 0
    assert body["totals"]["new_customers"] == 1

    assert body["top_items"][0]["name"] == "Black Tea"
    assert body["top_items"][0]["quantity"] == 2
    assert body["top_items"][0]["revenue"] == pytest.approx(2 * 249.95)

    assert body["top_customers"][0]["name"] == "Sita"
    assert body["top_customers"][0]["total_spent"] == pytest.approx(2 * 249.95 + 120)
    assert body["top_customers"][0]["visits"] == 1

    day_with_revenue = [d for d in body["daily_revenue"] if d["revenue"] > 0]
    assert len(day_with_revenue) == 1
    assert day_with_revenue[0]["sessions"] == 1


def test_revenue_daily_endpoint(client, admin_headers):
    item = make_menu(client, admin_headers, "Latte", 150)
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    order = make_order(client, admin_headers, session_["id"])
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 1},
    )
    client.patch(f"/orders/{order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{session_['id']}/close", headers=admin_headers)

    resp = client.get("/analytics/revenue/daily", headers=admin_headers, params={"days": 7})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["period"]["days"] == 7
    assert len(body["daily_revenue"]) == 7
    assert sum(d["revenue"] for d in body["daily_revenue"]) == pytest.approx(150)


def test_top_items_endpoint(client, admin_headers):
    item = make_menu(client, admin_headers, "Black Tea", 249.95)
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    order = make_order(client, admin_headers, session_["id"])
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 3},
    )
    client.patch(f"/orders/{order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{session_['id']}/close", headers=admin_headers)

    resp = client.get(
        "/analytics/top-items", headers=admin_headers, params={"days": 30, "limit": 5}
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()[0]["name"] == "Black Tea"
    assert resp.json()[0]["quantity"] == 3


def test_top_customers_endpoint(client, admin_headers):
    item = make_menu(client, admin_headers, "Latte", 150)
    customer = client.post(
        "/customers",
        headers=admin_headers,
        json={"name": "Hari", "phone_number": "9802222222"},
    ).json()
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    client.patch(
        f"/table-sessions/{session_['id']}",
        headers=admin_headers,
        json={"customer_id": customer["id"]},
    )
    order = make_order(client, admin_headers, session_["id"])
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 1},
    )
    client.patch(f"/orders/{order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{session_['id']}/close", headers=admin_headers)

    resp = client.get(
        "/analytics/top-customers",
        headers=admin_headers,
        params={"days": 30, "limit": 5},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()[0]["name"] == "Hari"
    assert resp.json()[0]["total_spent"] == pytest.approx(150)


def test_summary_invalid_ranges(client, admin_headers):
    resp = client.get(
        "/analytics/summary",
        headers=admin_headers,
        params={"start_date": "2026-08-20", "end_date": "2026-08-10"},
    )
    assert resp.status_code == 400

    resp = client.get(
        "/analytics/summary",
        headers=admin_headers,
        params={"start_date": "bad", "end_date": "2026-08-10"},
    )
    assert resp.status_code == 400

    resp = client.get(
        "/analytics/summary",
        headers=admin_headers,
        params={"start_date": "2026-08-10"},
    )
    assert resp.status_code == 400


def make_menu(client, headers, name="Latte", price=200):
    cat = client.post(
        "/admin/menu/categories", headers=headers, json={"name": "Coffee"}
    )
    assert cat.status_code == 200, cat.text
    item = client.post(
        "/admin/menu/items",
        headers=headers,
        json={"name": name, "price": price, "category_id": cat.json()["id"]},
    )
    assert item.status_code == 200, item.text
    return item.json()


def make_table(client, headers, number=1):
    resp = client.post(
        "/tables", headers=headers, json={"number": number, "type": "indoor"}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def make_session(client, headers, table_id):
    resp = client.post(
        "/table-sessions", headers=headers, json={"table_id": table_id}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def make_order(client, headers, session_id):
    resp = client.post(
        f"/table-sessions/{session_id}/orders", headers=headers
    )
    assert resp.status_code == 201, resp.text
    return resp.json()
