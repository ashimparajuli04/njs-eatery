from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.menu.routers import menuitems_routes, menucategories_routes, menusubcategories_routes
from app.user.routers import user_routes_all, user_routes_admin
from app.auth.routers import auth_routes

app = FastAPI()


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(menuitems_routes.router)
app.include_router(menucategories_routes.router)
app.include_router(menusubcategories_routes.router)

app.include_router(user_routes_all.router)
app.include_router(user_routes_admin.router)

app.include_router(auth_routes.router)

app.add_middleware(
    CORSMiddleware,  # Next.js dev
    allow_credentials=True,
    allow_methods=["*"],  # allows OPTIONS, POST, etc
    allow_headers=["*"],
    allow_origins=["*"],
)
