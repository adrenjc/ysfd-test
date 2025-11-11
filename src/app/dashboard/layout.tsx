"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button, Spinner } from "@nextui-org/react"
import { useAppStore } from "@/stores/app"
import { Sidebar, SIDEBAR_ITEMS } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"
import { useAuthStore, usePermissions } from "@/stores/auth"
import { ROUTES } from "@/constants"
import { resolveWorkspaceFallback } from "@/lib/navigation"

interface DashboardLayoutProps {
  children: React.ReactNode
}

type RouteGuard = {
  path: string
  permissions?: string[]
  roles?: string[]
}

const sidebarRouteGuards: RouteGuard[] = SIDEBAR_ITEMS.filter(item =>
  Boolean(item.href)
).map(item => ({
  path: item.href as string,
  permissions: item.requiredPermissions,
  roles: item.requiredRoles,
}))

const additionalRouteGuards: RouteGuard[] = [
  { path: ROUTES.REVIEW, permissions: ["matching.review"] },
  { path: ROUTES.PRICES, permissions: ["price.read"] },
  { path: ROUTES.REPORTS, permissions: ["report.read"] },
]

const ROUTE_GUARDS: RouteGuard[] = [
  ...sidebarRouteGuards,
  ...additionalRouteGuards,
]

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppStore()
  const { isAuthenticated, logout, isInitialized } = useAuthStore()
  const { hasAnyPermission, role, permissions } = usePermissions()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!isInitialized) return
    if (!isAuthenticated) {
      router.replace(ROUTES.LOGIN)
    }
  }, [isAuthenticated, isInitialized, router])

  const routeGuard = useMemo(
    () => ROUTE_GUARDS.find(guard => pathname.startsWith(guard.path)),
    [pathname]
  )

  const permissionsAllowed =
    !routeGuard?.permissions ||
    routeGuard.permissions.length === 0 ||
    hasAnyPermission(routeGuard.permissions)

  const roleAllowed =
    !routeGuard?.roles ||
    routeGuard.roles.length === 0 ||
    (role ? routeGuard.roles.includes(role) : false)

  const isAdmin = role === "admin"
  const hasAccess = isAdmin || (permissionsAllowed && roleAllowed)

  const { route: fallbackRoute, hasAccessibleMenu } = useMemo(
    () => resolveWorkspaceFallback({ permissions, role }),
    [permissions, role]
  )

  const handleBackToWorkspace = () => {
    if (hasAccessibleMenu) {
      const target = fallbackRoute || ROUTES.HOME
      if (pathname !== target) {
        router.replace(target)
        return
      }

      if (pathname !== ROUTES.HOME) {
        router.replace(ROUTES.HOME)
      }
      return
    }

    logout()
    router.replace(ROUTES.LOGIN)
  }

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <h2 className="text-2xl font-semibold text-foreground">
            暂无访问权限
          </h2>
          <p className="text-sm text-default-500">
            当前账号无法访问该页面，请联系管理员调整角色或权限配置。
          </p>
          <Button color="primary" onPress={handleBackToWorkspace}>
            {hasAccessibleMenu ? "返回工作台" : "重新安全登录"}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Workspace */}
        <main
          className={`flex-1 overflow-auto p-6 transition-all duration-300 ${
            sidebarCollapsed ? "ml-0" : "ml-0"
          }`}
        >
          <div className="mx-auto h-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
