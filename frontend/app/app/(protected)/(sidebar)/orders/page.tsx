'use client'

import { useMemo, useState } from "react"
import { OrderCard } from "@/components/tablesession/order-card"
import { Receipt } from "lucide-react"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"
import { EmptyState } from "@/components/empty-state"
import { useOrders } from "@/lib/hooks"

export default function OrdersPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 10

  const { data, isLoading, error, refetch, isFetching } = useOrders(currentPage, pageSize, {
    refetchInterval: (query) => {
      const current = query.state.data
      const hasPending = current?.orders.some((o) => o.status === "pending")
      return hasPending ? 5000 : false
    },
  })

  const orders = data?.orders || []
  const totalPages = data?.total_pages || 1
  const total = data?.total || 0

  const getPageNumbers = useMemo(() => {
    const pages: (number | string)[] = []
    const showPages = 5

    if (totalPages <= showPages) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else if (currentPage <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push("ellipsis")
      pages.push(totalPages)
    } else if (currentPage >= totalPages - 2) {
      pages.push(1)
      pages.push("ellipsis")
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1)
      pages.push("ellipsis")
      for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i)
      pages.push("ellipsis")
      pages.push(totalPages)
    }

    return pages
  }, [currentPage, totalPages])

  if (isLoading) {
    return <LoadingView label="orders" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
        <ErrorState
          title="Couldn't load orders"
          message="The orders couldn't be fetched. Check the backend and retry."
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 rounded-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="h-6 w-6 text-stone-800 dark:text-stone-300" />
            <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
          </div>
          <h1
            className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1"
            style={{ fontFamily: "Georgia, serif" }}
          >
            All Orders
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            {total} total orders · Page {currentPage} of {totalPages}
            {isFetching && " · refreshing"}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        {orders.length > 0 ? (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  sessionId={order.session_id}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(1, prev - 1))
                        }
                        className={
                          currentPage === 1
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>

                    {getPageNumbers.map((page, idx) => (
                      <PaginationItem key={idx}>
                        {page === "ellipsis" ? (
                          <PaginationEllipsis />
                        ) : (
                          <PaginationLink
                            onClick={() => setCurrentPage(page as number)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        )}
                      </PaginationItem>
                    ))}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(totalPages, prev + 1)
                          )
                        }
                        className={
                          currentPage === totalPages
                            ? "pointer-events-none opacity-50"
                            : "cursor-pointer"
                        }
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={Receipt}
            title="No orders found"
            description="Orders will appear here once they are created."
          />
        )}
      </div>
    </div>
  )
}
