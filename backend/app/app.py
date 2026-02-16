from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import routers

app = FastAPI()

@app.on_event("startup")
def on_startup():
    init_db()

for routes in routers:
    app.include_router(routes.router)

app.add_middleware(
    CORSMiddleware,  # Next.js dev
    allow_credentials=True,
    allow_methods=["*"],  # allows OPTIONS, POST, etc
    allow_headers=["*"],
    allow_origins=["*"],
)
