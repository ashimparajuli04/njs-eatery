import { ClipboardList, History, LayoutDashboard, LogOut, PanelLeft, Settings, Utensils, X, Coffee, UsersRound } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/providers/auth-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Menu",
    url: "/menu",
    icon: Utensils,
  },
  {
    title: "All Orders",
    url: "/orders",
    icon: ClipboardList,
  },
  {
    title: "History",
    url: "/history",
    icon: History,
  },
  {
    title: "Users",
    url: "/users",
    icon: UsersRound,
  },
]

export function AppSidebar() {
  const { open, setOpen } = useSidebar()
  const { user } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    router.push('/login')
  }

  // Get user initials for fallback
  const getInitials = () => {
    if (!user) return "?"
    const firstInitial = user.first_name?.[0] || ""
    const lastInitial = user.last_name?.[0] || ""
    return `${firstInitial}${lastInitial}`.toUpperCase()
  }

  // Get full name
  const getFullName = () => {
    if (!user) return "Loading..."
    const parts = [user.first_name, user.middle_name, user.last_name].filter(Boolean)
    return parts.join(" ")
  }

  return (
    <Sidebar variant="sidebar" collapsible="icon">
      <SidebarHeader className="border-b border-stone-200 pb-4">
        {open && (
          <SidebarMenuItem>
            <div className="flex justify-between items-start w-full px-2">
              <div className="flex-1">
                
                <h2 className="text-xl font-bold text-stone-900 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  NJ&apos;S Café
                </h2>
                <p className="text-xs text-stone-600 tracking-wide">& Restaurant</p>
              </div>
              {/* X button - hidden on mobile, visible on desktop */}
              <button
                onClick={() => setOpen(false)}
                className="hidden md:flex items-center gap-2 p-1.5 hover:bg-stone-100 rounded transition-colors"
              >
                <X className="h-4 w-4 text-stone-600" />
              </button>
            </div>
          </SidebarMenuItem>
        )}
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className={`transition-all ${open ? "px-5" : ""}`}>
              {!open && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <button
                      onClick={() => setOpen(true)}
                      className="flex items-center gap-2 w-full"
                    >
                      <PanelLeft />
                      <span>Toggle Sidebar</span>
                    </button>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage 
                      src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user?.id}`} 
                      alt={getFullName()} 
                    />
                    <AvatarFallback className="rounded-lg">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{getFullName()}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user?.email}
                    </span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage 
                        src={`https://api.dicebear.com/7.x/fun-emoji/svg?seed=${user?.id}`} 
                        alt={getFullName()} 
                      />
                      <AvatarFallback className="rounded-lg">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{getFullName()}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {user?.email}
                      </span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-xs text-muted-foreground cursor-default">
                  Role: <span className="font-semibold ml-1 capitalize">{user?.role}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}