import { useQuery, type UseQueryOptions } from "@tanstack/react-query"
import api from "@/lib/api"
import { queryKeys } from "@/lib/query-keys"
import type {
  Customer,
  MenuCategory,
  MenuItem,
  MenuSubCategory,
  OrdersResponse,
  SessionHistoryResponse,
  Table,
  TableSession,
  User,
} from "@/types/table"

type QueryOptions<T> = Omit<UseQueryOptions<T>, "queryKey" | "queryFn">

export function useTables(options?: QueryOptions<Table[]>) {
  return useQuery({
    queryKey: queryKeys.tables,
    queryFn: async () => (await api.get<Table[]>("/tables")).data,
    ...options,
  })
}

export function useUsers(options?: QueryOptions<User[]>) {
  return useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => (await api.get<User[]>("/admin/users")).data,
    ...options,
  })
}

export function useMenuItems(options?: QueryOptions<MenuItem[]>) {
  return useQuery({
    queryKey: queryKeys.menu.items,
    queryFn: async () => (await api.get<MenuItem[]>("/menu/items")).data,
    ...options,
  })
}

export function useMenuCategories(options?: QueryOptions<MenuCategory[]>) {
  return useQuery({
    queryKey: queryKeys.menu.categories,
    queryFn: async () => (await api.get<MenuCategory[]>("/menu/categories")).data,
    ...options,
  })
}

export function useMenuSubCategories(options?: QueryOptions<MenuSubCategory[]>) {
  return useQuery({
    queryKey: queryKeys.menu.subcategories,
    queryFn: async () => (await api.get<MenuSubCategory[]>("/menu/subcategories")).data,
    ...options,
  })
}

export function useMenu() {
  const categories = useMenuCategories()
  const subCategories = useMenuSubCategories()
  const items = useMenuItems()
  return {
    categories: categories.data ?? [],
    subCategories: subCategories.data ?? [],
    items: items.data ?? [],
    isLoading: categories.isLoading || subCategories.isLoading || items.isLoading,
    error: categories.error ?? subCategories.error ?? items.error,
    refetch: () => {
      categories.refetch()
      subCategories.refetch()
      items.refetch()
    },
  }
}

export function useOrders(page: number, pageSize: number, options?: QueryOptions<OrdersResponse>) {
  return useQuery({
    queryKey: queryKeys.orders(page, pageSize),
    queryFn: async () =>
      (
        await api.get<OrdersResponse>("/orders", {
          params: { page, page_size: pageSize },
        })
      ).data,
    ...options,
  })
}

export function useSession(
  id: string | number | undefined,
  options?: QueryOptions<TableSession>
) {
  return useQuery({
    queryKey: queryKeys.session(id),
    queryFn: async () => (await api.get<TableSession>(`/table-sessions/${id}`)).data,
    enabled: id != null,
    ...options,
  })
}

export function useSessionHistory(page: number, pageSize: number) {
  return useQuery({
    queryKey: queryKeys.sessionHistory(page, pageSize),
    queryFn: async () =>
      (
        await api.get<SessionHistoryResponse>("/table-sessions/history/paginated", {
          params: { page, page_size: pageSize },
        })
      ).data,
  })
}

export function useCustomer(
  id: number | null | undefined,
  options?: QueryOptions<Customer>
) {
  return useQuery({
    queryKey: queryKeys.customer(id),
    queryFn: async () => (await api.get<Customer>(`/customers/by-id/${id}`)).data,
    enabled: id != null,
    ...options,
  })
}

export function getMenuItemName(
  id: number,
  menuItems: MenuItem[] | undefined
): string {
  return menuItems?.find((m) => m.id === id)?.name ?? `Item #${id}`
}
