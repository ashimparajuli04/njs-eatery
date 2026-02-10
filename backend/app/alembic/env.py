from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool
from alembic import context
import sys
from pathlib import Path
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Add the parent directory to the path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

# Import your SQLModel models
from sqlmodel import SQLModel
from app.menu.models.menu_category import MenuCategory
from app.menu.models.menu_subcategory import MenuSubCategory
from app.menu.models.menu_item import MenuItem
from app.user.models.user import User

from app.service_flow.diningtable.models.dining_table import DiningTable
from app.service_flow.tablesession.models.table_session import TableSession
from app.service_flow.order.models.order import Order
from app.service_flow.orderitem.models.order_item import OrderItem



# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the sqlalchemy.url from environment variable
config.set_main_option('sqlalchemy.url', os.getenv('DATABASE_URL')) #type = ignore

# Set target metadata for autogenerate support
target_metadata = SQLModel.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()