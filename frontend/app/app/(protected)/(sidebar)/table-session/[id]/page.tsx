'use client'
import { useRouter, useParams } from "next/navigation"
import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { AxiosError } from "axios"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  User,
  Receipt,
  Plus,
  Printer,
  UtensilsCrossed,
  Phone,
  Loader2,
} from "lucide-react"
import { OrderCard } from "@/components/tablesession/order-card"
import { toast } from "sonner"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"
import { useSession, useCustomer } from "@/lib/hooks"
import { queryKeys } from "@/lib/query-keys"
import { formatCurrency, formatNepalDate } from "@/lib/format"
import type { Customer } from "@/types/table"

export default function TableSessionPage() {
  const router = useRouter()
  const { id: sessionId } = useParams()
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)

  const {
    data: session,
    isLoading,
    error,
    refetch,
  } = useSession(sessionId as string)

  const { data: sessionCustomer } = useCustomer(session?.customer_id)

  const existingCustomer = sessionCustomer || null
  const displayPhoneNumber = phoneNumber || sessionCustomer?.phone_number || ""

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.session(sessionId as string) })
    queryClient.invalidateQueries({ queryKey: queryKeys.tables })
  }

  const searchCustomerMutation = useMutation({
    mutationFn: async (phone: string) => {
      try {
        const response = await api.get<Customer>(`/customers/by-phone/${encodeURIComponent(phone)}`)
        return response.data
      } catch (err) {
        if ((err as AxiosError).response?.status === 404) return null
        throw err
      }
    },
    onSuccess: (customer) => {
      if (customer) {
        setShowNameInput(false)
        updateSessionCustomerMutation.mutate(customer.id)
      } else {
        setShowNameInput(true)
      }
    },
    onError: () => {
      toast.error("Couldn't search for the customer", {
        description: "Please try again.",
      })
    },
  })

  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone_number: string }) => {
      const response = await api.post<Customer>("/customers", data)
      return response.data
    },
    onSuccess: (customer) => {
      setShowNameInput(false)
      setCustomerName("")
      setPhoneNumber("")
      updateSessionCustomerMutation.mutate(customer.id)
    },
    onError: () => {
      toast.error("Couldn't create the customer", {
        description: "Please try again.",
      })
    },
  })

  const updateSessionCustomerMutation = useMutation({
    mutationFn: (customer_id: number) =>
      api.patch(`/table-sessions/${sessionId}`, { customer_id }),
    onSuccess: () => {
      invalidate()
      toast.success("Customer linked to this session")
    },
    onError: () => {
      toast.error("Couldn't link the customer", {
        description: "Please try again.",
      })
    },
  })

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (phoneNumber.trim()) {
      searchCustomerMutation.mutate(phoneNumber.trim())
    }
  }

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (customerName.trim() && phoneNumber.trim()) {
      createCustomerMutation.mutate({
        name: customerName.trim(),
        phone_number: phoneNumber.trim(),
      })
    }
  }

  const createOrderMutation = useMutation({
    mutationFn: () => api.post(`/table-sessions/${sessionId}/orders`),
    onSuccess: () => {
      invalidate()
      toast.success("New order created")
    },
    onError: () => {
      toast.error("Couldn't create the order", {
        description: "Please try again.",
      })
    },
  })

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

  if (isLoading) {
    return <LoadingView label="table session" />
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
        <ErrorState
          title="Couldn't load the table session"
          onRetry={refetch}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UtensilsCrossed className="h-6 w-6 text-stone-800 dark:text-stone-300" />
                <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
              </div>
              <h1
                className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1"
                style={{ fontFamily: "Georgia, serif" }}
              >
                {session.table_id ? `Table ${session.table_id}` : "Table Session"}
              </h1>
              <p className="text-stone-600 dark:text-stone-400 text-sm">
                Session #{session.id} · started {formatNepalDate(session.started_at)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">
                Total Bill
              </p>
              <p className="text-4xl font-bold text-stone-900 dark:text-stone-100">
                {formatCurrency(session.total_bill)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-8">
        <Card className="border-2 border-stone-200 dark:border-stone-700">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <User className="h-5 w-5 text-stone-600 dark:text-stone-400" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <form onSubmit={handlePhoneSubmit} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label
                    htmlFor="phone-number"
                    className="flex items-center gap-2 mb-2 text-xs text-stone-600 dark:text-stone-400 uppercase tracking-wide"
                  >
                    <Phone className="h-3 w-3" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone-number"
                    placeholder="Enter phone number"
                    value={displayPhoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!!existingCustomer}
                    className="border-stone-300 focus:border-stone-500 dark:border-stone-700"
                  />
                </div>
                {!existingCustomer && (
                  <Button
                    type="submit"
                    disabled={searchCustomerMutation.isPending}
                    className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                  >
                    {searchCustomerMutation.isPending ? "Searching..." : "Search"}
                  </Button>
                )}
              </form>

              {existingCustomer && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800 rounded-lg">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        {existingCustomer.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-emerald-700 dark:text-emerald-400">
                      <div>
                        <span className="font-medium">Visits:</span>{" "}
                        {existingCustomer.visit_count}
                      </div>
                      <div>
                        <span className="font-medium">Since:</span>{" "}
                        {formatNepalDate(existingCustomer.customer_since)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {showNameInput && !existingCustomer && (
                <form onSubmit={handleNameSubmit} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label
                      htmlFor="customer-name"
                      className="flex items-center gap-2 mb-2 text-xs text-stone-600 dark:text-stone-400 uppercase tracking-wide"
                    >
                      <User className="h-3 w-3" />
                      Customer Name
                    </Label>
                    <Input
                      id="customer-name"
                      placeholder="Enter customer name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="border-stone-300 focus:border-stone-500 dark:border-stone-700"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                  >
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Receipt className="h-6 w-6 text-stone-800 dark:text-stone-300" />
              <h2
                className="text-2xl font-bold text-stone-900 dark:text-stone-100"
                style={{ fontFamily: "Georgia, serif" }}
              >
                Orders ({session.orders?.length || 0})
              </h2>
            </div>
            <Button
              onClick={() => createOrderMutation.mutate()}
              disabled={createOrderMutation.isPending}
              className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOrderMutation.isPending ? "Creating..." : "New Order"}
            </Button>
          </div>

          {session.orders?.length ? (
            <div className="space-y-4">
              {session.orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </div>
          ) : (
            <Card className="border-2 border-stone-200 dark:border-stone-700">
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 mx-auto text-stone-400 mb-4" />
                <p
                  className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-2"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  No orders yet
                </p>
                <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
                  Start by creating the first order for this table
                </p>
                <Button
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending}
                  className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createOrderMutation.isPending ? "Creating..." : "Create First Order"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="border-2 border-stone-200 dark:border-stone-700">
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-end flex-wrap">
              {!session.ended_at && (
                <Button
                  variant="outline"
                  onClick={() => closeSessionMutation.mutate()}
                  disabled={closeSessionMutation.isPending}
                  className="border-2 border-stone-300 text-stone-700 dark:border-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  {closeSessionMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Please wait...
                    </>
                  ) : (
                    "Free Table"
                  )}
                </Button>
              )}

              <Button
                onClick={() => router.push(`/checkout/${sessionId}`)}
                className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200 font-semibold"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
