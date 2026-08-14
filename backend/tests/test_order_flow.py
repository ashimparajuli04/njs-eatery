import pytest
from datetime import datetime, timezone


def make_table(client, headers, number=1):
    resp = client.post(
        "/tables",
        headers=headers,
        json={"number": number, "type": "indoor"},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def make_session(client, headers, table_id):
    resp = client.post(
        "/table-sessions",
        headers=headers,
        json={"table_id": table_id},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def make_order(client, headers, session_id):
    resp = client.post(
        f"/table-sessions/{session_id}/orders",
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


def make_menu(client, headers, name="Black Tea", price=249.95):
    cat = client.post(
        "/admin/menu/categories", headers=headers, json={"name": "Drinks"}
    )
    assert cat.status_code == 200, cat.text
    cat_id = cat.json()["id"]
    item = client.post(
        "/admin/menu/items",
        headers=headers,
        json={"name": name, "price": price, "category_id": cat_id},
    )
    assert item.status_code == 200, item.text
    return item.json()


def test_full_order_flow_with_revenue(client, admin_headers):
    item = make_menu(client, admin_headers, "Black Tea", 249.95)
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    order = make_order(client, admin_headers, session_["id"])

    add = client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 2},
    )
    assert add.status_code == 201, add.text
    assert add.json()["quantity"] == 2
    assert add.json()["price_at_time"] == 249.95

    bulk = client.post(
        f"/orders/{order['id']}/items/bulk",
        headers=admin_headers,
        json=[
            {"menu_item_id": item["id"], "quantity": 1},
            {"menu_item_id": item["id"], "quantity": 3},
        ],
    )
    assert bulk.status_code == 201, bulk.text
    assert len(bulk.json()) == 1
    assert bulk.json()[0]["quantity"] == 6

    detail = client.get(
        f"/table-sessions/{session_['id']}", headers=admin_headers
    )
    assert detail.json()["orders"][0]["items"][0]["line_total"] == pytest.approx(6 * 249.95)

    served = client.patch(
        f"/orders/{order['id']}/toggle-status", headers=admin_headers
    )
    assert served.status_code == 200, served.text
    body = served.json()
    assert body["status"] == "served"
    assert body["final_total"] == pytest.approx(6 * 249.95)

    assert client.get("/tables", headers=admin_headers).json()[0]["is_occupied"] is True

    closed = client.post(
        f"/table-sessions/{session_['id']}/close", headers=admin_headers
    )
    assert closed.status_code == 200, closed.text

    tables = client.get("/tables", headers=admin_headers).json()
    assert tables[0]["is_occupied"] is False

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    revenue = client.get(
        "/analytics/revenue/weekly",
        headers=admin_headers,
        params={"start_date": today, "end_date": today},
    )
    assert revenue.status_code == 200, revenue.text
    assert revenue.json()["total_revenue"] == pytest.approx(6 * 249.95)


def test_bulk_unknown_item_404_nothing_inserted(client, admin_headers):
    item = make_menu(client, admin_headers)
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    order = make_order(client, admin_headers, session_["id"])

    resp = client.post(
        f"/orders/{order['id']}/items/bulk",
        headers=admin_headers,
        json=[
            {"menu_item_id": item["id"], "quantity": 1},
            {"menu_item_id": 999999, "quantity": 1},
        ],
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "menu item not found"

    detail = client.get(
        f"/table-sessions/{session_['id']}", headers=admin_headers
    )
    assert detail.json()["orders"][0]["items"] == []


def test_single_item_merges_quantity(client, admin_headers):
    item = make_menu(client, admin_headers, "Milk Tea", 120)
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    order = make_order(client, admin_headers, session_["id"])

    payload = {"menu_item_id": item["id"], "quantity": 2}
    client.post(f"/orders/{order['id']}/items", headers=admin_headers, json=payload)
    client.post(f"/orders/{order['id']}/items", headers=admin_headers, json=payload)

    detail = client.get(f"/table-sessions/{session_['id']}", headers=admin_headers).json()
    items = detail["orders"][0]["items"]
    assert len(items) == 1
    assert items[0]["quantity"] == 4


def test_create_session_unknown_table_404(client, admin_headers):
    resp = client.post(
        "/table-sessions", headers=admin_headers, json={"table_id": 9999}
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Dining table not found"


def test_duplicate_table_400(client, admin_headers):
    make_table(client, admin_headers, number=1)
    resp = client.post(
        "/tables", headers=admin_headers, json={"number": 1, "type": "indoor"}
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "table already exists"


def test_session_on_occupied_table_400(client, admin_headers):
    table = make_table(client, admin_headers)
    make_session(client, admin_headers, table["id"])
    resp = client.post(
        "/table-sessions", headers=admin_headers, json={"table_id": table["id"]}
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Dining table is already occupied"


def test_close_session_with_unserved_orders_400(client, admin_headers):
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    make_order(client, admin_headers, session_["id"])
    resp = client.post(
        f"/table-sessions/{session_['id']}/close", headers=admin_headers
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cannot close session: all orders must be served"


def test_close_already_closed_session_400(client, admin_headers):
    item = make_menu(client, admin_headers)
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

    resp = client.post(
        f"/table-sessions/{session_['id']}/close", headers=admin_headers
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Session already closed"


def test_cannot_unserve_order_in_closed_session_409(client, admin_headers):
    item = make_menu(client, admin_headers)
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

    resp = client.patch(
        f"/orders/{order['id']}/toggle-status", headers=admin_headers
    )
    assert resp.status_code == 409
    assert resp.json()["detail"] == "Cannot un-serve an order in a closed session"


def test_delete_table_with_session_history_400(client, admin_headers):
    table = make_table(client, admin_headers)
    make_session(client, admin_headers, table["id"])

    resp = client.delete(f"/tables/{table['number']}", headers=admin_headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "cannot delete a table with session history"


def test_patch_session_unknown_customer_404(client, admin_headers):
    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    resp = client.patch(
        f"/table-sessions/{session_['id']}",
        headers=admin_headers,
        json={"customer_id": 9999},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "customer not found"


def test_customer_stats_bump_on_close(client, admin_headers):
    item = make_menu(client, admin_headers, "Espresso", 150)
    customer = client.post(
        "/customers",
        headers=admin_headers,
        json={"name": "Ram", "phone_number": "9800000000"},
    )
    assert customer.status_code == 200, customer.text
    customer_id = customer.json()["id"]

    table = make_table(client, admin_headers)
    session_ = make_session(client, admin_headers, table["id"])
    patched = client.patch(
        f"/table-sessions/{session_['id']}",
        headers=admin_headers,
        json={"customer_id": customer_id},
    )
    assert patched.status_code == 200

    order = make_order(client, admin_headers, session_["id"])
    client.post(
        f"/orders/{order['id']}/items",
        headers=admin_headers,
        json={"menu_item_id": item["id"], "quantity": 2},
    )
    client.patch(f"/orders/{order['id']}/toggle-status", headers=admin_headers)
    client.post(f"/table-sessions/{session_['id']}/close", headers=admin_headers)

    info = client.get(
        f"/admin/customers/{customer_id}/info", headers=admin_headers
    )
    assert info.status_code == 200, info.text
    assert info.json()["visit_count"] == 1
    assert info.json()["total_spent"] == 300
