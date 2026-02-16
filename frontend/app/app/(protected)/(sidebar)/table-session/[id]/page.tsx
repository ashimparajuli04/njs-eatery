'use client'
import { useRouter } from "next/navigation"
import { useParams } from "next/navigation"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { AxiosError } from "axios"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { User, Receipt, Plus, DollarSign, UtensilsCrossed, Phone, Coffee } from "lucide-react"
import { OrderCard } from "@/components/tablesession/order-card"
import { toast } from "sonner"

type OrderItem = {
  id: number
  menu_item_id: number
  quantity: number
  price_at_time: number
  note: string
  line_total: number
}

type Order = {
  id: number
  items: OrderItem[]
  total_amount: number
  created_at: string
  status: string
  served_at: string | null
}

type TableSession = {
  id: number
  table_id: number
  customer_id: number | null
  total_bill: number
  orders: Order[]
  started_at: string
  ended_at: string | null
}

type Customer = {
  id: number
  name: string
  phone_number: string
  customer_since: string
  visit_count: number
}

export default function TableSessionPage() {
  const router = useRouter()
  const { id: sessionId } = useParams()
  const queryClient = useQueryClient()
  const [phoneNumber, setPhoneNumber] = useState("")
  const [customerName, setCustomerName] = useState("")
  const [showNameInput, setShowNameInput] = useState(false)

  const { data: session, isLoading } = useQuery<TableSession>({
    queryKey: ["tableSession", sessionId],
    queryFn: async () => (await api.get(`/table-sessions/${sessionId}`)).data,
  })
  
  const { data: sessionCustomer } = useQuery<Customer>({
    queryKey: ["customer", session?.customer_id],
    queryFn: async () => (await api.get(`/customer/by-id/${session?.customer_id}`)).data,
    enabled: !!session?.customer_id,
  })

  // Derive existing customer and phone from sessionCustomer
  const existingCustomer = sessionCustomer || null
  const displayPhoneNumber = phoneNumber || sessionCustomer?.phone_number || ""

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["tableSession", sessionId] })

  // Search customer by phone
  const searchCustomerMutation = useMutation({
    mutationFn: async (phone: string) => {
      try {
        const response = await api.get(`/customer/by-phone/${phone}`)
        return response.data as Customer
      } catch (error) {
        // Customer not found
        return null
      }
    },
    onSuccess: (customer) => {
      if (customer) {
        // Customer exists - link to session
        setShowNameInput(false)
        updateSessionCustomerMutation.mutate(customer.id)
      } else {
        // Customer doesn't exist - show name input
        setShowNameInput(true)
      }
    },
  })

  // Create new customer
  const createCustomerMutation = useMutation({
    mutationFn: async (data: { name: string; phone_number: string }) => {
      const response = await api.post('/customer', data)
      return response.data as Customer
    },
    onSuccess: (customer) => {
      setShowNameInput(false)
      setCustomerName("")
      setPhoneNumber("")
      // Link customer to session
      updateSessionCustomerMutation.mutate(customer.id)
    },
  })

  // Update session with customer_id
  const updateSessionCustomerMutation = useMutation({
    mutationFn: (customer_id: number) => 
      api.patch(`/table-sessions/${sessionId}`, { customer_id }),
    onSuccess: invalidate,
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
        phone_number: phoneNumber.trim()
      })
    }
  }

  const createOrderMutation = useMutation({
    mutationFn: () => api.post(`/table-sessions/${sessionId}/orders`),
    onSuccess: invalidate,
  })

  const closeSessionMutation = useMutation({
    mutationFn: () => api.post(`/table-sessions/${sessionId}/close`),
    onSuccess: () => {
      toast.success("Table freed successfully!", {
        description: "The table is now available for new customers.",
      })
      invalidate()
    },
    onError: (error: AxiosError<{ detail: string }>) => {
      // Check if it's the unserved orders error
      if (error.response?.status === 400 && error.response?.data?.detail?.includes("all orders must be served")) {
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
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Coffee className="h-10 w-10 mx-auto text-stone-800 animate-pulse" />
          <p className="text-stone-600">Loading session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header Section */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <UtensilsCrossed className="h-6 w-6 text-stone-800" />
                <div className="h-1 w-12 bg-stone-800" />
              </div>
              <h1 className="text-4xl font-bold text-stone-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
                Table {session?.table_id}
              </h1>
              <p className="text-stone-600 text-sm">Session #{sessionId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-500 uppercase tracking-wide mb-1">Total Bill</p>
              <p className="text-4xl font-bold text-stone-900">₹{session?.total_bill.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-8 py-12 space-y-8">
        
        {/* Customer Information Card */}
        <Card className="border-2 border-stone-200">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold text-stone-900 flex items-center gap-2">
              <User className="h-5 w-5 text-stone-600" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Phone Number Input */}
              <form onSubmit={handlePhoneSubmit} className="flex gap-3 items-end">
                <div className="flex-1">
                  <Label htmlFor="phone-number" className="flex items-center gap-2 mb-2 text-xs text-stone-600 uppercase tracking-wide">
                    <Phone className="h-3 w-3" />
                    Phone Number
                  </Label>
                  <Input 
                    id="phone-number" 
                    placeholder="Enter phone number" 
                    value={displayPhoneNumber} 
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={!!existingCustomer}
                    className="border-stone-300 focus:border-stone-500"
                  />
                </div>
                {!existingCustomer && (
                  <Button 
                    type="submit"
                    disabled={searchCustomerMutation.isPending}
                    className="bg-stone-800 hover:bg-stone-900 text-white"
                  >
                    {searchCustomerMutation.isPending ? "Searching..." : "Search"}
                  </Button>
                )}
              </form>

              {/* Display existing customer */}
              {existingCustomer && (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-emerald-700" />
                      <span className="font-semibold text-emerald-900">{existingCustomer.name}</span>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-emerald-700">
                        <span className="font-medium">Visits:</span> {existingCustomer.visit_count}
                      </div>
                      <div className="text-emerald-700">
                        <span className="font-medium">Since:</span>{" "}
                        {new Date(existingCustomer.customer_since).toLocaleDateString("en-NP", {
                          year: "numeric",
                          month: "short",
                          day: "2-digit",
                          timeZone: "Asia/Kathmandu",
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* New customer name input */}
              {showNameInput && !existingCustomer && (
                <form onSubmit={handleNameSubmit} className="flex gap-3 items-end">
                  <div className="flex-1">
                    <Label htmlFor="customer-name" className="flex items-center gap-2 mb-2 text-xs text-stone-600 uppercase tracking-wide">
                      <User className="h-3 w-3" />
                      Customer Name
                    </Label>
                    <Input 
                      id="customer-name" 
                      placeholder="Enter customer name" 
                      value={customerName} 
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="border-stone-300 focus:border-stone-500"
                    />
                  </div>
                  <Button 
                    type="submit"
                    disabled={createCustomerMutation.isPending}
                    className="bg-stone-800 hover:bg-stone-900 text-white"
                  >
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </form>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Orders Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="h-6 w-6 text-stone-800" />
              <h2 className="text-2xl font-bold text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
                Orders ({session?.orders?.length || 0})
              </h2>
            </div>
            <Button 
              onClick={() => createOrderMutation.mutate()} 
              disabled={createOrderMutation.isPending}
              className="bg-stone-800 hover:bg-stone-900 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              {createOrderMutation.isPending ? "Creating..." : "New Order"}
            </Button>
          </div>

          {session?.orders?.length ? (
            <div className="space-y-4">
              {session.orders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order}
                />
              ))}
            </div>
          ) : (
            <Card className="border-2 border-stone-200">
              <CardContent className="py-16 text-center">
                <Receipt className="h-12 w-12 mx-auto text-stone-400 mb-4" />
                <p className="text-lg font-semibold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                  No orders yet
                </p>
                <p className="text-sm text-stone-600 mb-6">
                  Start by creating the first order for this table
                </p>
                <Button 
                  onClick={() => createOrderMutation.mutate()} 
                  disabled={createOrderMutation.isPending}
                  className="bg-stone-800 hover:bg-stone-900 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {createOrderMutation.isPending ? "Creating..." : "Create First Order"}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions */}
        <Card className="border-2 border-stone-200">
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-end">
              {!session?.ended_at && (
                <Button
                  variant="outline"
                  onClick={() => closeSessionMutation.mutate()}
                  disabled={closeSessionMutation.isPending}
                  className="border-2 border-stone-300 text-stone-700 hover:bg-stone-100"
                >
                  {closeSessionMutation.isPending ? "Please wait..." : "Free Table"}
                </Button>
              )}

              <Button 
                onClick={() => router.push(`/checkout/${sessionId}`)}
                className="bg-stone-800 hover:bg-stone-900 text-white font-semibold"
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Print Bill
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}