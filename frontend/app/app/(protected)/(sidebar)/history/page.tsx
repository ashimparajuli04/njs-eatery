'use client'
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { 
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Clock, User, UtensilsCrossed, Calendar, Receipt, Eye, Trash, Coffee } from "lucide-react"
import { useAuth } from "@/providers/auth-provider"

type TableSessionHistory = {
  id: number
  table_id: number | null
  customer_name: string | null
  final_bill: number
  started_at: string
  ended_at: string
}

type PaginationResponse = {
  items: TableSessionHistory[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export default function HistoryPage() {
  const router = useRouter()
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 5
  const queryClient = useQueryClient()
  const { user } = useAuth()

  const { data, isLoading } = useQuery<PaginationResponse>({
    queryKey: ["table-session-history", currentPage, pageSize],
    queryFn: async () => {
      const response = await api.get(`/table-sessions/history/paginated?page=${currentPage}&page_size=${pageSize}`)
      return response.data
    },
  })
  
  
  const invalidate = () => queryClient.invalidateQueries({ 
    queryKey: ["table-session-history", currentPage, pageSize] 
  })
  
  const deleteSessionMutation = useMutation({
    mutationFn: (table_session_id: number) => api.delete(`/table-sessions/${table_session_id}`),
    onSuccess: invalidate,
  })
  
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Date'
    
    // Convert to Nepal time (UTC+5:45)
    const nepalTime = new Date(date.getTime() + (5 * 60 + 45) * 60 * 1000)
    
    const day = String(nepalTime.getUTCDate()).padStart(2, '0')
    const month = String(nepalTime.getUTCMonth() + 1).padStart(2, '0')
    const year = nepalTime.getUTCFullYear()
    return `${day}/${month}/${year}`
  }

  const formatTime = (dateString: string) => {
    if (!dateString) return 'N/A'
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return 'Invalid Time'
    
    // Convert to Nepal time (UTC+5:45)
    const nepalTime = new Date(date.getTime() + (5 * 60 + 45) * 60 * 1000)
    
    let hours = nepalTime.getUTCHours()
    const minutes = String(nepalTime.getUTCMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'PM' : 'AM'
    hours = hours % 12 || 12
    return `${hours}:${minutes} ${ampm}`
  }

  const getDuration = (start: string, end: string) => {
    const startDate = new Date(start)
    const endDate = new Date(end)
    const diffMs = endDate.getTime() - startDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m`
    const hours = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    return `${hours}h ${mins}m`
  }

  const renderPaginationItems = () => {
    if (!data) return null
    
    const items = []
    const totalPages = data.total_pages
    const current = currentPage

    // Always show first page
    items.push(
      <PaginationItem key={1}>
        <PaginationLink 
          onClick={() => setCurrentPage(1)}
          isActive={current === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>
    )

    // Show ellipsis if needed
    if (current > 3) {
      items.push(
        <PaginationItem key="ellipsis-start">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    // Show pages around current page
    for (let i = Math.max(2, current - 1); i <= Math.min(totalPages - 1, current + 1); i++) {
      items.push(
        <PaginationItem key={i}>
          <PaginationLink 
            onClick={() => setCurrentPage(i)}
            isActive={current === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>
      )
    }

    // Show ellipsis if needed
    if (current < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis-end">
          <PaginationEllipsis />
        </PaginationItem>
      )
    }

    // Always show last page if more than 1 page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key={totalPages}>
          <PaginationLink 
            onClick={() => setCurrentPage(totalPages)}
            isActive={current === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>
      )
    }

    return items
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Coffee className="h-10 w-10 mx-auto text-stone-800 animate-pulse" />
          <p className="text-stone-600">Loading history...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header Section */}
      <div className="bg-white border-b border-stone-200 rounded-2xl">
        <div className="max-w-6xl mx-auto px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Receipt className="h-6 w-6 text-stone-800" />
            <div className="h-1 w-12 bg-stone-800" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            Session History
          </h1>
          <p className="text-stone-600 text-sm">
            {data?.total || 0} completed sessions
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Session Cards */}
        {data && data.items.length > 0 ? (
          <div className="space-y-4 mb-12">
            {data.items.map((session) => (
              <Card key={session.id} className="border-2 border-stone-200 hover:border-stone-300 transition-colors">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        <UtensilsCrossed className="h-5 w-5 text-stone-600" />
                        <span style={{ fontFamily: 'Georgia, serif' }}>Table Session #{session.id}</span>
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-stone-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(session.ended_at)}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.started_at)}
                        </div>
                        <span className="text-stone-400">—</span>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3 w-3" />
                          {formatTime(session.ended_at)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold">
                        Completed
                      </Badge>
                      <div className="text-right">
                        <p className="text-xs text-stone-500 uppercase tracking-wide">Total Bill</p>
                        <p className="text-2xl font-bold text-stone-900">₹{session.final_bill.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-stone-500" />
                      <div>
                        <p className="text-xs text-stone-500 uppercase tracking-wide">Customer</p>
                        <p className="font-medium text-sm text-stone-900">{session.customer_name || "Unknown"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-stone-500" />
                      <div>
                        <p className="text-xs text-stone-500 uppercase tracking-wide">Duration</p>
                        <p className="font-medium text-sm text-stone-900">
                          {getDuration(session.started_at, session.ended_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Receipt className="h-4 w-4 text-stone-500" />
                      <div>
                        <p className="text-xs text-stone-500 uppercase tracking-wide">Session ID</p>
                        <p className="font-medium text-sm text-stone-900">#{session.id}</p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 col-start-4">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-stone-800 text-stone-800 hover:bg-stone-800 hover:text-white transition-all font-semibold"
                        onClick={() => router.push(`/table-session/${session.id}`)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                      
                      {user?.role !== "admin" ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  disabled
                                  className="opacity-50 cursor-not-allowed"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Admin access required</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="font-semibold"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete
                            </Button>
                          </AlertDialogTrigger>
                      
                          <AlertDialogContent className="border-stone-200">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-stone-900">
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription className="text-stone-600">
                                This action cannot be undone. This will permanently delete the table session from the database.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                      
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => deleteSessionMutation.mutate(session.id)}
                                disabled={deleteSessionMutation.isPending}
                              >
                                {deleteSessionMutation.isPending &&
                                 deleteSessionMutation.variables === session.id
                                  ? "Deleting..."
                                  : "Delete"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-2 border-stone-200">
            <CardContent className="py-16 text-center">
              <Receipt className="h-12 w-12 mx-auto text-stone-400 mb-4" />
              <p className="text-lg font-semibold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                No session history
              </p>
              <p className="text-sm text-stone-600">
                Completed sessions will appear here
              </p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {data && data.total_pages > 1 && (
          <div className="flex justify-center">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                
                {renderPaginationItems()}
                
                <PaginationItem>
                  <PaginationNext 
                    onClick={() => setCurrentPage(p => Math.min(data.total_pages, p + 1))}
                    className={currentPage === data.total_pages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>
    </div>
  )
}