import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import api from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, Plus, Trash2, CheckCircle, ChefHat, ExternalLink } from "lucide-react"
import { ItemModal } from "./item-modal"
import { useMenu } from "@/lib/hooks"
import { getMenuItemName } from "@/lib/hooks"
import { formatCurrency, formatNepalTime } from "@/lib/format"
import type { Order } from "@/types/table"
import { toast } from "sonner"

export function OrderCard({
  order,
  sessionId,
}: {
  order: Order
  sessionId?: number
}) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { items: menuItems } = useMenu()

  const invalidate = (orderId: number) => {
    queryClient.invalidateQueries({
      queryKey: sessionId
        ? ["tableSession", String(sessionId)]
        : ["tableSession"],
    })
    queryClient.invalidateQueries({
      queryKey: ["orders", orderId],
    })
    queryClient.invalidateQueries({
      queryKey: ["orders"],
    })
  }

  const addItemsMutation = useMutation({
    mutationFn: ({
      orderId,
      items,
    }: {
      orderId: number
      items: { menu_item_id: number; quantity: number; note: string }[]
    }) => api.post(`/orders/${orderId}/items/bulk`, items),
    onSuccess: (_data, variables) => invalidate(variables.orderId),
    onError: () => {
      toast.error("Couldn't add items", {
        description: "Please try again.",
      })
    },
  })

  const deleteOrderMutation = useMutation({
    mutationFn: () => api.delete(`/orders/${order.id}`),
    onSuccess: () => invalidate(order.id),
    onError: () => {
      toast.error("Couldn't delete the order", {
        description: "Please try again.",
      })
    },
  })

  const deleteOrderItemMutation = useMutation({
    mutationFn: (itemId: number) => api.delete(`/order-items/${itemId}`),
    onSuccess: () => invalidate(order.id),
    onError: () => {
      toast.error("Couldn't remove the item", {
        description: "Please try again.",
      })
    },
  })

  const toggleOrderStatusMutation = useMutation({
    mutationFn: () => api.patch(`/orders/${order.id}/toggle-status`),
    onSuccess: () => invalidate(order.id),
    onError: () => {
      toast.error("Couldn't update the order", {
        description: "Please try again.",
      })
    },
  })

  const isPending = order.status === "pending"
  const isServed = order.status === "served"

  const handleAddItems = (items: Record<number, number>) => {
    const itemsToAdd = Object.entries(items)
      .filter(([, qty]) => qty > 0)
      .map(([menuId, qty]) => ({
        menu_item_id: Number(menuId),
        quantity: qty,
        note: "",
      }))

    addItemsMutation.mutate(
      { orderId: order.id, items: itemsToAdd },
      { onSuccess: () => setIsAddModalOpen(false) }
    )
  }

  return (
    <>
      <Card
        className={`flex flex-col border-2 border-stone-200 dark:border-stone-700 ${
          isServed ? "border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/20" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="space-y-1">
              <CardTitle className="text-lg flex items-center gap-2 text-stone-900 dark:text-stone-100">
                Order #{order.id}
                {isPending && <ChefHat className="h-4 w-4 text-orange-500" />}
                {isServed && <CheckCircle className="h-4 w-4 text-green-600" />}
                {sessionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/table-session/${sessionId}`)}
                    className="h-7 px-3 text-xs ml-2"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Session #{sessionId}
                  </Button>
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
                <Clock className="h-3 w-3" />
                {formatNepalTime(order.created_at)}
              </div>
              {isServed && order.served_at && (
                <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                  <CheckCircle className="h-3 w-3" />
                  Served at {formatNepalTime(order.served_at)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant={isPending ? "outline" : "default"}
                onClick={() => toggleOrderStatusMutation.mutate()}
                disabled={toggleOrderStatusMutation.isPending}
                className={
                  isPending
                    ? "border-orange-300 text-orange-700 hover:bg-orange-50"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }
              >
                {isPending ? (
                  <>
                    <ChefHat className="h-4 w-4 mr-1" />
                    Mark Served
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Served
                  </>
                )}
              </Button>
              <div className="text-right">
                <p className="text-sm text-stone-500 dark:text-stone-400">Total</p>
                <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                  {formatCurrency(order.total_amount)}
                </p>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1">
          {order.items && order.items.length > 0 ? (
            <div className="space-y-2">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-stone-900 rounded-lg border border-stone-200 dark:border-stone-700"
                >
                  <div className="flex-1">
                    <p className="font-medium text-stone-900 dark:text-stone-100">
                      {getMenuItemName(item.menu_item_id, menuItems)}
                    </p>
                    {item.note && (
                      <p className="text-sm text-stone-500 dark:text-stone-400 italic">
                        Note: {item.note}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-6">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteOrderItemMutation.mutate(item.id)}
                      disabled={deleteOrderItemMutation.isPending || isServed}
                      className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <span className="text-sm text-stone-700 dark:text-stone-300">
                      <span className="text-stone-500 dark:text-stone-400">Qty:</span>{" "}
                      {item.quantity}
                    </span>
                    <span className="text-sm text-stone-700 dark:text-stone-300">
                      <span className="text-stone-500 dark:text-stone-400">@</span>{" "}
                      {formatCurrency(item.price_at_time)}
                    </span>
                    <p className="font-bold min-w-20 text-right text-stone-900 dark:text-stone-100">
                      {formatCurrency(item.line_total)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-stone-500 dark:text-stone-400 py-4">
              No items in this order
            </p>
          )}
        </CardContent>

        <CardFooter className="border-t pt-4 flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            disabled={isServed}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => deleteOrderMutation.mutate()}
            disabled={deleteOrderMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </CardFooter>
      </Card>

      {isAddModalOpen && (
        <ItemModal
          onClose={() => setIsAddModalOpen(false)}
          orderId={order.id}
          onAdd={handleAddItems}
          isLoading={addItemsMutation.isPending}
        />
      )}
    </>
  )
}
