def make_category(client, headers, name="Drinks"):
    resp = client.post(
        "/admin/menu/categories",
        headers=headers,
        json={"name": name},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def make_subcategory(client, headers, category_id, name="Hot"):
    resp = client.post(
        "/admin/menu/subcategories",
        headers=headers,
        json={"name": name, "category_id": category_id},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def make_item(client, headers, name, price, category_id, sub_category_id=None):
    payload = {
        "name": name,
        "price": price,
        "category_id": category_id,
    }
    if sub_category_id is not None:
        payload["sub_category_id"] = sub_category_id
    resp = client.post("/admin/menu/items", headers=headers, json=payload)
    assert resp.status_code == 200, resp.text
    return resp.json()


def test_category_crud(client, admin_headers):
    created = make_category(client, admin_headers, "Snacks")
    cat_id = created["id"]

    listed = client.get("/menu/categories", headers=admin_headers)
    assert listed.status_code == 200
    assert any(c["id"] == cat_id for c in listed.json())

    patched = client.patch(
        f"/admin/menu/categories/{cat_id}",
        headers=admin_headers,
        json={"name": "Snacks & Bites"},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Snacks & Bites"

    deleted = client.delete(f"/admin/menu/categories/{cat_id}", headers=admin_headers)
    assert deleted.status_code == 204

    after = client.get("/menu/categories", headers=admin_headers).json()
    assert all(c["id"] != cat_id for c in after)


def test_subcategory_crud(client, admin_headers):
    cat = make_category(client, admin_headers)
    sub = make_subcategory(client, admin_headers, cat["id"], "Iced")
    assert sub["category_id"] == cat["id"]

    listed = client.get("/menu/subcategories", headers=admin_headers)
    assert any(s["id"] == sub["id"] for s in listed.json())

    patched = client.patch(
        f"/admin/menu/subcategories/{sub['id']}",
        headers=admin_headers,
        json={"name": "Iced & Cold"},
    )
    assert patched.status_code == 200
    assert patched.json()["name"] == "Iced & Cold"

    assert client.delete(
        f"/admin/menu/subcategories/{sub['id']}", headers=admin_headers
    ).status_code == 204


def test_item_display_order_scoped_by_grouping(client, admin_headers):
    cat_a = make_category(client, admin_headers, "Cat A")
    cat_b = make_category(client, admin_headers, "Cat B")
    sub_a = make_subcategory(client, admin_headers, cat_a["id"], "Sub A")

    i1 = make_item(client, admin_headers, "i1", 10, cat_a["id"], sub_a["id"])
    i2 = make_item(client, admin_headers, "i2", 20, cat_a["id"], sub_a["id"])
    assert i1["display_order"] == 1
    assert i2["display_order"] == 2

    i3 = make_item(client, admin_headers, "i3", 30, cat_a["id"])
    assert i3["display_order"] == 1

    i4 = make_item(client, admin_headers, "i4", 40, cat_b["id"])
    assert i4["display_order"] == 1


def test_item_unknown_subcategory_404(client, admin_headers):
    cat = make_category(client, admin_headers)
    resp = client.post(
        "/admin/menu/items",
        headers=admin_headers,
        json={"name": "x", "price": 5, "category_id": cat["id"], "sub_category_id": 9999},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "sub category not found"


def test_item_unknown_category_404(client, admin_headers):
    resp = client.post(
        "/admin/menu/items",
        headers=admin_headers,
        json={"name": "x", "price": 5, "category_id": 9999},
    )
    assert resp.status_code == 404
    assert resp.json()["detail"] == "category not found"


def test_item_category_subcategory_mismatch_400(client, admin_headers):
    cat_a = make_category(client, admin_headers, "Cat A")
    cat_b = make_category(client, admin_headers, "Cat B")
    sub_a = make_subcategory(client, admin_headers, cat_a["id"], "Sub A")

    resp = client.post(
        "/admin/menu/items",
        headers=admin_headers,
        json={
            "name": "bad",
            "price": 5,
            "category_id": cat_b["id"],
            "sub_category_id": sub_a["id"],
        },
    )
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Subcategory does not belong to category"


def test_item_price_serialized_as_number(client, admin_headers):
    cat = make_category(client, admin_headers)
    item = make_item(client, admin_headers, "Black Tea", 249.95, cat["id"])
    assert item["price"] == 249.95
    assert isinstance(item["price"], (int, float))


def test_update_item_syncs_category(client, admin_headers):
    cat_a = make_category(client, admin_headers, "Cat A")
    cat_b = make_category(client, admin_headers, "Cat B")
    sub_a = make_subcategory(client, admin_headers, cat_a["id"], "Sub A")
    sub_b = make_subcategory(client, admin_headers, cat_b["id"], "Sub B")

    item = make_item(client, admin_headers, "Milk Tea", 100, cat_a["id"], sub_a["id"])
    assert item["category_id"] == cat_a["id"]

    patched = client.patch(
        f"/admin/menu/items/{item['id']}",
        headers=admin_headers,
        json={"sub_category_id": sub_b["id"]},
    )
    assert patched.status_code == 200
    assert patched.json()["category_id"] == cat_b["id"]
    assert patched.json()["sub_category_id"] == sub_b["id"]


def test_update_item_mismatch_400(client, admin_headers):
    cat_a = make_category(client, admin_headers, "Cat A")
    cat_b = make_category(client, admin_headers, "Cat B")
    sub_a = make_subcategory(client, admin_headers, cat_a["id"], "Sub A")
    item = make_item(client, admin_headers, "Lemon Tea", 90, cat_a["id"], sub_a["id"])

    resp = client.patch(
        f"/admin/menu/items/{item['id']}",
        headers=admin_headers,
        json={"category_id": cat_b["id"]},
    )
    assert resp.status_code == 400


def test_admin_only_routes_403_for_employee(client, employee_headers):
    resp = client.post(
        "/admin/menu/categories",
        headers=employee_headers,
        json={"name": "Nope"},
    )
    assert resp.status_code == 403


def test_public_menu_lists_require_auth(client):
    assert client.get("/menu/categories").status_code == 401
    assert client.get("/menu/items").status_code == 401
