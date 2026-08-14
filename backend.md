# Backend — Refactor Plan & Docs

FastAPI + SQLModel + PostgreSQL restaurant management backend.

## Running with Docker

The whole project runs in Docker (Postgres included). See `docker-compose.yml` at the repo root.

```bash
docker compose up -d           # start db + backend + frontend
docker compose down            # stop (data persists in the postgres_data volume)
docker compose down -v         # stop + wipe the Docker Postgres
docker compose logs -f backend # watch backend logs
```

| Service  | Container | Host port | Notes |
|----------|-----------|-----------|-------|
| db       | njs-db       | 5433      | Docker Postgres 16. Port 5433 avoids clashing with any local Postgres on 5432. The existing database is never used. |
| backend  | njs-backend  | 8000      | uvicorn `--reload`, hot-reloads from the mounted `./backend` |
| frontend | njs-frontend | 3000      | Next.js dev server |

Environment overrides (optional, in a root `.env` or shell):

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=njs_cafe
POSTGRES_PORT=5433
BACKEND_PORT=8000
FRONTEND_PORT=3000
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
JWT_SECRET_KEY=change-me-in-prod
```

Notes:

- This machine cannot create Docker veth/bridge interfaces, so all services use `network_mode: host` and reach each other via `localhost`.
- The backend installs deps with `uv sync --frozen` into `/opt/venv` (outside the mounted `/app`).
- Schema is created by `init_db()` → `SQLModel.metadata.create_all()` at startup. Alembic is repaired (single clean initial migration) and available for fresh-DB bootstrap; a pre-existing DB created by `create_all()` is left untouched.

---

## Current State — After the Refactor (Phases 1–10 complete)

### Architecture

- **FastAPI + SQLModel + PostgreSQL** backend in `backend/`. Schema is created by `init_db()` → `SQLModel.metadata.create_all()` at startup; Alembic is repaired for fresh-DB bootstrap (one clean initial migration).
- **Config**: `backend/config.py` `Settings` (pydantic-settings) — `database_url`, `jwt_secret_key`, `algorithm`, `access_token_expire_minutes`, `cors_origins`, ports. No silent secrets; no `os.getenv`/`load_dotenv` in app code. Lifespan context manager replaces `@app.on_event("startup")`.
- **Error handling**: `backend/exceptions.py` — `AppError` base + `BadRequestError`/`NotFoundError`/`ConflictError`, converted by a global exception handler. Services raise app exceptions (no unhandled 500s from `ValueError`/`IntegrityError`).
- **CRUD**: generic `backend/crud.py` (`get_by_id`/`update`/`delete`); the ~10 copy-paste services were consolidated onto it.
- **Money**: `Numeric(10,2)` in Postgres + `Decimal` in Python, serialized as float (JSON contract unchanged).
- **Timezone/currency**: analytics bucket in Asia/Kathmandu (UTC+5:45) via Python-side Nepal-date conversion; inputs are Nepal dates, SQL filters use UTC ranges; currency NPR shown as `Rs.`.
- **Routes**: standardized prefixes — `/orders`, `/order-items`, `/menu/categories|subcategories|items`, `/customers`, `/tables`, `/table-sessions`, `/admin/*`, `/auth`, `/analytics`. No trailing slashes.
- **Statistics**: built from scratch (`statistics/schemas`, `services/stat_services.py`, `routers/stat_routes.py`) — `GET /analytics/summary|revenue/daily|top-items|top-customers`; real 400s on bad ranges.
- **Performance**: N+1s removed (eager `selectinload` in `close_table_session`, `get_tables` loads only active sessions), bulk order-item writes in one transaction, `ix_order_status_created_at` composite index, `display_order` scoped + `with_for_update()` serialization.
- **Business rules**: `toggle_served` blocked for closed sessions (409), table delete blocked with session history (400), `customer_id` validated on session update, `category_id` derived from subcategory and validated on create+update.
- **Tests**: 38 pytest tests in `backend/tests/` against a separate `njs_cafe_test` DB; `seed.py` idempotent dev seeder (admin + staff users, 12 menu items, 8 tables).

---

## 10-Phase Refactor Plan

Phase order is by impact: safety and correctness first, then performance, then de-duplication, then polish.

### Phase 1 — Config & startup hygiene

- Add a `Settings` class using `pydantic-settings` (DB URL, JWT secret/algorithm, token TTL, CORS origins, ports). Required fields with clear validation — no silent `None` secrets.
- Replace deprecated `@app.on_event("startup")` with the `lifespan` context manager (`app.py`).
- Move hardcoded CORS origins and the 1440-minute token expiry out of code (`app.py:16-19`, `auth/routers/auth_routes.py:39`).
- Commit to one schema-management path: keep `init_db()`/`create_all()` for now (it works), retire Alembic usage until Phase 10 repairs it.
- Files: `config.py` (new), `app.py`, `database.py`, `auth/routers/auth_routes.py`, `auth/services/auth_service.py`.

### Phase 2 — Error handling standardization

- Add a shared exception helper; stop raising `ValueError` from services (currently → 500) (`user/services/user_service.py`).
- Remove redundant `if not ...: raise HTTPException(404)` that duplicate service-layer 404s (e.g. `user/routers/useradmin_routes.py:33`).
- Make analytics return real `HTTPException(400)` instead of `200 {"error": ...}` (`statistics/routers/stat_routes.py`).
- Files: `exceptions.py` (new), `user/services/user_service.py`, `customer/services/customer_service.py`, all admin routers, `statistics/routers/stat_routes.py`.

## Phase 2 — done

**What changed**
- Added `backend/exceptions.py` — `AppError` base + `BadRequestError` (400), `NotFoundError` (404), `ConflictError` (409), each with a default `detail`.
- `backend/app.py` — registered a global `@app.exception_handler(AppError)` converting `AppError` → `JSONResponse(status_code, {"detail": ...})`.
- Services now raise app exceptions instead of `HTTPException`/`ValueError` (no more unhandled 500s): `user_service.py` (`ValueError` → `BadRequestError` "Invalid email format"/"Email already registered"; `get_user_by_id` → `NotFoundError`), `customer_service.py` → `BadRequestError`, `menucategory_service.py`/`menusubcategory_service.py`/`menuitem_service.py` → `NotFoundError` (+ `BadRequestError` for category↔subcategory mismatch), `order_service.py`/`orderitem_services.py` → `NotFoundError`, `tablesession_service.py` → `NotFoundError`/`BadRequestError`.
- Removed redundant router 404 checks that duplicated service-layer 404s: `useradmin_routes.py` (patch/delete), `user_routes.py` (read_user + signup's duplicate-email pre-check), `menucategoriesadmin_routes.py`, `menusubcategoriesadmin_routes.py`, `menuitemsadmin_routes.py` (delete each).
- `statistics/routers/stat_routes.py` — invalid date now raises real `HTTPException(400)` instead of returning `200 {"error": ...}`.
- Kept router-level 404/400 checks where the service legitimately returns `None` (diningtable, customer, order, orderitem, tablesession getters) — those get base-CRUD treatment in Phase 6.

**Verification run**
- Hot-reload boot clean, `/openapi.json` → 200, all 3 services up.
- Duplicate email signup → `400 {"detail":"Email already registered"}` (was unhandled 500 via `ValueError`).
- `GET /users/by-id/9999` → `404 {"detail":"User not found"}` (service-raised, via global handler).
- `GET /analytics/revenue/weekly?start_date=bad&...` → `400` (was `200 {"error": ...}`); valid dates → `200`.

**Starting point for Phase 3 (Money & time correctness)**
- Switch `price`, `price_at_time`, `final_bill`, `final_total` from `float` to `Numeric(10,2)`/`Decimal` in models + schemas (serialize as float in JSON per Design Decision 1).
- Fix analytics timezone: parse dates to UTC-aware datetimes (current code compares naive `datetime.strptime` against `timestamptz` and groups by server-local date).

### Phase 3 — Money & time correctness

- Switch `price`, `price_at_time`, `final_bill`, `final_total` from `float` to `Numeric(10,2)`/`Decimal` (models + schemas + one migration) — or consciously keep floats if the JSON contract must stay numeric.
- Fix analytics timezone handling: parse to UTC-aware datetimes, group by UTC date (or document server-tz behavior).
- Files: all models/schemas that carry money, `statistics/routers/stat_routes.py`.

## Phase 3 — done

**What changed (Design Decision 1: `Numeric(10,2)` + `Decimal`, serialize as float)**
- Models now use `Decimal` + `sa_column=Column(Numeric(10, 2), ...)`, each with a `@field_serializer` returning `float` so JSON stays numeric (incl. raw-model responses):
  - `menu/models/menu_item.py` — `price`
  - `service_flow/orderitem/models/order_item.py` — `price_at_time`; `line_total` property → `Decimal`
  - `service_flow/tablesession/models/table_session.py` — `final_bill` (nullable); `total_bill` → `Decimal`
  - `service_flow/order/models/order.py` — `final_total` (nullable); `total_amount` → `Decimal`
  - `customer/models/customer.py` — `total_spent` (`default=Decimal("0")`)
- Input schema `menu/schemas/menu_item.py` `price` → `Decimal` (pydantic accepts JSON numbers). Response schemas stay `float` (pydantic coerces `Decimal`→`float` on validation) — contract unchanged.
- `statistics/routers/stat_routes.py` — dates parsed UTC-aware via `.replace(tzinfo=timezone.utc)`; grouping stays UTC for now (Nepal bucketing lands with the stats rewrite).
- DB migration applied directly (Alembic retired until Phase 10): `ALTER TABLE` on `menuitem.price`, `orderitem.price_at_time`, `tablesession.final_bill`, `"order".final_total`, `customer.total_spent` → `NUMERIC(10,2)` on the running Docker Postgres. **Phase 10 must bake `NUMERIC(10,2)` into the fresh migration.**
- Added test users via signup: `phase1@test.com` (employee), `admin@test.com` (promoted to ADMIN via SQL since signup schema has no role field); test menu category/subcategory/item ("Black Tea" 249.95) created.

**Verification run**
- Full order flow: table → session → order → add item ×2 (249.95) → toggle served → close session.
- DB exact values: `price_at_time 249.95`, `final_total 499.90`, `final_bill 499.90` (NUMERIC(10,2)).
- API numeric contract intact: `POST /admin/menu-items/` and raw-model PATCH return `price: 249.95` (float, not string); `OrderRead.total_amount`, `TableSessionRead.total_bill/final_bill` all `float`.
- Analytics weekly on closed session → `revenue: 499.9`; invalid dates still 400; `/openapi.json` 200.

**Starting point for Phase 4 (Performance: kill the N+1s)**
- `close_table_session`: eager-load `orders` + `order.items` once instead of lazy per-order loads (`tablesession_routes.py:49`).
- `get_tables`: query only active sessions (`ended_at IS NULL`) instead of loading all history (`diningtable_routes.py:26`).
- Add indexes supporting `read_orders` ordering (`status`, `created_at`) so pagination avoids a full sort.

### Phase 4 — Performance: kill the N+1s

- `close_table_session`: eager-load `orders` + `order.items` once instead of lazy per-order loads (`tablesession_routes.py`).
- `get_tables`: query only active sessions (`ended_at IS NULL`) instead of loading all history (`diningtable_routes.py`, `models/dining_table.py`).
- Add indexes supporting `read_orders` ordering (`status`, `created_at`) so pagination avoids a full sort.
- Files: `tablesession/routers/tablesession_routes.py`, `diningtable/routers/diningtable_routes.py`, `diningtable/models/dining_table.py`, `order/models/order.py`.

## Phase 4 — done

**What changed**
- `service_flow/tablesession/routers/tablesession_routes.py` — `close_table_session` now queries with `selectinload(TableSession.orders).selectinload(Order.items)` so `close_session()` no longer lazily loads per order/item.
- `service_flow/diningtable/routers/diningtable_routes.py` — `get_tables` now loads only active sessions (`ended_at IS NULL AND table_id IS NOT NULL`) with customer preloaded, joined in Python via `session_by_table`; no more loading every table's full session history. Avoids the `active_session`/`is_occupied` lazy-load properties entirely.
- `service_flow/order/models/order.py` — added `__table_args__` composite `Index("ix_order_status_created_at", "status", "created_at")`.
- Applied index to running DB directly (`CREATE INDEX IF NOT EXISTS ix_order_status_created_at ON "order" (status, created_at)`).

**Verification run**
- Table 1 + closed session + table 2 + new session: `GET /tables` shows only table 2 occupied (with `active_session_id`); both free after close.
- New session on table 2: create order → item → toggle served → close → `200`.
- `/openapi.json` 200; index present in `pg_indexes`.

**Starting point for Phase 5 (Bulk & transactional writes)**
- `create_order_items_bulk_route`: single transaction, validate order + menu items once, upsert all rows in one commit (`order_routes.py`, `orderitem/services/orderitem_services.py`).
- Audit all `create_*` services to use one commit per request consistently.

### Phase 5 — Bulk & transactional writes

- `create_order_items_bulk_route`: single transaction, validate order + menu items once, upsert all rows in one commit (`order_routes.py`, `orderitem/services/orderitem_services.py`).
- Audit all `create_*` services to use one commit per request consistently.

## Phase 5 — done

**What changed**
- `service_flow/orderitem/services/orderitem_services.py` — added `create_order_items_bulk(session, order_id, items)`:
  - Validates order once; loads all menu items in one `WHERE id.in_(...)` query; validates all are present (404 on any missing).
  - Merges duplicate `(menu_item_id, note)` lines within the batch (sums quantity), upserts onto existing rows, and commits **once** for the whole batch.
  - Returns all touched rows refreshed.
- `service_flow/order/routers/order_routes.py` — `POST /order/{order_id}/items/bulk` now calls `create_order_items_bulk` (was: loop of `create_order_item` = N commits). Kept the single-item route on `create_order_item`.
- Audit result: every other `create_*` service (user, customer, category, subcategory, item, order, orderitem, tablesession, diningtable) already does exactly one commit per request — no further changes needed.

**Verification run**
- Bulk `[{item1,1},{item1,2}]` → one row qty 3 (batch-line merge works).
- Bulk again `[{item1,5}]` → merges to qty 8 (upsert onto existing works).
- Bulk with missing `menu_item_id` → `404` and nothing inserted (transaction semantics).
- Single-item route still works (qty 9 after merge); `/openapi.json` 200; no NameError in logs.

**Starting point for Phase 6 (CRUD consolidation)**
- Introduce a generic base CRUD service (`crud.py`): `get_by_id`, `update` via `model_dump(exclude_unset=True)`, `delete`; refactor the ~10 duplicate services onto it (user, menu category, subcategory, item, order, orderitem, tablesession, diningtable, customer).
- Delete empty/dead modules and unregister from `routers.py` (`statistics/services/stat_services.py`, `statistics/models/stat.py`, `order/routers/orderadmin_routes.py`, `tablesession/routers/tablesessionadmin_routes.py`).

### Phase 6 — CRUD consolidation

- Introduce a generic base CRUD service (`get_by_id`, `update` via `model_dump(exclude_unset=True)`, `delete`) and refactor the ~10 duplicate services onto it (user, menu category, subcategory, item, order, orderitem, tablesession, diningtable, customer).
- Delete empty/dead modules and unregister from `routers.py` (`statistics/services/stat_services.py`, `statistics/models/stat.py`, `order/routers/orderadmin_routes.py`, `tablesession/routers/tablesessionadmin_routes.py`).
- Files: `crud.py` (new), all `services/`, all `routers/`, `routers.py`.

## Phase 6 — done

**What changed**
- New `backend/crud.py`: `get_by_id(session, model, id, detail)` → raises `NotFoundError`, `update(session, record, data)` → `model_dump(exclude_unset=True)` + setattr + commit + refresh, `delete(session, record)` → delete + commit.
- Refactored the duplicate implementations out of 9 services onto `crud` (same public signatures, call sites untouched): `user`, `menu_category`, `menu_subcategory`, `menu_item`, `order`, `order_item`, `table_session`, `dining_table`, `customer` (lookups via `get_by_id`).
- Unified 404s: `get_order_by_id`, `get_order_item_by_id`, `get_table_session_by_id`, `get_customer_by_id`, `get_user_by_id`, `get_category_by_id`, `get_subcategory_by_id`, `get_menuitem_by_id` now raise `NotFoundError` instead of returning `None`; removed all duplicated `if not x: raise HTTPException(404)` blocks in `order_routes`, `orderitem_routes`, `tablesession_routes`, `customeradmin_routes`, `diningtable_routes`, `diningtableadmin_routes`. `get_table_by_number` gained an optional `detail` arg so the create-time duplicate check still gets `None` while delete raises 404.
- Deleted dead modules and unregistered: `order/routers/orderadmin_routes.py` (empty), `tablesession/routers/tablesessionadmin_routes.py` (router w/o endpoints), `statistics/services/stat_services.py`, `statistics/models/stat.py`; `routers.py` imports/registers 17 routers now.
- Cleaned dead imports: `OrderedDict` (order_routes), `select` (order_service, tablesession_service), unused `HTTPException` (order/orderitem/customeradmin routes).

**Verification run**
- All touched modules `py_compile` clean; `from app import app` OK in the container; all service imports OK.
- API: every formerly-`None`-lookup route now returns `404 {"detail": "..."}` (order/orderitem/table-session/customer/table, both admin + regular). Positive paths OK: order toggle-status 200×2, order item add 201 (merged qty 10), `/openapi.json` 200. Table duplicate create still returns 400-duplicate path (422 for bad enum type is expected schema validation).
- Forced clean uvicorn reload (touched `app.py`) → startup OK, no Traceback/NameError in logs.

**Starting point for Phase 7 (Business-logic fixes)**
- Guard `toggle_served` so orders in a closed session cannot be un-served (`order/models/order.py`).
- Guard `delete_table` when sessions exist → clear 400 instead of `IntegrityError` 500 (`diningtable_routes.py`).
- Validate `customer_id` exists on `TableSessionUpdate` (`tablesession/services/tablesession_service.py`).
- Fix `display_order` scoping for items without a subcategory and reduce the MAX() race (`menu/services/menuitem_service.py`).
- Resolve the `category_id` + `sub_category_id` redundancy (derive category from subcategory, or validate consistently on update too).

### Phase 7 — Business-logic fixes

- Guard `toggle_served` so orders in a closed session cannot be un-served (`order/models/order.py`, `order/routers/order_routes.py`).
- Guard `delete_table` when sessions exist → clear 400 instead of `IntegrityError` 500 (`diningtable_routes.py`).
- Validate `customer_id` exists on `TableSessionUpdate` (`tablesession/services/tablesession_service.py`).
- Fix `display_order` scoping for items without a subcategory and reduce the MAX() race (`menu/services/menuitem_service.py`).
- Resolve the `category_id` + `sub_category_id` redundancy (derive category from subcategory, or validate consistently on update too).

## Phase 7 — done

**What changed**
- `order/models/order.py` — `toggle_served()` raises `ConflictError` (409) when un-serving an order whose session is closed (`self.session.ended_at`), instead of flipping it back to PENDING.
- `diningtable/services/diningtable_service.py` — `delete_diningtable_hard` now checks for any `TableSession` referencing the table and raises `BadRequestError` (400 "cannot delete a table with session history") instead of a raw FK `IntegrityError` 500. (Note: `close_session()` nulls `table_id`, so closed-session tables remain deletable — only active-session tables block.)
- `tablesession/services/tablesession_service.py` — `update_table_session` validates `customer_id` exists (404) before applying.
- `menu/services/menuitem_service.py` — rewrote `create_menu_item`:
  - `display_order` is scoped by `sub_category_id` when present, else by `(category_id, sub_category_id IS NULL)` — no more collision between subcategory items and ungrouped items.
  - Loads the parent (`MenuSubCategory`/`MenuCategory`) with `with_for_update()` to serialize concurrent creates per scope and reduce the `MAX()` race; missing parent → 404, category mismatch → 400.
  - `category_id` is now **derived from the subcategory** when one is provided (redundancy resolved).
- `update_menuitem` now validates the subcategory exists (404) and rejects `category_id` mismatches (400), keeping `category_id` in sync with a newly assigned subcategory.

**Verification run**
- FIX1: `PATCH /order/1/toggle-status` (order served in closed session) → `409 {"detail":"Cannot un-serve an order in a closed session"}`.
- FIX2: `DELETE /tables/3` (active session) → `400`; `DELETE /tables/1` (only closed sessions) → `204` (allowed); table 1 restored afterwards.
- FIX3: `PATCH /table-sessions/3` `{"customer_id":9999}` → `404 customer not found`.
- FIX4/5: create item in subcategory → `display_order=2`; create item without subcategory → `display_order=1` (own scope); subcat+wrong-cat → `400`; bad subcat → `404`; update deriving category from subcategory → 200 with correct `category_id`; update mismatch → `400`.
- One 500 caught during testing (`MenuItem(**data.model_dump(), category_id=...)` duplicate kwarg) — fixed by `exclude={"category_id"}`. All modules `py_compile` clean, `app import ok`, `/openapi.json` 200, post-fix logs clean. Test items cleaned up.

**Starting point for Phase 8 (API/schema consistency)**
- Standardize route prefixes/resource naming (`/orders`, `/order-items`, `/menu/categories`, ...). One convention everywhere.
- Fix odd response models (e.g. creating an order returns the full model under an `OrderCreate` response — use a real `OrderRead`).
- Remove mutable `[]` defaults in schemas (`tablesession/schemas/table_session.py:19`, `order/schemas/order.py:12`), unused imports, stray comments.

### Phase 8 — API/schema consistency

- Standardize route prefixes and resource naming (`/orders`, `/order-items`, `/menu/categories`, ...). Keep one convention.
- Fix odd response models (e.g. creating an order returns the full model under an `OrderCreate` response — use a real `OrderRead`).
- Remove mutable `[]` defaults in schemas (`tablesession/schemas/table_session.py:19`, `order/schemas/order.py:12`), unused imports (`OrderedDict`), stray comments.
- Files: routers and schemas across all modules.

## Phase 8 — done

**What changed**
- **Route prefix standardization** (plural, nested `/menu/*`):
  - `/order` → `/orders`; `/orderitem` → `/order-items`
  - `/menu-categories` → `/menu/categories`; `/menu-subcategories` → `/menu/subcategories`; `/menu-items` → `/menu/items` (admin equivalents → `/admin/menu/categories|subcategories|items`)
  - `/customer` → `/customers`; `/admin/customer` → `/admin/customers`
  - `/tables/add-table` & `/admin/tables/add-table` → `POST /tables` and `POST /admin/tables` (resource-style)
  - Removed trailing slashes from collection routes (`GET /users/` → `/users`, `POST /admin/menu/categories/` → no slash, etc.)
  - Kept unchanged: `/auth`, `/users`, `/admin/users`, `/tables`, `/admin/tables`, `/table-sessions`, `/analytics`
- **Response model fixes**: `POST /table-sessions/{id}/orders` now uses `OrderRead` instead of `OrderCreate`; table create routes now use a new `DiningTableDetail` (`id, number, type`) instead of `DiningTableCreate` (which silently dropped `id`).
- **Mutable `[]` defaults** → `Field(default_factory=list)` in `order/schemas/order.py` (`OrderRead.items`) and `tablesession/schemas/table_session.py` (`TableSessionRead.orders`).
- **Dead code cleanup**: deleted unused `base.py` (nothing imported it; all models register via routers); removed unused imports (`OrderUpdate` in order_routes, `Customer` model in customer_routes, `OrderItem` TYPE_CHECKING import in menu_item model); removed stray `# type: ignore lolol` comments in menusubcategories_routes. `pyflakes` now reports zero findings on the app code.

**Verification run**
- Full route surface dumped from `app.routes` — all consistent, no duplicates.
- New prefixes live-tested: `GET /menu/categories`, `GET /menu/items`, `GET /tables` → 200; `POST /table-sessions/3/orders` → 201 (OrderRead shape); `DELETE /order-items/9999` → 404.
- Old prefixes gone: `/menu-categories`, `/order` → 404; `/tables/add-table` → 405.
- `py_compile` + `from app import app` clean; `/openapi.json` 200; test order cleaned up.

**IMPORTANT for frontend.md**: the API surface changed — frontend must call `/orders`, `/order-items`, `/menu/categories`, `/menu/subcategories`, `/menu/items`, `/customers`, `POST /tables` (not `/tables/add-table`), no trailing slashes.

**Starting point for Phase 9 (Tests + seed data)**
- Add a `pytest` suite: auth (signup/login/me, wrong password), menu CRUD, full order flow (create session → add items → toggle served → close), analytics, and the bug scenarios from Phases 2/7.
- Add a `seed.py` script (admin user, categories/items/subcategories, a few tables) for local dev.
- Files: `tests/`, `seed.py`, `pyproject.toml` (test config / dev deps).

### Phase 9 — Tests + seed data

- Add a `pytest` suite: auth (signup/login/me, wrong password), menu CRUD, the full order flow (create session → add items → toggle served → close), analytics, and the bug scenarios from Phases 2/7.
- Add a `seed.py` script (admin user, categories/items/subcategories, a few tables) for local dev.
- Files: `tests/`, `seed.py`, `pyproject.toml` (test config / dev deps).

## Phase 9 — done

**What changed**
- **`pyproject.toml`** — added `[dependency-groups] dev` (`pytest>=8`, `httpx>=0.27`) and `[tool.pytest.ini_options]` (`testpaths=["tests"]`). `pytest` + `httpx` installed into the container venv via `uv pip install`.
- **Test DB** — `njs_cafe_test` created on the Docker Postgres (Design Decision 5). `tests/conftest.py` builds a test engine from `TEST_DATABASE_URL` (default `.../njs_cafe_test`), auto-creates the DB if missing, drops/creates all tables per test (isolation), overrides `get_session` via `app.dependency_overrides`, and provides fixtures: `client`, `db_session`, `admin_user`/`employee_user` (created directly with bcrypt hashes), `admin_headers`/`employee_headers` (real `/auth/token` logins).
- **38 tests** in 4 files:
  - `test_auth.py` — signup normalizes email & hides hashes, `/users/me` round-trip, duplicate email 400, invalid email 422, wrong password 401, unknown email 401, no-token 401, unknown user 404 (Phase 2 bug).
  - `test_menu.py` — category/subcategory/item CRUD; `display_order` scoping per (subcategory | category w/o subcat) group; subcategory/category mismatch 400; unknown subcategory/category 404; price serializes as JSON number (Phase 3 bug); PATCH item syncs `category_id` to the new subcategory; employee blocked from `/admin/menu/*` (403).
  - `test_order_flow.py` — full flow (table → session → order → items → toggle served → close) with revenue assertion; bulk merge + upsert semantics (single 2 → bulk 1+3 = 6, one row); bulk unknown item 404 with nothing inserted; duplicate table 400; occupied-table session 400; close-with-unserved 400; close-already-closed 400; **Phase 7 bugs**: un-serve in closed session 409, delete table with session history 400, unknown `customer_id` patch 404; customer `visit_count`/`total_spent` bump on close.
  - `test_analytics.py` — `summary` zero-data shape, `summary` counts/rankings on a closed session (revenue/sessions/orders/items_sold/avg_bill/unique/repeat/new + top items + top customers), `revenue/daily`, `top-items`, `top-customers`, invalid-range 400s (bad format, start>end, single date).
- **Bug found & fixed while testing**: `PATCH /admin/menu/items/{id}` with only `category_id` could break the category↔subcategory invariant (item left with subcategory of category A but category_id B). `update_menuitem` now also validates/re-syncs when the item already has a `sub_category_id` (`menu/services/menuitem_service.py`).
- **`seed.py`** (idempotent, safe to re-run) — `init_db()` then seeds: `admin@test.com/adminpass123` (promoted to ADMIN) + `staff@test.com/staffpass123` (employee); menu (Drinks: Hot/Cold + Food: Snacks/Mains, 12 items with prices); tables 1–8 (indoor/rooftop/takeaway). Skips anything that already exists. Uses the real services so seeded rows follow the same display_order/business rules.

**Verification run**
- `pytest tests` → **38 passed** (on the `njs_cafe_test` DB, inside the backend container).
- `pyflakes` on the whole app incl. tests/seed.py → clean.
- `seed.py` run twice — second run created nothing ("0 created").
- Live API after seed: `GET /menu/items` → 12 items; `GET /tables` → 8 tables; `GET /analytics/summary?days=7` → 200 with correct Nepal-day bucketing (revenue lands on the Nepal date of the UTC `ended_at`); `/openapi.json` → 200.

**Starting point for Phase 10 (Docs, deps & migration cleanup)**
- Rebuild `backend.md` to reflect the finished architecture; reconcile `uv.lock`/`pyproject.toml` vs the root `requirements.txt` (drop unused pins, add the dev group).
- Repair/replace the 14 Alembic migrations so a fresh DB can bootstrap without `create_all()` (bake in `NUMERIC(10,2)`, the `ix_order_status_created_at` index, etc.).

### Phase 10 — Docs, deps & migration cleanup

- Rebuild `backend.md` to reflect the finished architecture.
- Tidy dependencies: `uv.lock`/`pyproject.toml` vs the root `requirements.txt` — reconcile (drop unused pins, add a dev group for test tooling).
- Repairs or replaces the 14 Alembic migrations so they can bootstrap a fresh DB (needed before migrating away from `create_all()`). Options:
  - **Replace** with one clean initial migration generated from the final models (`alembic revision --autogenerate` against an empty DB), deleting the broken history. Safe here (disposable Docker DB); coordinate carefully if the old migration chain is already applied to a deployed DB.
  - Or **repair** the existing chain to build a correct schema from scratch.

## Phase 10 — done

**What changed**
- **Deps reconciled** — root `requirements.txt` regenerated from source of truth via `uv export --frozen --no-dev` (1190 lines, full hashes). Direct stale pins (sentry-sdk, fastapi-cloud-cli, rignore, annotated-doc) dropped — they now appear only as transitive deps of `fastapi[standard]`/`fastapi-cli`. Dev group `pytest`/`httpx` already in `pyproject.toml` (Phase 9); added `alembic>=1.14.0` to the dev group → `uv lock` (58 packages). `requirements.txt` stays prod-only (standard practice; dev tooling lives in the group).
- **Alembic repaired (replacement path taken)**:
  - Deleted all 14 broken migration files (their base migration dropped a non-existent `user` table; `menuitem`/`customer` never created).
  - Rewrote `backend/alembic/env.py` — imports `settings.database_url` from `config.py` (no more `os.getenv`/`load_dotenv`), fixed the `sys.path` insert to the `backend/` dir, imports all 9 models so autogenerate sees the full metadata.
  - Generated one clean initial migration `eaf424832897_initial_schema.py` via `alembic revision --autogenerate` against an empty DB (`njs_cafe_migtest`) — 8 tables, `NUMERIC(10,2)` money columns, `ix_order_status_created_at` composite index, unique indexes, enums, FKs. Added `import sqlmodel` (autogenerate references `sqlmodel.sql.sqltypes.AutoString` without importing it).
  - Verified: `alembic upgrade head` bootstraps a fresh DB (created + stamped `eaf424832897`); a second autogenerate pass on the migrated DB produced **zero drift** (empty `pass` migration, discarded). Temp DBs cleaned up.
- **`backend.md` rebuilt** — replaced the stale "Known Issues" section with "Current State — After the Refactor (Phases 1–10 complete)"; updated the Docker notes to reflect that Alembic is repaired (fresh-DB bootstrap) while `create_all()` still runs at startup on the existing dev DB. `docker-compose.yml` comment updated to match.
- **Kept `init_db()`/`create_all()` as the Docker schema path** — the existing `njs_cafe` DB has no `alembic_version` table, so `upgrade head` would fail against it. The migration is the clean bootstrap for fresh DBs; switching Docker to alembic is a small future step (stamp `njs_cafe`, then `alembic upgrade head` in the entrypoint).

**Verification run**
- `uv lock` resolves (58 pkgs, alembic 1.19.1); `docker exec njs-backend uv pip install alembic` OK; `python -c "import alembic"` OK in the container.
- `alembic revision --autogenerate` on an empty DB → full clean schema; `alembic upgrade head` on a second fresh DB → all 8 tables + `alembic_version` stamped; drift check → no changes.
- `py_compile` of env.py + migration OK; `docker compose` stack still up (db healthy, backend running).

**Starting point for frontend.md**
- Backend is fully done. Move to `frontend.md` and execute every phase there. Remember the API surface: `/orders`, `/order-items`, `/menu/categories|subcategories|items`, `/customers`, `/tables` (no `/add-table`), `/table-sessions`, `/auth`, `/analytics` — no trailing slashes; money is `float` in JSON; dates are Nepal `YYYY-MM-DD`.

---

## Design Decisions (locked — do not reopen mid-phase)

1. **Money** — switch to `Numeric(10,2)` in Postgres + `Decimal` in Python, but configure the API to **serialize as float** so the JSON contract stays numeric (frontend `toFixed` keeps working). (Phase 3)
2. **Route naming** — Phase 8 **standardizes prefixes and updates the frontend calls together** (e.g. `/order` → `/orders`). Full smoke test required after.
3. **Production DB** — the local Docker `postgres_data` volume is the only DB; it is **disposable** (wipe/recreate freely). The deployed Vercel instance is not our concern.
4. **Auth** — **keep tokens in localStorage** + add a 401 response interceptor + fix AuthProvider. No `middleware.ts`, no httpOnly cookies. (backend Phase 1 / frontend Phase 1)
5. **Tests** — use a separate `njs_cafe_test` database on the same Docker Postgres (run inside the backend container). (Phase 9)
6. **Stats visibility** — stats visible to **all staff** (any active user), placed at the **top of the `/dashboard` page**.
7. **Category/subcategory** — keep both columns; **validate on create AND update** that `category_id` matches the subcategory's category. (Phase 7)
8. **Timezone/currency** — all dates/times bucketed in **Asia/Kathmandu (UTC+5:45)**; currency **NPR** displayed as `Rs.`.

---

## Statistics — Build-from-Scratch Plan

### Data model (what stats will read)

- `TableSession` (table `tablesession`): `table_id`, `customer_id`, `started_at`, `ended_at` (null = active), `final_bill` (set on close). `close_session()` also bumps `customer.visit_count` / `customer.total_spent`.
- `Order` (table `order`): `session_id`, `status` (pending/served), `created_at`, `served_at`, `final_total`.
- `OrderItem` (table `orderitem`): `order_id`, `menu_item_id`, `quantity`, `price_at_time` (price snapshot at order time).
- `Customer` (table `customer`): `name`, `phone_number`, `visit_count`, `total_spent`, `customer_since`.
- `MenuItem` (table `menuitem`): `name`, `price`, `category_id`.

**Revenue definition:** revenue only counts **closed** sessions (filter on `ended_at IS NOT NULL`), summing `final_bill`. Active sessions are not revenue. All period metrics are keyed off `ended_at` (the moment the sale happened), so date filters always apply to `ended_at`.

### Timezone rule

- Inputs are `YYYY-MM-DD` dates interpreted as **Nepal dates**.
- A Nepal day D spans `D 00:00 Asia/Kathmandu` → `D+1 00:00` = `D-05:45 UTC` → `D+19:15 UTC` (i.e. `(D - 1d) 18:15 UTC` → `D 18:15 UTC`).
- SQL filters use the converted **UTC range** so `timestamptz` indexes work.
- Daily bucketing is done **in Python**: `(ended_at_utc + 5h45m).date()` → Nepal date. (If a row comes back naive, assume UTC.) This avoids SQL `date()` / server-timezone drift entirely. Scale is tiny (café), so in-code bucketing is fine.

### Endpoints (all under `/analytics`, auth = any active user)

1. **`GET /analytics/summary?days=7`** — one-call dashboard payload.
   - `days` in `{7, 30}` (default 7); optional `start_date`/`end_date` override.
   - Returns:
     - `period` — `{ days, start_date, end_date }` (Nepal dates)
     - `totals` — `{ revenue, sessions, orders, items_sold, avg_bill, unique_customers, repeat_customers, new_customers }`
     - `daily_revenue` — `[{ date, revenue, sessions }]` (one row per Nepal day in range, zero-filled)
     - `top_items` — `[{ name, quantity, revenue }]` (top 5 by quantity)
     - `top_customers` — `[{ name, phone_number, visits, total_spent }]` (top 5 by spend)
   - Definitions:
     - `sessions` = closed sessions with `ended_at` in range.
     - `orders` = orders belonging to those closed sessions.
     - `items_sold` = sum of `OrderItem.quantity` over those orders.
     - `avg_bill` = `revenue / sessions` (0 if none).
     - `unique_customers` = distinct non-null `customer_id` on those sessions.
     - `repeat_customers` = customers with ≥ 2 sessions in the period.
     - `new_customers` = customers whose `customer_since` falls in the period.
2. **`GET /analytics/revenue/daily?days=7`** — standalone daily revenue + session series (what a chart needs).
3. **`GET /analytics/top-items?days=30&limit=5`** — best sellers by quantity and revenue, joined via `orderitem → order → closed session`.
4. **`GET /analytics/top-customers?days=30&limit=5`** — top customers by `total_spent` (from `Customer` table, most accurate since it's maintained on close).

### Module layout (replace the empty files)

```
statistics/
  schemas/stat.py        # Pydantic response schemas: Period, Totals, DailyRevenue, TopItem, TopCustomer, AnalyticsSummary
  services/stat_services.py  # query + timezone helpers: date_to_utc_range(), nepal_date(), summary(), daily_revenue(), top_items(), top_customers()
  routers/stat_routes.py     # 4 endpoints; HTTPException(400) on bad dates (not 200 {"error": ...})
  models/stat.py             # DELETE (dead, unregistered)
```

- Update `routers.py` — `stat_routes` already registered; remove `statistics/models` import if present.
- Mark done when: `GET /analytics/summary?days=7` returns correct numbers on seeded data, and `backend.md` "Verification" steps pass.

### Frontend contract (matching the dashboard build plan)

- `GET /analytics/summary?days=N` is the single source for the dashboard overview.
- Money comes back as `float` (keep contract numeric for now; Phase 3 floats→Decimal is orthogonal).
- Dates are `YYYY-MM-DD` Nepal dates — frontend renders them directly, no conversion.

## Statistics — done

**What changed**
- `statistics/schemas/stat.py` — response schemas: `Period`, `Totals`, `DailyRevenue`, `TopItem`, `TopCustomer`, `AnalyticsSummary`.
- `statistics/services/stat_services.py` (new) — Nepal timezone helpers + queries:
  - `NEPAL_OFFSET = 5h45m`; `nepal_date()` converts a UTC `ended_at` to the Nepal date; `date_to_utc_range(day)` converts a Nepal day to a UTC range `[D-1 18:15 UTC, D 18:15 UTC)` so `timestamptz` indexes work; daily bucketing done in Python (no SQL `date()` / server-tz drift).
  - `summary()` — closed sessions in range (eager `orders → items → menu_item` via `selectinload`); computes `period`, `totals` (revenue/sessions/orders/items_sold/avg_bill/unique_customers/repeat_customers/new_customers), zero-filled `daily_revenue` series, `top_items` (top 5 by quantity, revenue = Σ `line_total`), `top_customers` (in-period customers ranked by `Customer.total_spent`).
  - `daily_revenue()`, `top_items()`, `top_customers()` — standalone variants; all raise `InvalidRangeError` on bad dates.
- `statistics/routers/stat_routes.py` — rewrote around the new services. Four new endpoints (all require any active user, all return real 400 on bad ranges):
  - `GET /analytics/summary?days=7` (days ∈ {7,30} default 7; optional `start_date`/`end_date` override) → `AnalyticsSummary`.
  - `GET /analytics/revenue/daily?days=7` → period + daily series.
  - `GET /analytics/top-items?days=30&limit=5` → `list[TopItem]`.
  - `GET /analytics/top-customers?days=30&limit=5` → `list[TopCustomer]`.
  - Kept the original `GET /analytics/revenue/weekly` unchanged (still used by legacy callers).
- `statistics/models/` is empty (the dead `stat.py` was already deleted in Phase 6); no `routers.py` change needed.

**Verification run**
- 6 new pytest tests in `test_analytics.py` (zero-data shape, counts/rankings on a closed session, revenue/daily, top-items, top-customers, invalid-range 400s) — suite now **38 passed**.
- Live: `GET /analytics/summary?days=7` on seeded dev DB → 200 with revenue bucketed onto the correct Nepal date; bad range → 400; `/openapi.json` → 200.

---

## Verification

Each phase is done when the Docker stack still runs and the following hold:

- `docker compose up -d` boots cleanly (db healthy → backend → frontend).
- `GET /openapi.json` → 200.
- Signup → login → `/users/me` round-trip works.
- Relevant `pytest` tests pass (Phases 9-10).

After finishing all this go to frontend.md and perform all the tasks there.

---

## Phase 1 — done

**What changed**
- Added `backend/config.py` — `Settings(BaseSettings)` via `pydantic-settings` with required `database_url` and `jwt_secret_key` (no silent empty secrets), plus `algorithm` (HS256), `access_token_expire_minutes` (1440), `cors_origins` (`NoDecode` list, comma-separated in `.env`, defaults: localhost:3000 + njseatery.vercel.app), `backend_port`/`frontend_port`. Module-level `settings = Settings()`.
- `backend/app.py` — replaced deprecated `@app.on_event("startup")` with the `lifespan` context manager calling `init_db()`; CORS origins now read from `settings.cors_origins`.
- `backend/database.py` — engine built from `settings.database_url`; dropped `load_dotenv()`/`os`.
- `backend/auth/routers/auth_routes.py` — token TTL from `settings.access_token_expire_minutes`.
- `backend/auth/services/auth_service.py` — `SECRET_KEY`/`ALGORITHM` from settings; dropped `load_dotenv()`/`os`.
- `backend/pyproject.toml` — added explicit `pydantic-settings>=2.12.0` dep; `uv lock` regenerated.
- `backend/.env` — filled `DATABASE_URL` (was empty → would now fail validation locally), added `ACCESS_TOKEN_EXPIRE_MINUTES`, `CORS_ORIGINS`.

**Verification run**
- `uv lock` (52 packages resolved) → `docker compose up -d --build backend` → clean boot (db healthy → backend up).
- `GET /openapi.json` → 200.
- Signup (`/users/signup` uses `first_name`/`last_name`, not `name`) → login `/auth/token` → `/users/me` round-trip OK.
- CORS preflight from `http://localhost:3000` returns `access-control-allow-origin: http://localhost:3000`.
- No remaining `os.getenv`/`load_dotenv`/`on_event` in app code (only `alembic/env.py`, retired until Phase 10).

**Starting point for Phase 2 (Error handling standardization)**
- New `backend/exceptions.py` with a shared exception helper; stop raising `ValueError` from services (`user/services/user_service.py:19,27,45`).
- Remove redundant router-level `HTTPException(404)` that duplicate service-layer 404s (e.g. `user/routers/useradmin_routes.py:33`).
- Make analytics return real `HTTPException(400)` instead of `200 {"error": ...}` (`statistics/routers/stat_routes.py`).
