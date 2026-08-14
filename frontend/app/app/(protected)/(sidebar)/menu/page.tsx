'use client'

import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/lib/api"
import { Coffee, Edit3, Plus, Trash2, X, Save } from "lucide-react"
import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LoadingView } from "@/components/loading"
import { ErrorState } from "@/components/error-state"
import { useAuth } from "@/providers/auth-provider"
import { useMenu } from "@/lib/hooks"
import { queryKeys } from "@/lib/query-keys"
import { formatCurrency } from "@/lib/format"
import type { MenuCategory, MenuItem, MenuSubCategory } from "@/types/table"
import { toast } from "sonner"

type CreateMenuCategoryInput = {
  name: string
}

type CreateMenuSubCategoryInput = {
  name: string
  category_id: number
}

type CreateMenuItemInput = {
  name: string
  price: number
  category_id: number
  sub_category_id: number | null
}

type CreateDialog =
  | { type: "category" }
  | { type: "subcategory"; categoryId: number }
  | { type: "item"; categoryId: number; subCategoryId: number | null }
  | null

type DeleteTarget =
  | { type: "category"; id: number }
  | { type: "subcategory"; id: number }
  | { type: "item"; id: number }
  | null

export default function MenuPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === "admin"
  const [editMode, setEditMode] = useState(false)
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null)
  const [editingSubCategory, setEditingSubCategory] = useState<MenuSubCategory | null>(null)
  const [createDialog, setCreateDialog] = useState<CreateDialog>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null)
  const [formData, setFormData] = useState({ name: "", price: "" })
  const queryClient = useQueryClient()

  const { categories, subCategories, items, isLoading, error, refetch } = useMenu()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.menu.all })

  const errorToast = (action: string) => {
    toast.error(`Couldn't ${action}`, {
      description: "Please try again.",
    })
  }

  const deleteCategoryMutation = useMutation({
    mutationFn: (categoryId: number) =>
      api.delete(`/admin/menu/categories/${categoryId}`),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success("Category deleted")
    },
    onError: () => errorToast("delete the category"),
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MenuCategory> }) =>
      api.patch(`/admin/menu/categories/${id}`, data),
    onSuccess: () => {
      invalidate()
      setEditingCategory(null)
      toast.success("Category updated")
    },
    onError: () => errorToast("update the category"),
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: CreateMenuCategoryInput) =>
      api.post("/admin/menu/categories", data),
    onSuccess: () => {
      invalidate()
      setCreateDialog(null)
      setFormData({ name: "", price: "" })
      toast.success("Category created")
    },
    onError: () => errorToast("create the category"),
  })

  const deleteSubCategoryMutation = useMutation({
    mutationFn: (subCategoryId: number) =>
      api.delete(`/admin/menu/subcategories/${subCategoryId}`),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success("Subcategory deleted")
    },
    onError: () => errorToast("delete the subcategory"),
  })

  const updateSubCategoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MenuSubCategory> }) =>
      api.patch(`/admin/menu/subcategories/${id}`, data),
    onSuccess: () => {
      invalidate()
      setEditingSubCategory(null)
      toast.success("Subcategory updated")
    },
    onError: () => errorToast("update the subcategory"),
  })

  const createSubCategoryMutation = useMutation({
    mutationFn: (data: CreateMenuSubCategoryInput) =>
      api.post("/admin/menu/subcategories", data),
    onSuccess: () => {
      invalidate()
      setCreateDialog(null)
      setFormData({ name: "", price: "" })
      toast.success("Subcategory created")
    },
    onError: () => errorToast("create the subcategory"),
  })

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: number) => api.delete(`/admin/menu/items/${itemId}`),
    onSuccess: () => {
      invalidate()
      setDeleteTarget(null)
      toast.success("Item deleted")
    },
    onError: () => errorToast("delete the item"),
  })

  const updateItemMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<MenuItem> }) =>
      api.patch(`/admin/menu/items/${id}`, data),
    onSuccess: () => {
      invalidate()
      toast.success("Item updated")
    },
    onError: () => errorToast("update the item"),
  })

  const createItemMutation = useMutation({
    mutationFn: (data: CreateMenuItemInput) => api.post("/admin/menu/items", data),
    onSuccess: () => {
      invalidate()
      setCreateDialog(null)
      setFormData({ name: "", price: "" })
      toast.success("Item created")
    },
    onError: () => errorToast("create the item"),
  })

  if (isLoading) {
    return <LoadingView label="menu" />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 dark:bg-stone-950 flex items-center justify-center p-4">
        <ErrorState
          title="Couldn't load the menu"
          message="The menu couldn't be fetched. Check the backend and retry."
          onRetry={refetch}
        />
      </div>
    )
  }

  const handleCreateSubmit = () => {
    if (!createDialog) return

    if (createDialog.type === "category") {
      createCategoryMutation.mutate({ name: formData.name })
    } else if (createDialog.type === "subcategory") {
      createSubCategoryMutation.mutate({
        name: formData.name,
        category_id: createDialog.categoryId,
      })
    } else if (createDialog.type === "item") {
      createItemMutation.mutate({
        name: formData.name,
        price: parseFloat(formData.price),
        category_id: createDialog.categoryId,
        sub_category_id: createDialog.subCategoryId,
      })
    }
  }

  const confirmDelete = () => {
    if (!deleteTarget) return
    if (deleteTarget.type === "category") deleteCategoryMutation.mutate(deleteTarget.id)
    if (deleteTarget.type === "subcategory") deleteSubCategoryMutation.mutate(deleteTarget.id)
    if (deleteTarget.type === "item") deleteItemMutation.mutate(deleteTarget.id)
  }

  const deleteInProgress =
    deleteTarget?.type === "category"
      ? deleteCategoryMutation.isPending
      : deleteTarget?.type === "subcategory"
        ? deleteSubCategoryMutation.isPending
        : deleteTarget?.type === "item"
          ? deleteItemMutation.isPending
          : false

  const deleteTitle = deleteTarget
    ? deleteTarget.type === "category"
      ? "Delete this category?"
      : deleteTarget.type === "subcategory"
        ? "Delete this subcategory?"
        : "Delete this item?"
    : ""

  const deleteDescription = deleteTarget
    ? deleteTarget.type === "item"
      ? "This will permanently remove the item from the menu."
      : "This will permanently remove it and all its contents from the menu."
    : ""

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <Dialog
        open={createDialog !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialog(null)
            setFormData({ name: "", price: "" })
          }
        }}
      >
        <DialogContent className="border-stone-200 dark:border-stone-700">
          <DialogHeader>
            <DialogTitle className="text-stone-900 dark:text-stone-100">
              {createDialog?.type === "category" && "Add Category"}
              {createDialog?.type === "subcategory" && "Add Subcategory"}
              {createDialog?.type === "item" && "Add Menu Item"}
            </DialogTitle>
            <DialogDescription className="text-stone-600 dark:text-stone-400">
              {createDialog?.type === "category" && "Create a new menu category"}
              {createDialog?.type === "subcategory" && "Create a new subcategory"}
              {createDialog?.type === "item" && "Add a new item to the menu"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-stone-700 dark:text-stone-300">
                Name
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={
                  createDialog?.type === "category"
                    ? "e.g., Beverages"
                    : createDialog?.type === "subcategory"
                      ? "e.g., Hot Drinks"
                      : "e.g., Cappuccino"
                }
                className="border-stone-300 focus:border-stone-500 dark:border-stone-700"
                autoFocus
              />
            </div>
            {createDialog?.type === "item" && (
              <div className="space-y-2">
                <Label htmlFor="price" className="text-stone-700 dark:text-stone-300">
                  Price (Rs.)
                </Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g., 150"
                  className="border-stone-300 focus:border-stone-500 dark:border-stone-700"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreateDialog(null)
                setFormData({ name: "", price: "" })
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={
                !formData.name ||
                (createDialog?.type === "item" && !formData.price)
              }
              className="bg-stone-800 hover:bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="border-stone-200 dark:border-stone-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-stone-900 dark:text-stone-100">
              {deleteTitle}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-stone-600 dark:text-stone-400">
              {deleteDescription}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
              disabled={deleteInProgress}
            >
              {deleteInProgress ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isAdmin && (
        <button
          onClick={() => setEditMode(!editMode)}
          className={`fixed top-6 right-6 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 transition-all ${
            editMode
              ? "bg-stone-800 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-200"
              : "bg-white text-stone-800 hover:bg-stone-50 border border-stone-300 dark:bg-stone-900 dark:text-stone-200 dark:border-stone-700 dark:hover:bg-stone-800"
          }`}
        >
          {editMode ? (
            <>
              <X className="h-4 w-4" />
              Exit Edit Mode
            </>
          ) : (
            <>
              <Edit3 className="h-4 w-4" />
              Edit Menu
            </>
          )}
        </button>
      )}

      <div className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 rounded-b-2xl">
        <div className="max-w-4xl mx-auto px-6 py-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Coffee className="h-8 w-8 text-stone-800 dark:text-stone-300" />
          </div>
          <h1
            className="text-4xl md:text-5xl font-bold text-stone-900 dark:text-stone-100 mb-2 tracking-tight"
            style={{ fontFamily: "Georgia, serif" }}
          >
            NJ&apos;S Café & Restaurant
          </h1>
          <div className="w-16 h-0.5 bg-stone-800 dark:bg-stone-300 mx-auto" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {editMode && (
          <button
            onClick={() => setCreateDialog({ type: "category" })}
            className="mb-8 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Category
          </button>
        )}

        <div className="space-y-16">
          {categories
            .slice()
            .sort((a, b) => a.display_order - b.display_order)
            .map((category) => {
              const categorySubCategories = subCategories
                .filter((sc) => sc.category_id === category.id)
                .slice()
                .sort((a, b) => a.display_order - b.display_order)

              const categoryItemsWithNoSub = items
                .filter(
                  (item) =>
                    item.category_id === category.id &&
                    item.sub_category_id === null &&
                    item.is_available
                )
                .slice()
                .sort((a, b) => a.display_order - b.display_order)

              return (
                <div key={category.id}>
                  <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-stone-300 dark:border-stone-700">
                    {editingCategory?.id === category.id ? (
                      <Input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) =>
                          setEditingCategory({ ...editingCategory, name: e.target.value })
                        }
                        className="text-2xl font-bold text-stone-900 dark:text-stone-100 border-b-2 border-stone-400 outline-none"
                        style={{ fontFamily: "Georgia, serif" }}
                      />
                    ) : (
                      <h2
                        className="text-2xl font-bold text-stone-900 dark:text-stone-100"
                        style={{ fontFamily: "Georgia, serif" }}
                      >
                        {category.name}
                      </h2>
                    )}

                    {editMode && (
                      <div className="flex items-center gap-2">
                        {editingCategory?.id === category.id ? (
                          <button
                            onClick={() =>
                              updateCategoryMutation.mutate({
                                id: category.id,
                                data: { name: editingCategory.name },
                              })
                            }
                            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setEditingCategory(category)}
                            className="p-2 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            setCreateDialog({ type: "subcategory", categoryId: category.id })
                          }
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded"
                          title="Add Subcategory"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteTarget({ type: "category", id: category.id })
                          }
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-8">
                    {categorySubCategories.map((sub) => {
                      const subItems = items
                        .filter(
                          (item) =>
                            item.sub_category_id === sub.id && item.is_available
                        )
                        .slice()
                        .sort((a, b) => a.display_order - b.display_order)

                      if (subItems.length === 0 && !editMode) return null

                      return (
                        <div key={sub.id}>
                          <div className="flex items-center justify-between mb-4">
                            {editingSubCategory?.id === sub.id ? (
                              <Input
                                type="text"
                                value={editingSubCategory.name}
                                onChange={(e) =>
                                  setEditingSubCategory({
                                    ...editingSubCategory,
                                    name: e.target.value,
                                  })
                                }
                                className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider border-b border-stone-400 outline-none"
                              />
                            ) : (
                              <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider pl-1">
                                {sub.name}
                              </h3>
                            )}

                            {editMode && (
                              <div className="flex items-center gap-2">
                                {editingSubCategory?.id === sub.id ? (
                                  <button
                                    onClick={() =>
                                      updateSubCategoryMutation.mutate({
                                        id: sub.id,
                                        data: { name: editingSubCategory.name },
                                      })
                                    }
                                    className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded text-xs"
                                  >
                                    <Save className="h-3 w-3" />
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => setEditingSubCategory(sub)}
                                    className="p-1 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded text-xs"
                                  >
                                    <Edit3 className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    setCreateDialog({
                                      type: "item",
                                      categoryId: category.id,
                                      subCategoryId: sub.id,
                                    })
                                  }
                                  className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded text-xs"
                                  title="Add Item"
                                >
                                  <Plus className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() =>
                                    setDeleteTarget({ type: "subcategory", id: sub.id })
                                  }
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded text-xs"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            {subItems.map((item) => (
                              <MenuRow
                                key={item.id}
                                item={item}
                                editMode={editMode}
                                onSave={(data) =>
                                  updateItemMutation.mutate({ id: item.id, data })
                                }
                                onDelete={() =>
                                  setDeleteTarget({ type: "item", id: item.id })
                                }
                              />
                            ))}
                            {editMode && subItems.length === 0 && (
                              <p className="text-stone-400 dark:text-stone-500 text-sm italic pl-3">
                                No items yet
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}

                    {(categoryItemsWithNoSub.length > 0 || editMode) && (
                      <div className="space-y-3">
                        {editMode && categorySubCategories.length > 0 && (
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider pl-1">
                              General Items
                            </h3>
                            <button
                              onClick={() =>
                                setCreateDialog({
                                  type: "item",
                                  categoryId: category.id,
                                  subCategoryId: null,
                                })
                              }
                              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded text-xs"
                              title="Add Item"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                        {editMode && categorySubCategories.length === 0 && (
                          <button
                            onClick={() =>
                              setCreateDialog({
                                type: "item",
                                categoryId: category.id,
                                subCategoryId: null,
                              })
                            }
                            className="mb-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Item
                          </button>
                        )}
                        {categoryItemsWithNoSub.map((item) => (
                          <MenuRow
                            key={item.id}
                            item={item}
                            editMode={editMode}
                            onSave={(data) =>
                              updateItemMutation.mutate({ id: item.id, data })
                            }
                            onDelete={() =>
                              setDeleteTarget({ type: "item", id: item.id })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      <div className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 py-8 mt-16">
        <div className="max-w-4xl mx-auto text-center px-6">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            All prices are inclusive of taxes
          </p>
        </div>
      </div>
    </div>
  )
}

function MenuRow({
  item,
  editMode,
  onSave,
  onDelete,
}: {
  item: MenuItem
  editMode: boolean
  onSave: (data: Partial<MenuItem>) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(item.name)
  const [price, setPrice] = useState(item.price)

  const startEdit = () => {
    setName(item.name)
    setPrice(item.price)
    setIsEditing(true)
  }

  const save = () => {
    onSave({ name: name.trim() || item.name, price })
    setIsEditing(false)
  }

  return (
    <div className="flex justify-between items-baseline gap-4 group hover:bg-white dark:hover:bg-stone-900 px-3 py-2 rounded transition-colors">
      <div className="flex-1 flex items-baseline gap-2">
        {isEditing ? (
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") save()
            }}
            className="text-stone-900 dark:text-stone-100 font-medium border-b border-stone-400 outline-none"
            aria-label="Item name"
            autoFocus
          />
        ) : (
          <span className="text-stone-900 dark:text-stone-100 font-medium group-hover:text-stone-700 dark:group-hover:text-stone-300 transition-colors">
            {item.name}
          </span>
        )}
        <div className="flex-1 border-b border-dotted border-stone-300 dark:border-stone-700 mb-1" />
      </div>
      {isEditing ? (
        <Input
          type="number"
          value={price}
          onChange={(e) => setPrice(parseFloat(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === "Enter") save()
          }}
          className="text-stone-700 dark:text-stone-300 font-medium w-24 border-b border-stone-400 outline-none text-right"
          aria-label="Item price"
        />
      ) : (
        <span className="text-stone-700 dark:text-stone-300 font-medium whitespace-nowrap">
          {formatCurrency(item.price)}
        </span>
      )}
      {editMode && (
        <div className="flex items-center gap-1 ml-2">
          {isEditing ? (
            <button
              onClick={save}
              className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950 rounded"
              title="Save changes"
            >
              <Save className="h-3 w-3" />
            </button>
          ) : (
            <button
              onClick={startEdit}
              className="p-1 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded"
            >
              <Edit3 className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={onDelete}
            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950 rounded"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  )
}
