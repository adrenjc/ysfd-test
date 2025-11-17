"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { Button, ScrollShadow, Tooltip, Chip } from "@nextui-org/react"
import {
  Package,
  RefreshCw,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  User,
  ListChecks,
  Brain,
} from "lucide-react"
import { useAuthStore, usePermissions } from "@/stores/auth"
import { useAppStore, useNotifications } from "@/stores/app"
import { ROUTES } from "@/constants"
import { cn } from "@/lib/utils"

import type { NavItem } from "@/types"

export const SIDEBAR_ITEMS: NavItem[] = [
  {
    key: "products",
    label: "商品管理",
    href: ROUTES.PRODUCTS,
    icon: <Package className="h-5 w-5" />,
    requiredPermissions: ["product.read"],
  },
  {
    key: "templates",
    label: "模板管理",
    href: "/dashboard/templates",
    icon: <ListChecks className="h-5 w-5" />,
    requiredPermissions: ["template.view"],
  },
  {
    key: "matching",
    label: "智能匹配",
    href: ROUTES.MATCHING,
    icon: <RefreshCw className="h-5 w-5" />,
    requiredPermissions: ["matching.create", "matching.review"],
  },
  {
    key: "memory",
    label: "记忆库",
    href: "/dashboard/memory",
    icon: <Brain className="h-5 w-5" />,
    requiredPermissions: ["matching.review", "matching.create"],
  },
  {
    key: "settings",
    label: "用户管理",
    href: ROUTES.SETTINGS,
    icon: <Settings className="h-5 w-5" />,
    requiredPermissions: ["system.config"],
  },
]

const SHOW_ACCOUNT_ACTIONS = false

interface SidebarProps {
  className?: string
}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout, user } = useAuthStore(state => ({
    logout: state.logout,
    user: state.user,
  }))
  const { sidebarCollapsed, toggleSidebar } = useAppStore()
  const { success: showSuccess } = useNotifications()
  const { hasAnyPermission, role, permissions } = usePermissions()

  const filteredNavigationItems = useMemo(() => {
    if (!user || permissions.length === 0) {
      return SIDEBAR_ITEMS
    }

    return SIDEBAR_ITEMS.filter(item => {
      const roleAllowed =
        !item.requiredRoles ||
        (role ? item.requiredRoles.includes(role) : false)

      const permissionAllowed =
        !item.requiredPermissions || hasAnyPermission(item.requiredPermissions)

      return roleAllowed && permissionAllowed
    })
  }, [hasAnyPermission, permissions.length, role, user])

  const handleLogout = () => {
    logout()
    showSuccess("退出成功", "您已安全退出系统")
    router.push(ROUTES.LOGIN)
  }

  const isActive = (href: string) => pathname.startsWith(href)

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href!)

    return (
      <Tooltip
        key={item.key}
        content={item.label}
        placement="right"
        isDisabled={!sidebarCollapsed}
      >
        <Button
          as={Link}
          href={item.href}
          variant={active ? "flat" : "light"}
          color={active ? "primary" : "default"}
          className={cn(
            "h-12 justify-start gap-3",
            sidebarCollapsed ? "w-12 min-w-12 px-0" : "w-full px-4",
            active && "bg-primary/10 text-primary"
          )}
          startContent={!sidebarCollapsed ? item.icon : undefined}
        >
          {sidebarCollapsed ? (
            <div className="flex w-full items-center justify-center">
              {item.icon}
            </div>
          ) : (
            <div className="flex w-full items-center justify-between">
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && (
                <Chip
                  size="sm"
                  variant="flat"
                  color={typeof item.badge === "string" ? "success" : "warning"}
                  className="ml-auto"
                >
                  {item.badge}
                </Chip>
              )}
            </div>
          )}
        </Button>
      </Tooltip>
    )
  }

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-r border-divider bg-background/60 backdrop-blur-md transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* 顶部 Logo 区域 */}
      <div className="flex h-16 items-center justify-between border-b border-divider px-4">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
              <RefreshCw className="h-4 w-4" />
            </div>
            <span className="text-lg font-semibold">SmartMatch</span>
          </div>
        )}
        <Button
          isIconOnly
          variant="light"
          size="sm"
          onPress={toggleSidebar}
          className="text-default-500"
          aria-label={sidebarCollapsed ? "展开侧边栏" : "收起侧边栏"}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* 导航菜单 */}
      <ScrollShadow className="flex-1 py-4">
        <nav className="flex flex-col gap-2 px-3">
          {filteredNavigationItems.map(renderNavItem)}
        </nav>
      </ScrollShadow>

      {/* 底部按钮 */}
      {SHOW_ACCOUNT_ACTIONS && (
        <div className="p-3">
          <div className="flex gap-2">
            <Tooltip
              content="个人设置"
              placement="top"
              isDisabled={!sidebarCollapsed}
            >
              <Button
                isIconOnly={sidebarCollapsed}
                variant="light"
                size="sm"
                className={cn(
                  "text-default-500",
                  sidebarCollapsed ? "w-full" : "flex-1"
                )}
                startContent={
                  !sidebarCollapsed ? <User className="h-4 w-4" /> : undefined
                }
                aria-label="个人设置"
              >
                {sidebarCollapsed ? <User className="h-4 w-4" /> : "设置"}
              </Button>
            </Tooltip>

            <Tooltip
              content="退出登录"
              placement="top"
              isDisabled={!sidebarCollapsed}
            >
              <Button
                isIconOnly={sidebarCollapsed}
                variant="light"
                size="sm"
                onPress={handleLogout}
                className={cn(
                  "text-danger",
                  sidebarCollapsed ? "w-full" : "flex-1"
                )}
                startContent={
                  !sidebarCollapsed ? <LogOut className="h-4 w-4" /> : undefined
                }
                aria-label="退出登录"
              >
                {sidebarCollapsed ? <LogOut className="h-4 w-4" /> : "退出"}
              </Button>
            </Tooltip>
          </div>
        </div>
      )}
    </aside>
  )
}
