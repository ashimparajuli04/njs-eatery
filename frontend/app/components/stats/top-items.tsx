import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { TopItem } from "@/lib/analytics"

export function TopItems({ items }: { items: TopItem[] }) {
  return (
    <Card className="border-2 border-stone-200 dark:border-stone-700">
      <CardHeader>
        <CardTitle>Top Items</CardTitle>
        <CardDescription>Best sellers by quantity</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No sales in this period.
          </p>
        ) : (
          <ol className="space-y-3">
            {items.map((item, index) => (
              <li key={item.name} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-sm font-semibold text-stone-400">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-stone-900 truncate dark:text-stone-100">
                    {item.name}
                  </span>
                  <span className="text-xs text-stone-500 shrink-0">
                    × {item.quantity}
                  </span>
                </div>
                <span className="text-sm font-semibold text-stone-800 shrink-0 dark:text-stone-200">
                  {formatCurrency(item.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
