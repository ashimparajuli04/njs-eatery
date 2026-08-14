import { useState, useMemo } from "react"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X, Plus, Minus, Search, Loader2 } from "lucide-react"
import { useMenu } from "@/lib/hooks"
import { formatCurrency } from "@/lib/format"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"

export function ItemModal({
  onClose,
  orderId,
  onAdd,
  isLoading = false,
}: {
  onClose: () => void
  orderId: number | null
  onAdd: (items: Record<number, number>) => void
  isLoading?: boolean
}) {
  const { items: menuItems, categories, subCategories, isLoading: menuLoading, error } = useMenu()
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null)

  const { filteredCategories } = useMemo(() => {
    let items = menuItems?.filter((item) => item.is_available) || []

    if (searchQuery) {
      items = items.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategoryId !== null) {
      items = items.filter((item) => item.category_id === selectedCategoryId)
    }

    const cats = categories
      .slice()
      .sort((a, b) => a.display_order - b.display_order)
      .map((category) => {
        const categoryItems = items.filter(
          (item) => item.category_id === category.id
        )

        const subs = subCategories
          .filter((sc) => sc.category_id === category.id)
          .sort((a, b) => a.display_order - b.display_order)
          .map((sub) => ({
            ...sub,
            items: categoryItems
              .filter((item) => item.sub_category_id === sub.id)
              .sort((a, b) => a.display_order - b.display_order),
          }))
          .filter((sub) => sub.items.length > 0)

        const itemsWithoutSub = categoryItems
          .filter((item) => item.sub_category_id === null)
          .sort((a, b) => a.display_order - b.display_order)

        return {
          ...category,
          subCategories: subs,
          itemsWithoutSub,
        }
      })
      .filter((cat) => cat.subCategories.length > 0 || cat.itemsWithoutSub.length > 0)

    return { filteredCategories: cats }
  }, [menuItems, categories, subCategories, searchQuery, selectedCategoryId])

  const totalItems = Object.values(selectedItems).reduce((sum, qty) => sum + qty, 0)

  const updateQty = (id: number, delta: number) => {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: Math.max((prev[id] || 0) + delta, 0),
    }))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl h-[min(90vh,48rem)] flex flex-col shadow-2xl border-stone-200 dark:border-stone-700">
        <CardHeader className="border-b dark:border-stone-700 shrink-0 pb-4">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl font-bold text-stone-900 dark:text-stone-100">
              Add Items to Order{orderId ? ` #${orderId}` : ""}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 pt-3 -mx-2 px-2">
            <Button
              variant={selectedCategoryId === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoryId(null)}
              className="shrink-0"
            >
              All
            </Button>
            {categories
              .slice()
              .sort((a, b) => a.display_order - b.display_order)
              .map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategoryId === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className="shrink-0"
                >
                  {category.name}
                </Button>
              ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          {menuLoading ? (
            <div className="flex items-center justify-center h-full">
              <LoadingView label="menu" />
            </div>
          ) : error ? (
            <ErrorState
              title="Couldn't load the menu"
              message="Menu items couldn't be fetched. Try closing and reopening this dialog."
            />
          ) : filteredCategories.length === 0 ? (
            <p className="text-center text-stone-500 dark:text-stone-400 py-12">
              No items match your search.
            </p>
          ) : (
            <div className="space-y-6">
              {filteredCategories.map((category) => (
                <div key={category.id}>
                  {!searchQuery && selectedCategoryId === null && (
                    <h3 className="text-lg font-bold mb-3 text-gray-900 dark:text-gray-100 sticky top-0 bg-background py-2 z-10">
                      {category.name}
                    </h3>
                  )}

                  {category.subCategories.map((sub) => (
                    <div key={sub.id} className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2 uppercase tracking-wide">
                        {sub.name}
                      </h4>
                      <div className="space-y-2">
                        {sub.items.map((item) => {
                          const qty = selectedItems[item.id] || 0

                          return (
                            <ItemRow
                              key={item.id}
                              name={item.name}
                              price={item.price}
                              qty={qty}
                              onAdd={() => updateQty(item.id, 1)}
                              onRemove={() => updateQty(item.id, -1)}
                            />
                          )
                        })}
                      </div>
                    </div>
                  ))}

                  {category.itemsWithoutSub.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {category.itemsWithoutSub.map((item) => {
                        const qty = selectedItems[item.id] || 0

                        return (
                          <ItemRow
                            key={item.id}
                            name={item.name}
                            price={item.price}
                            qty={qty}
                            onAdd={() => updateQty(item.id, 1)}
                            onRemove={() => updateQty(item.id, -1)}
                          />
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>

        <CardFooter className="border-t dark:border-stone-700 shrink-0 pt-4 flex justify-between items-center">
          <div className="text-sm text-stone-500 dark:text-stone-400">
            {totalItems > 0 && (
              <span className="font-semibold text-stone-900 dark:text-stone-100">
                {totalItems} item{totalItems !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={() => onAdd(selectedItems)}
              disabled={totalItems === 0 || isLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add to Order"
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}

function ItemRow({
  name,
  price,
  qty,
  onAdd,
  onRemove,
}: {
  name: string
  price: number
  qty: number
  onAdd: () => void
  onRemove: () => void
}) {
  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg border-2 transition-all
        ${
          qty > 0
            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
            : "border-gray-200 dark:border-stone-700 hover:border-gray-300 hover:bg-gray-50 dark:hover:bg-stone-800/50"
        }
      `}
    >
      <div className="flex-1 min-w-0 mr-4">
        <p className="font-medium text-sm text-stone-900 dark:text-stone-100">{name}</p>
        <p className="text-sm text-stone-500 dark:text-stone-400">{formatCurrency(price)}</p>
      </div>

      <div className="flex items-center gap-2">
        {qty > 0 && (
          <>
            <Button
              size="icon"
              variant="outline"
              onClick={onRemove}
              className="h-9 w-9 shrink-0"
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center font-bold text-emerald-700 dark:text-emerald-400">
              {qty}
            </span>
          </>
        )}

        <Button
          size="icon"
          variant={qty > 0 ? "default" : "outline"}
          onClick={onAdd}
          className={`h-9 w-9 shrink-0 ${qty > 0 ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
