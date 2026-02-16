'use client'
import { useRouter } from "next/navigation"
import { useMutation } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, User, ChevronRight } from "lucide-react"

type Table = {
  id: number
  number: number
  is_occupied: boolean
  type: string
  active_session_id: number | null
  customer_name: string | null
  customer_arrival: string | null
}

export function TableCard({ table }: { table: Table }) {
  const router = useRouter()
  
  const getTimeElapsed = (arrival: string) => {
    const arrivalTime = new Date(arrival)
    const now = new Date()
    const diffMs = now.getTime() - arrivalTime.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }
  
  const createOrderMutation = useMutation({
    mutationFn: async (table_session_id: number) => {
      await api.post(`/table-sessions/${table_session_id}/orders`)
    },
  })
  
  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/table-sessions", { table_id: table.id })
      return res.data
    },
    onSuccess: (data) => {
      createOrderMutation.mutate(data.id)
      router.push(`/table-session/${data.id}`)
    },
  })

  const isOccupied = table.is_occupied

  return (
    <Card className={`
      group relative overflow-hidden transition-all duration-300
      border-2 hover:shadow-lg
      ${isOccupied 
        ? "bg-white border-stone-200 hover:border-stone-300" 
        : "bg-stone-50 border-stone-200 hover:border-stone-400"
      }
    `}>
      
      {/* Minimal top accent line */}
      <div className={`h-1 w-full ${isOccupied ? "bg-stone-800" : "bg-stone-400"}`} />

      <div className="p-6 rounded-2xl">
        {/* Header - Clean & Minimal */}
        <div className="mb-6">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="text-3xl font-bold tracking-tight text-stone-900" style={{ fontFamily: 'Georgia, serif' }}>
              {table.number}
            </h3>
            <div className={`
              h-2 w-2 rounded-full
              ${isOccupied ? "bg-green-600 animate-pulse" : "bg-stone-400"}
            `} />
          </div>
          
          <p className={`text-xs uppercase tracking-widest font-semibold ${
            isOccupied ? "text-stone-800" : "text-stone-500"
          }`}>
            {isOccupied ? "In Service" : "Available"}
          </p>
        </div>

        {/* Info Section - Clean Lines with fixed height */}
        {isOccupied ? (
          <div className="space-y-3 mb-6 pb-6 border-b border-stone-200 min-h-[88px]">
            {table.customer_name && (
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-stone-500" />
                <span className="text-sm text-stone-700 font-medium">{table.customer_name}</span>
              </div>
            )}
            {table.customer_arrival && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-stone-500" />
                  <span className="text-sm text-stone-600">
                    {new Date(table.customer_arrival).toLocaleTimeString("en-NP", {
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "Asia/Kathmandu",
                    })}
                  </span>
                </div>
                <span className="text-xs font-semibold text-stone-800">
                  {getTimeElapsed(table.customer_arrival)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="mb-6 pb-6 min-h-[88px] flex items-center justify-center">
            <p className="text-sm text-stone-500 italic">
              Ready for guests
            </p>
          </div>
        )}

        {/* Actions - Minimal Buttons */}
        {isOccupied ? (
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-2 border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white transition-all font-semibold group/btn"
              onClick={() => router.push(`/table-session/${table.active_session_id}`)}
            >
              View Orders
              <ChevronRight className="h-4 w-4 ml-1 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              className="w-full text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-all font-medium"
              onClick={() => router.push(`/checkout/${table.active_session_id}`)}
            >
              Checkout
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="w-full bg-stone-800 hover:bg-stone-900 text-white font-semibold transition-all"
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? "Starting..." : "Start Session"}
          </Button>
        )}
      </div>
    </Card>
  )
}