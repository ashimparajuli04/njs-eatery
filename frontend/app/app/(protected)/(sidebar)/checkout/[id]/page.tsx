'use client'
import { useParams, useRouter } from "next/navigation"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import api from "@/lib/api"
import { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Printer, CheckCircle2, Loader2 } from "lucide-react"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"
import { toast } from "sonner"
import { useSession, useMenuItems, useCustomer } from "@/lib/hooks"
import { queryKeys } from "@/lib/query-keys"
import { formatCurrency, formatNepalDate, formatNepalTime } from "@/lib/format"

export default function CheckoutPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const sessionId = params.id as string
  const [isProcessing, setIsProcessing] = useState(false)

  const { data: session, isLoading, error, refetch } = useSession(sessionId)
  const { data: menuItems } = useMenuItems()
  const { data: customer } = useCustomer(session?.customer_id)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tables })
  }

  const closeSessionMutation = useMutation({
    mutationFn: () => api.post(`/table-sessions/${sessionId}/close`),
    onSuccess: () => {
      toast.success("Table freed successfully!", {
        description: "The table is now available for new customers.",
      })
      invalidate()
    },
    onError: (err: AxiosError<{ detail?: string }>) => {
      const detail = err.response?.data?.detail
      if (
        err.response?.status === 400 &&
        detail?.includes("all orders must be served")
      ) {
        toast.error("Cannot free table", {
          description: "All orders must be served before closing the session.",
        })
      } else {
        toast.error("Failed to free table", {
          description: "An error occurred. Please try again.",
        })
      }
    },
  })

  const getMenuItemName = (id: number): string => {
    return (
      menuItems?.find((m) => m.id === id)?.name ||
      `Item #${id}`
    )
  }

  const handlePrint = () => {
    window.print()
  }

  const handleCheckout = async () => {
    setIsProcessing(true)
    try {
      await closeSessionMutation.mutateAsync()
    } catch {
      setIsProcessing(false)
    }
  }

  if (isLoading) {
    return <LoadingView label="checkout page" />
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <ErrorState title="Session not found" onRetry={refetch} />
      </div>
    )
  }

  const allItems = session.orders.flatMap((order) =>
    order.items.map((item) => ({
      ...item,
      name: getMenuItemName(item.menu_item_id),
    }))
  )

  const consolidatedItems = allItems.reduce((acc, item) => {
    const existing = acc.find((i) => i.menu_item_id === item.menu_item_id)
    if (existing) {
      existing.quantity += item.quantity
      existing.line_total += item.line_total
    } else {
      acc.push({ ...item })
    }
    return acc
  }, [] as typeof allItems)

  const total = session.total_bill
  const displayDate = session.ended_at ?? new Date()

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-stone-950">
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
          }
          @page {
            margin: 0.5cm;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="max-w-md mx-auto p-4">
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="mb-4 no-print"
          size="sm"
        >
          ← Back
        </Button>

        <div className="bg-white border-2 border-gray-300 font-mono text-sm">
          <div className="text-center border-b-2 border-dashed border-gray-400 p-4 pb-3">
            <h1 className="text-xl font-bold tracking-wider mb-1">
              NJ&apos;S CAFÉ AND RESTAURANT
            </h1>
            <p className="text-xs text-gray-600">TAX INVOICE</p>
          </div>

          <div className="px-4 py-3 text-xs border-b border-dashed border-gray-400">
            <div className="flex justify-between mb-1">
              <span>Date:</span>
              <span className="font-semibold">{formatNepalDate(displayDate)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Time:</span>
              <span className="font-semibold">{formatNepalTime(displayDate)}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span>Table:</span>
              <span className="font-semibold">
                {session.table_id ? `#${session.table_id}` : "—"}
              </span>
            </div>
            {customer?.name && (
              <div className="flex justify-between">
                <span>Guest:</span>
                <span className="font-semibold">{customer.name}</span>
              </div>
            )}
          </div>

          <div className="px-4 py-3 border-b-2 border-dashed border-gray-400">
            <div className="flex justify-between text-xs font-bold mb-2 pb-1 border-b border-gray-300">
              <span>ITEM</span>
              <span>QTY</span>
              <span>PRICE</span>
              <span>AMOUNT</span>
            </div>
            {consolidatedItems.map((item, index) => (
              <div key={`${item.menu_item_id}-${index}`} className="mb-3">
                <div className="flex justify-between items-start text-xs">
                  <span className="flex-1 pr-2 leading-tight">{item.name}</span>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <span className="w-12 text-right">
                    {item.price_at_time.toFixed(2)}
                  </span>
                  <span className="w-16 text-right font-semibold">
                    {item.line_total.toFixed(2)}
                  </span>
                </div>
                {item.note && (
                  <div className="text-[10px] text-gray-500 italic ml-1 mt-0.5">
                    * {item.note}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 py-3 text-xs">
            <div className="flex justify-between text-base font-bold">
              <span>TOTAL:</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>

          <div className="border-t-2 border-dashed border-gray-400 px-4 py-3 text-center text-xs space-y-1">
            <p className="font-semibold">THANK YOU FOR VISITING!</p>
            <p className="text-[10px] text-gray-600">All prices inclusive of taxes</p>
            <p className="text-[10px] text-gray-500 print-only mt-2">
              *** CUSTOMER COPY ***
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-2 no-print">
          <Button variant="outline" className="flex-1" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {!session.ended_at && (
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleCheckout}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Free Table
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
