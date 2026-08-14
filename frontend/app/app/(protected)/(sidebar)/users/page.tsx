'use client'

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/providers/auth-provider"
import api from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
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
import { Coffee, Users, Trash2, Shield, UserRound } from "lucide-react"
import { LoadingView } from "@/components/loading"
import { toast } from "sonner"
import type { User } from "@/types/table"

export default function UsersManagementPage() {
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [editingRole, setEditingRole] = useState<{ userId: number; newRole: string } | null>(null)

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const response = await api.get("/admin/users")
      return response.data
    },
  })

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      await api.patch(`/admin/users/${userId}`, { role })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      setEditingRole(null)
      toast.success("Role updated")
    },
    onError: () => {
      toast.error("Couldn't update the role", {
        description: "Please try again.",
      })
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: number; isActive: boolean }) => {
      await api.patch(`/admin/users/${userId}`, { is_active: isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("Account status updated")
    },
    onError: () => {
      toast.error("Couldn't update the account status", {
        description: "Please try again.",
      })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/admin/users/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] })
      toast.success("User deleted")
    },
    onError: () => {
      toast.error("Couldn't delete the user", {
        description: "Please try again.",
      })
    },
  })

  const getInitials = (user: User) => {
    const firstInitial = user.first_name?.[0] || ""
    const lastInitial = user.last_name?.[0] || ""
    return `${firstInitial}${lastInitial}`.toUpperCase()
  }

  const getFullName = (user: User) => {
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean)
    return parts.join(" ")
  }

  if (isLoading) {
    return (
      <LoadingView label="users"/>
    )
  }

  const activeUsers = users?.filter(u => u.is_active) || []
  const totalUsers = users?.length || 0

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      {/* Header Section */}
      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-6 w-6 text-stone-800 dark:text-stone-300" />
            <div className="h-1 w-12 bg-stone-800 dark:bg-stone-300" />
          </div>
          <h1 className="text-4xl font-bold text-stone-900 dark:text-stone-100 mb-1" style={{ fontFamily: 'Georgia, serif' }}>
            User Management
          </h1>
          <p className="text-stone-600 dark:text-stone-400 text-sm">
            {activeUsers.length} active users · {totalUsers} total
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users?.map((user) => (
            <Card
              key={user.id}
              className={`border-2 transition-all ${
                user.id === currentUser?.id
                  ? "border-amber-300 bg-amber-50/30 dark:border-amber-700 dark:bg-amber-950/20"
                  : "border-stone-200 dark:border-stone-700 hover:border-stone-300"
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-stone-200">
                      <AvatarImage
                        src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user.id}`}
                        alt={getFullName(user)}
                      />
                      <AvatarFallback className="bg-stone-100 text-stone-700 font-semibold">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base font-semibold text-stone-900 dark:text-stone-100">
                        {getFullName(user)}
                      </CardTitle>
                      {user.id === currentUser?.id && (
                        <Badge variant="outline" className="mt-1 text-xs bg-amber-100 text-amber-700 border-amber-300">
                          You
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Email */}
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-1">Email</p>
                  <p className="text-sm text-stone-900 dark:text-stone-100 font-medium break-all">{user.email}</p>
                </div>

                {/* Role Selector */}
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">Role</p>
                  <Select
                    value={editingRole?.userId === user.id ? editingRole.newRole : user.role}
                    onValueChange={(value) => setEditingRole({ userId: user.id, newRole: value })}
                    disabled={currentUser?.role !== 'admin'}
                  >
                    <SelectTrigger className="w-full border-stone-300">
                      <SelectValue>
                        <div className="flex items-center gap-2">
                          {(editingRole?.userId === user.id ? editingRole.newRole : user.role) === "admin" && <Shield className="h-3 w-3" />}
                          <span className="capitalize">{editingRole?.userId === user.id ? editingRole.newRole : user.role}</span>
                        </div>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Shield className="h-3 w-3" />
                          Admin
                        </div>
                      </SelectItem>
                      <SelectItem value="employee">
                        <div className="flex items-center gap-2">
                          <Coffee className="h-3 w-3" />
                          Employee
                        </div>
                      </SelectItem>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <UserRound className="h-3 w-3" />
                          User
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between py-2">
                  <div>
                    <Label htmlFor={`active-${user.id}`} className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wide cursor-pointer">
                      Account Status
                    </Label>
                    <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5">
                      {user.is_active ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Switch
                    id={`active-${user.id}`}
                    checked={user.is_active}
                    onCheckedChange={(checked) =>
                      toggleActiveMutation.mutate({
                        userId: user.id,
                        isActive: checked,
                      })
                    }
                    disabled={toggleActiveMutation.isPending || currentUser?.role !== 'admin'}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {editingRole?.userId === user.id && editingRole.newRole !== user.role ? (
                    <>
                      <Button
                        size="sm"
                        className="flex-1 bg-stone-800 hover:bg-stone-900 text-white"
                        onClick={() =>
                          updateRoleMutation.mutate({
                            userId: user.id,
                            role: editingRole.newRole,
                          })
                        }
                        disabled={updateRoleMutation.isPending || currentUser?.role !== 'admin'}
                      >
                        {updateRoleMutation.isPending ? "Saving..." : "Save Role"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 border-stone-300"
                        onClick={() => setEditingRole(null)}
                        disabled={currentUser?.role !== 'admin'}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={currentUser?.role !== 'admin'}
                        >
                          <Trash2 className="h-3 w-3 mr-2" />
                          Delete User
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="border-stone-200">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-stone-900">
                            Delete {getFullName(user)}?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-stone-600">
                            This action cannot be undone. This will permanently delete the user account
                            {user.id === currentUser?.id && " (including your own account)"}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => deleteUserMutation.mutate(user.id)}
                          >
                            {deleteUserMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Empty State */}
        {users?.length === 0 && (
          <Card className="border-2 border-stone-200">
            <CardContent className="py-16 text-center">
              <Users className="h-12 w-12 mx-auto text-stone-400 mb-4" />
              <p className="text-lg font-semibold text-stone-900 mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                No users found
              </p>
              <p className="text-sm text-stone-600">
                Users will appear here once they sign up
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}