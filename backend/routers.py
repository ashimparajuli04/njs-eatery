from menu.routers import (
    menuitems_routes,
    menucategories_routes,
    menusubcategories_routes,
    menucategoriesadmin_routes,
    menusubcategoriesadmin_routes,
    menuitemsadmin_routes,
)
from user.routers import user_routes, useradmin_routes
from auth.routers import auth_routes
from service_flow.diningtable.routers import diningtable_routes, diningtableadmin_routes
from service_flow.tablesession.routers import tablesession_routes
from service_flow.order.routers import order_routes
from service_flow.orderitem.routers import orderitem_routes
from statistics.routers import stat_routes
from customer.routers import customer_routes, customeradmin_routes

routers = [
    menuitems_routes,
    menucategories_routes,
    menusubcategories_routes,
    menucategoriesadmin_routes,
    menusubcategoriesadmin_routes,
    menuitemsadmin_routes,
    user_routes,
    useradmin_routes,
    auth_routes,
    diningtable_routes,
    diningtableadmin_routes,
    tablesession_routes,
    order_routes,
    orderitem_routes,
    stat_routes,
    customer_routes,
    customeradmin_routes,
]