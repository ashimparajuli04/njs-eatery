import { Button } from "@/components/ui/button"
import { AlertCircle } from "lucide-react"

export function ErrorState({
  title = "Something went wrong",
  message,
  onRetry,
}: {
  title?: string
  message?: string
  onRetry?: () => void
}) {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md px-4">
        <AlertCircle className="h-10 w-10 mx-auto text-red-600" />
        <div>
          <p className="text-lg font-semibold text-stone-900 mb-1">{title}</p>
          <p className="text-sm text-stone-600">
            {message ?? "An unexpected error occurred. Please try again."}
          </p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            onClick={onRetry}
            className="border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white"
          >
            Retry
          </Button>
        )}
      </div>
    </div>
  )
}
