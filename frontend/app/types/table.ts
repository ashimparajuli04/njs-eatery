export type Role = "admin" | "employee" | "user"

export interface User {
  id: number
  email: string
  first_name: string
  middle_name?: string | null
  last_name: string
  role: Role
  is_active?: boolean
}

export type TableType = "indoor" | "rooftop" | "takeaway"

export interface Table {
  id: number
  number: number
  type: TableType
  is_occupied: boolean
  active_session_id: number | null
  customer_name: string | null
  customer_arrival: string | null
}

export interface MenuCategory {
  id: number
  name: string
  description?: string | null
  display_order: number
}

export interface MenuSubCategory {
  id: number
  name: string
  category_id: number
  description?: string | null
  display_order: number
}

export interface MenuItem {
  id: number
  name: string
  price: number
  category_id: number
  sub_category_id: number | null
  description?: string | null
  is_available: boolean
  display_order: number
}

export type OrderStatus = "pending" | "served"

export interface OrderItem {
  id: number
  menu_item_id: number
  quantity: number
  price_at_time: number
  note: string | null
  line_total: number
}

export interface Order {
  id: number
  session_id: number
  items: OrderItem[]
  total_amount: number
  created_at: string
  status: OrderStatus
  served_at: string | null
}

export interface TableSession {
  id: number
  table_id: number | null
  customer_id: number | null
  total_bill: number
  final_bill: number | null
  started_at: string
  ended_at: string | null
  orders: Order[]
}

export interface Customer {
  id: number
  name: string
  phone_number: string
  customer_since: string
  visit_count: number
  total_spent?: number
}

export interface SessionHistoryItem {
  id: number
  table_id: number | null
  customer_name: string | null
  final_bill: number
  started_at: string
  ended_at: string
}

export interface PaginationMeta {
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface OrdersResponse extends PaginationMeta {
  orders: Order[]
}

export interface SessionHistoryResponse extends PaginationMeta {
  items: SessionHistoryItem[]
}
