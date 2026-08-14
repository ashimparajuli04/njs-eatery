import { Card, CardContent } from "@/components/ui/card"

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string
  value: string
  hint?: string
  icon: React.ElementType
}) {
  return (
    <Card className="border-2 border-stone-200 dark:border-stone-700">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400">
            {label}
          </p>
          <Icon className="h-4 w-4 text-stone-400 dark:text-stone-500" />
        </div>
        <p className="mt-2 text-2xl font-bold text-stone-900 dark:text-stone-100">
          {value}
        </p>
        {hint && (
          <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">{hint}</p>
        )}
      </CardContent>
    </Card>
  )
}
