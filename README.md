# NJ's Café & Restaurant — Service Management System

A full-stack restaurant service management system Built from a real brief: a friend in hospitality described what a proper café management system should actually do, and this is the result, with a FastAPI backend and a Next.js frontend. Handles everything from table sessions and order tracking to customer history and menu administration.

---

## Tech Stack

### Backend

| Layer            | Technology                                       |
| ---------------- | ------------------------------------------------ |
| Framework        | FastAPI                                          |
| ORM              | SQLModel (SQLAlchemy + Pydantic)                 |
| Database         | PostgreSQL (hosted on [Neon](https://neon.tech)) |
| Migrations       | Alembic                                          |
| Auth             | JWT via OAuth2 password flow                     |
| Runtime          | Python 3.14 (via `uv`)                           |


### Frontend

|Layer|Technology|
|---|---|
|Framework|Next.js 14 (App Router)|
|UI|shadcn/ui + Tailwind CSS|
|Server State|TanStack Query (React Query)|
|HTTP Client|Axios|

---

## Features

### Backend

- **Table & Session Management** — Tables have types (indoor, rooftop, takeaway). Opening a session links a table to an optional customer and tracks all orders under it. Closing a session freezes the final bill and increments customer stats.
- **Order Lifecycle** — Orders are created under a session, start as `pending`, and are toggled to `served` when delivered. Toggling to served snapshots the final total; toggling back unfreezes it.
- **Smart Order Items** — Adding an item that already exists in an order (same `menu_item_id` + `note`) increments quantity instead of creating a duplicate. Prices are snapshotted at order time, so menu price changes don't affect historical orders.
- **Menu Administration** — Full CRUD for menu items, categories, and subcategories behind `/admin` routes.
- **Customer Tracking** — Customers are identified by phone number. Each closed session increments their `visit_count` and adds to `total_spent` automatically.
- **Role-Based Access** — Users are either `admin` or `employee`. Admin routes are protected separately from standard authenticated routes.
- **Paginated Session History** — Table session history is available paginated for reporting and review.

### Frontend

- **Order Dashboard** — View and manage all active orders across tables, with TanStack Query invalidation keeping the UI in sync after every mutation without a page refresh.
- **Order Card UI** — Each order displays its items, line totals, status, and served time. Items can be added in bulk via a menu modal or removed individually. Orders toggle between `pending` and `served` in one click.
- **Table Session View** — Full session detail page showing all orders, a running bill total, and session controls.
- **Menu Item Modal** — Categorized, filterable menu picker for adding items to an order with quantity selection.
- **Admin Controls** — Menu item, category, and subcategory management behind role-protected routes.

---

### Backend

```
backend/
├── app.py                  # FastAPI app entry point
├── routers.py              # Central router registration
├── database.py             # DB engine & session setup
├── base.py                 # SQLModel metadata base
├── alembic/                # Migration environment
│   └── versions/           # Auto-generated migration files
│
├── auth/                   # JWT auth — token generation & verification
│   ├── models/
│   ├── routers/
│   ├── services/
│   └── utils/
│
├── user/                   # User accounts & roles (admin / employee)
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   └── services/
│
├── customer/               # Customer profiles, visit count, spend tracking
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   └── services/
│
├── menu/                   # Menu items, categories, subcategories
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   └── services/
│
└── service_flow/           # Core restaurant operations
    ├── diningtable/        # Table model (number, type, occupancy)
    │   ├── models/
    │   ├── routers/
    │   ├── schemas/
    │   └── services/       
    ├── tablesession/       # Session lifecycle (open → orders → close)
    │   ├── models/
    │   ├── routers/
    │   ├── schemas/
    │   └── services/       
    ├── order/              # Order model (pending / served toggle)
    │   ├── models/
    │   ├── routers/
    │   ├── schemas/
    │   └── services/              
    └── orderitem/          # items in Order with price snapshots
        ├── models/
        ├── routers/
        ├── schemas/
        └── services/       # Line items with price snapshots
```

Each backend module follows the same internal structure: `models/`, `routers/`, `schemas/`, `services/` — keeping database logic, API layer, validation, and business logic clearly separated.

---

## Data Model Overview

```
Customer
  └── TableSession (many)
        └── DiningTable (one)
        └── Order (many)
              └── OrderItem (many)
                    └── MenuItem (one)
```

**Key design decisions:**

- `price_at_time` on `OrderItem` — menu prices can change freely without corrupting order history.
- `final_total` on `Order` and `final_bill` on `TableSession` — totals are frozen on serve/close so live recalculation doesn't alter settled records.
- Cascade deletes — deleting a session deletes its orders; deleting an order deletes its items.
- `table_id` is set to `None` on session close — freeing the table without deleting the session history.

---

## API Reference

### Auth

|Method|Endpoint|Description|
|---|---|---|
|POST|`/auth/token`|Login and receive JWT access token|

### Users

|Method|Endpoint|Access|Description|
|---|---|---|---|
|POST|`/users/signup`|Public|Create a new user account|
|GET|`/users/me`|Auth|Get current user's profile|
|GET|`/users/by-id/{user_id}`|Auth|Get a user by ID|
|GET|`/admin/users`|Admin|List all users|
|PATCH|`/admin/users/{user_id}`|Admin|Update a user|
|DELETE|`/admin/users/{user_id}`|Admin|Delete a user|

### Menu Items

|Method|Endpoint|Access|Description|
|---|---|---|---|
|GET|`/menu-items`|Public|List all menu items|
|POST|`/admin/menu-items/`|Admin|Create a menu item|
|PATCH|`/admin/menu-items/{item_id}`|Admin|Update a menu item|
|DELETE|`/admin/menu-items/{item_id}`|Admin|Delete a menu item|

### Menu Categories

|Method|Endpoint|Access|Description|
|---|---|---|---|
|GET|`/menu-categories`|Public|List all categories|
|POST|`/admin/menu-categories/`|Admin|Create a category|
|PATCH|`/admin/menu-categories/{category_id}`|Admin|Update a category|
|DELETE|`/admin/menu-categories/{category_id}`|Admin|Delete a category|

### Menu Subcategories

|Method|Endpoint|Access|Description|
|---|---|---|---|
|GET|`/menu-subcategories`|Public|List all subcategories|
|POST|`/admin/menu-subcategories/`|Admin|Create a subcategory|
|PATCH|`/admin/menu-subcategories/{subcategory_id}`|Admin|Update a subcategory|
|DELETE|`/admin/menu-subcategories/{subcategory_id}`|Admin|Delete a subcategory|

### Tables

|Method|Endpoint|Access|Description|
|---|---|---|---|
|GET|`/tables/`|Auth|List all tables with occupancy status|
|POST|`/tables/add-table`|Auth|Add a table|
|DELETE|`/tables/{table_number}`|Auth|Remove a table|
|POST|`/admin/tables/add-table`|Admin|Add a table (admin)|
|DELETE|`/admin/tables/{table_number}`|Admin|Remove a table (admin)|

### Table Sessions

|Method|Endpoint|Access|Description|
|---|---|---|---|
|POST|`/table-sessions`|Auth|Open a new session for a table|
|GET|`/table-sessions/{session_id}`|Auth|Get session details with all orders|
|PATCH|`/table-sessions/{table_session_id}`|Auth|Update a session|
|DELETE|`/table-sessions/{table_session_id}`|Auth|Delete a session|
|POST|`/table-sessions/{session_id}/close`|Auth|Close session and freeze final bill|
|POST|`/table-sessions/{table_session_id}/orders`|Auth|Create an order under a session|
|GET|`/table-sessions/history/paginated`|Auth|Paginated session history|

### Orders

|Method|Endpoint|Access|Description|
|---|---|---|---|
|GET|`/order`|Auth|List all orders|
|DELETE|`/order/{id}`|Auth|Delete an order|
|PATCH|`/order/{order_id}/toggle-status`|Auth|Toggle order between pending / served|
|POST|`/order/{order_id}/items`|Auth|Add a single item to an order|
|POST|`/order/{order_id}/items/bulk`|Auth|Add multiple items at once|

### Order Items

|Method|Endpoint|Access|Description|
|---|---|---|---|
|DELETE|`/orderitem/{id}`|Auth|Remove a line item from an order|

### Customers

|Method|Endpoint|Access|Description|
|---|---|---|---|
|POST|`/customer/`|Auth|Create a customer profile|
|GET|`/customer/by-phone/{number}`|Auth|Look up customer by phone number|
|GET|`/customer/by-id/{id}`|Auth|Look up customer by ID|
|GET|`/admin/customer/{id}/info`|Admin|Full customer info including session history|

---

## Getting Started

### Prerequisites

- Python 3.12+, PostgreSQL (or a [Neon](https://neon.tech) serverless PostgreSQL connection), [`uv`](https://github.com/astral-sh/uv), and Node.js 18+

### Backend

```bash
cd backend

# Install dependencies
uv sync

# Set up environment
cp .env.example .env

# Run migrations
uv run alembic upgrade head

# Start the server
uv run fastapi dev app.py
```

The API will be available at `http://localhost:8000`
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.example .env.local   # Set NEXT_PUBLIC_BACKEND_URL=http://localhost:8000

# Start the dev server
npm run dev
```

The frontend will be available at `http://localhost:3000`.

### Environment Variables

**Backend (`backend/.env`)**

```env
# Local PostgreSQL
DATABASE_URL=postgresql://user:password@localhost:5432/njs_cafe

# Or a Neon serverless connection string (recommended for cloud deployment)
# DATABASE_URL=postgresql://user:password@ep-xxxx.us-east-1.aws.neon.tech/njs_cafe?sslmode=require

JWT_SECRET_KEY=your-jwt-secret-key
ALGORITHM=HS256
```

**Frontend (`frontend/.env.local`)**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Database Migrations

```bash
cd backend

# Create a new migration after changing models
uv run alembic revision --autogenerate -m "describe your change"

# Apply migrations
uv run alembic upgrade head

# Roll back one step
uv run alembic downgrade -1
```
