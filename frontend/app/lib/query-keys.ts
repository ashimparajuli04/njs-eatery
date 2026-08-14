const toKey = (id: string | number | undefined | null): string => String(id ?? "none")

export const queryKeys = {
  tables: ["tables"] as const,
  users: ["users"] as const,
  menu: {
    all: ["menu"] as const,
    items: ["menu", "items"] as const,
    categories: ["menu", "categories"] as const,
    subcategories: ["menu", "subcategories"] as const,
  },
  orders: (page: number, pageSize: number) => ["orders", page, pageSize] as const,
  session: (id: string | number | undefined | null) =>
    ["tableSession", toKey(id)] as const,
  sessionHistory: (page: number, pageSize: number) =>
    ["table-session-history", page, pageSize] as const,
  customer: (id: number | null | undefined) => ["customer", toKey(id)] as const,
  analytics: (days: number) => ["analytics", days] as const,
}
