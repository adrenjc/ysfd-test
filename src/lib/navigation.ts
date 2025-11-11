import { SIDEBAR_ITEMS } from "@/components/layout/sidebar"
import { ROUTES } from "@/constants"

type FallbackParams = {
  permissions?: readonly string[]
  role?: string | null
}

export const resolveWorkspaceFallback = ({
  permissions,
  role,
}: FallbackParams) => {
  const permissionList = permissions ?? []

  const accessibleItem = SIDEBAR_ITEMS.find(item => {
    if (!item.href) return false

    const roleAllowed =
      !item.requiredRoles || (role ? item.requiredRoles.includes(role) : false)

    const permissionAllowed =
      !item.requiredPermissions ||
      item.requiredPermissions.some(permission =>
        permissionList.includes(permission)
      )

    return roleAllowed && permissionAllowed
  })

  return {
    route: accessibleItem?.href || ROUTES.LOGIN,
    hasAccessibleMenu: Boolean(accessibleItem),
  }
}
