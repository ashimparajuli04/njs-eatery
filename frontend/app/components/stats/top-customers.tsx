import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatCurrency } from "@/lib/format"
import type { TopCustomer } from "@/lib/analytics"

export function TopCustomers({ customers }: { customers: TopCustomer[] }) {
  return (
    <Card className="border-2 border-stone-200 dark:border-stone-700">
      <CardHeader>
        <CardTitle>Top Customers</CardTitle>
        <CardDescription>By total spend</CardDescription>
      </CardHeader>
      <CardContent>
        {customers.length === 0 ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">
            No customers in this period.
          </p>
        ) : (
          <ol className="space-y-3">
            {customers.map((customer, index) => (
              <li
                key={`${customer.phone_number}-${index}`}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-5 text-sm font-semibold text-stone-400">
                    {index + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate dark:text-stone-100">
                      {customer.name}
                    </p>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      {customer.phone_number} · {customer.visits} visit
                      {customer.visits === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-stone-800 shrink-0 dark:text-stone-200">
                  {formatCurrency(customer.total_spent)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  )
}
