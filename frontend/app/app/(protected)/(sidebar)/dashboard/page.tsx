'use client'
import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TableCard } from "@/components/table-card"
import { Button } from "@/components/ui/button"
import {
  Plus, Coffee, Home, Building2, ShoppingBag, LucideIcon,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { useTables } from "@/lib/hooks"
import { formatNepalDate } from "@/lib/format"
import { queryKeys } from "@/lib/query-keys"
import type { Table, TableType } from "@/types/table"
import { useAuth } from "@/providers/auth-provider"
import { LoadingView } from '@/components/loading'
import { ErrorState } from '@/components/error-state'
import { EmptyState } from '@/components/empty-state'
import { toast } from 'sonner'

const TableSection = ({
  title,
  icon: Icon,
  tables,
}: {
  title: string
  icon: LucideIcon
  tables: Table[]
}) => {
  if (tables.length === 0) return null

  const occupiedInSection = tables.filter((t) => t.is_occupied).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Icon className="h-5 w-5 text-stone-700 dark:text-stone-300" />
          <h2
            className="text-2xl font-bold text-stone-900 dark:text-stone-100"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {title}
          </h2>
          <span className="text-sm text-stone-600 dark:text-stone-400">
            ({occupiedInSection} of {tables.length} occupied)
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tables.map((table) => (
          <TableCard key={table.id} table={table} />
        ))}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [tableNumber, setTableNumber] = useState("")
  const [tableType, setTableType] = useState<TableType>("indoor")

  const {
    data: tables,
    isLoading,
    error,
    refetch,
  } = useTables({
    refetchInterval: (query) => {
      const current = query.state.data
      const hasActive = current?.some((t) => t.is_occupied)
      return hasActive ? 15_000 : false
    },
  })

  const createTableMutation = useMutation({
    mutationFn: async (data: { number: number; type: TableType }) => {
      await api.post("/tables", data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tables })
      setCreateDialogOpen(false)
      setTableNumber("")
      setTableType("indoor")
      toast.success("Table created")
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to create the table."
      toast.error("Couldn't create table", { description: message })
    },
  })

  const handleCreateTable = () => {
    const number = parseInt(tableNumber)
    if (!isNaN(number) && number > 0) {
      createTableMutation.mutate({ number, type: tableType })
    }
  }

  const occupiedCount = tables?.filter((t) => t.is_occupied).length || 0
  const totalCount = tables?.length || 0

  const indoorTables = tables?.filter((t) => t.type === "indoor") || []
  const rooftopTables = tables?.filter((t) => t.type === "rooftop") || []
  const takeawayTables = tables?.filter((t) => t.type === "takeaway") || []

  if (isLoading) {
    return <LoadingView label="dashboard" />
  }

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <div className="bg-white border-b border-stone-200 dark:bg-stone-900 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Coffee className="h-6 w-6 text-stone-800 dark:text-stone-300" />
                <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
              </div>
              <h1
                className="text-4xl font-bold text-stone-900 mb-1 dark:text-stone-100"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                Dashboard
              </h1>
              <p className="text-stone-600 text-sm dark:text-stone-400">
                {occupiedCount} of {totalCount} tables occupied ·{" "}
                {formatNepalDate(new Date())}
              </p>
            </div>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="bg-stone-800 hover:bg-stone-900 text-white font-semibold px-6 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                  disabled={user?.role !== 'admin'}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Table
                </Button>
              </DialogTrigger>
              <DialogContent className="border-stone-200 dark:border-stone-700">
                <DialogHeader>
                  <DialogTitle className="text-stone-900 dark:text-stone-100">
                    Create New Table
                  </DialogTitle>
                  <DialogDescription className="text-stone-600 dark:text-stone-400">
                    Add a new table to your restaurant
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="table-number" className="text-stone-700 dark:text-stone-300">
                      Table Number
                    </Label>
                    <Input
                      id="table-number"
                      type="number"
                      placeholder="e.g., 1"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      className="border-stone-300 focus:border-stone-500 dark:border-stone-700"
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="table-type" className="text-stone-700 dark:text-stone-300">
                      Table Type
                    </Label>
                    <Select
                      value={tableType}
                      onValueChange={(value: TableType) => setTableType(value)}
                    >
                      <SelectTrigger className="border-stone-300 dark:border-stone-700">
                        <SelectValue placeholder="Select table type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="indoor">
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4" />
                            Indoor
                          </div>
                        </SelectItem>
                        <SelectItem value="rooftop">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            Rooftop
                          </div>
                        </SelectItem>
                        <SelectItem value="takeaway">
                          <div className="flex items-center gap-2">
                            <ShoppingBag className="h-4 w-4" />
                            Takeaway
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateDialogOpen(false)}
                    className="border-stone-300 dark:border-stone-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTable}
                    disabled={createTableMutation.isPending || !tableNumber}
                    className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
                  >
                    {createTableMutation.isPending ? "Creating..." : "Create Table"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12 space-y-12">
        <div className="space-y-12">
          {error ? (
            <ErrorState
              title="Couldn't load tables"
              onRetry={refetch}
            />
          ) : tables && tables.length === 0 ? (
            <EmptyState
              icon={Coffee}
              title="No tables yet"
              description="Create your first table to start taking orders."
              action={
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  disabled={user?.role !== 'admin'}
                  className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Table
                </Button>
              }
            />
          ) : (
            <>
              <TableSection
                title="Indoor Tables"
                icon={Home}
                tables={indoorTables}
              />
              <TableSection
                title="Rooftop Tables"
                icon={Building2}
                tables={rooftopTables}
              />
              <TableSection
                title="Takeaway"
                icon={ShoppingBag}
                tables={takeawayTables}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
