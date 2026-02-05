import { UtensilsCrossed } from "lucide-react"

type MenuCategory = {
  id: number
  name: string
  display_order: number
}
type MenuSubCategory = {
  id: number
  name: string
  category_id: number
  display_order: number
}
type MenuItem = {
  id: number
  name: string
  price: number
  category_id: number
  sub_category_id: number
  display_order: number
  is_available: boolean
}

async function getCategories(): Promise<MenuCategory[]> {
  const res = await fetch("http://localhost:8000/menu-categories", {
    cache: "no-store",
  })
  return res.json()
}

async function getSubCategories(): Promise<MenuSubCategory[]> {
  const res = await fetch("http://localhost:8000/menu-subcategories", {
    cache: "no-store",
  })
  return res.json()
}

async function getMenuItems(): Promise<MenuItem[]> {
  const res = await fetch("http://localhost:8000/menu-items", {
    cache: "no-store",
  })
  return res.json()
}

export default async function MenuPage() {
  const [categories, subCategories, items] = await Promise.all([
    getCategories(),
    getSubCategories(),
    getMenuItems(),
  ])

  return (
    <div className="min-h-screen bg-gray-5">
      {/* Header */}
      <div className="bg-black text-white py-12 px-6 shadow-lg rounded-lg mx-5">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex justify-center mb-3">
            <UtensilsCrossed className="w-10 h-10" strokeWidth={1.5} />
          </div>
          <h1 className="text-4xl font-bold mb-2 tracking-wide">Our Menu</h1>
          <p className="text-gray-400 text-sm">Explore our selection</p>
        </div>
      </div>

      {/* Menu Content - 3 Column Grid */}
      <div className="max-w-7xl mx-auto px-6 py-5">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories
            .sort((a, b) => a.display_order - b.display_order)
            .map((category) => {
              const categorySubCategories = subCategories
                .filter((sc) => sc.category_id === category.id)
                .sort((a, b) => a.display_order - b.display_order)
              const categoryItemsWithNoSub = items
                .filter(
                  (item) =>
                    item.category_id === category.id &&
                    item.sub_category_id === null &&
                    item.is_available
                )
                .sort((a, b) => a.display_order - b.display_order)

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col"
                >
                  {/* Category Header */}
                  <div className="bg-black text-white py-4 px-5">
                    <h2 className="text-xl font-bold text-center">
                      {category.name}
                    </h2>
                  </div>

                  {/* Menu Items */}
                  <div className="p-5 space-y-5 flex-1">
                    {/* Subcategories */}
                    {categorySubCategories.map((sub) => {
                      const subItems = items
                        .filter(
                          (item) =>
                            item.sub_category_id === sub.id &&
                            item.is_available
                        )
                        .sort((a, b) => a.display_order - b.display_order)

                      return (
                        <div key={sub.id} className="space-y-2">
                          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide border-b border-gray-300 pb-1">
                            {sub.name}
                          </h3>
                          <div className="space-y-2">
                            {subItems.map((item) => (
                              <div
                                key={item.id}
                                className="flex justify-between items-start gap-2 text-sm hover:bg-gray-50 px-2 py-1.5 rounded transition-colors"
                              >
                                <span className="text-gray-800 flex-1 leading-snug">
                                  {item.name}
                                </span>
                                <span className="font-semibold text-gray-900 whitespace-nowrap">
                                  ₹{item.price}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })}

                    {/* Items without subcategory */}
                    {categoryItemsWithNoSub.length > 0 && (
                      <div className="space-y-2">
                        {categoryItemsWithNoSub.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-start gap-2 text-sm hover:bg-gray-50 px-2 py-1.5 rounded transition-colors"
                          >
                            <span className="text-gray-800 flex-1 leading-snug">
                              {item.name}
                            </span>
                            <span className="font-semibold text-gray-900 whitespace-nowrap">
                              ₹{item.price}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-black text-white py-6 mt-10">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-400 text-sm">All prices are inclusive of taxes</p>
        </div>
      </div>
    </div>
  )
}