import { Card, CardContent } from "@/components/ui/card"

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description: string
  action?: React.ReactNode
}) {
  return (
    <Card className="border-2 border-stone-200 dark:border-stone-700">
      <CardContent className="py-16 text-center">
        <Icon className="h-12 w-12 mx-auto text-stone-400 mb-4" />
        <p
          className="text-lg font-semibold text-stone-900 mb-2 dark:text-stone-100"
          style={{ fontFamily: "Georgia, serif" }}
        >
          {title}
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-400">{description}</p>
        {action && <div className="mt-6 flex justify-center">{action}</div>}
      </CardContent>
    </Card>
  )
}
