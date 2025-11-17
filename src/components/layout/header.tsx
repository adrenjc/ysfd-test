"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Badge,
  Avatar,
} from "@nextui-org/react"
import { Bell, Settings, User, LogOut, Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/stores/auth"
import { useAppStore, useNotifications } from "@/stores/app"
import { formatDate } from "@/lib/utils"
import { ROUTES } from "@/constants"

interface HeaderProps {
  title?: string
  className?: string
}

const ROLE_LABELS: Record<string, string> = {
  admin: "管理员",
  reviewer: "审核员",
  operator: "操作员",
  viewer: "访客",
}

const formatRoleLabel = (role?: string) => ROLE_LABELS[role ?? ""] ?? "未知角色"

export function Header({ title, className }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const { notifications } = useAppStore()
  const { success: showSuccess } = useNotifications()

  const unreadNotifications = useMemo(
    () => notifications.filter(n => !n.read),
    [notifications]
  )

  const profileDescription = useMemo(() => {
    const roleText = formatRoleLabel(user?.role)
    const userId = (user as any)?.id || (user as any)?._id
    if (!userId) return roleText
    return `ID ${String(userId).slice(-6).toUpperCase()} · ${roleText}`
  }, [user])

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    showSuccess("主题已切换", `当前使用${getThemeLabel(newTheme)}模式`)
  }

  const getThemeLabel = (value: string) => {
    switch (value) {
      case "light":
        return "浅色"
      case "dark":
        return "深色"
      case "system":
        return "系统"
      default:
        return "未知"
    }
  }

  const handleLogout = () => {
    logout()
    showSuccess("退出成功", "您已安全退出系统")
    router.push(ROUTES.LOGIN)
  }

  return (
    <Navbar
      maxWidth="full"
      className={className}
      classNames={{
        wrapper: "px-4",
        content: "gap-4",
      }}
    >
      <NavbarContent justify="start">
        {title && (
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        )}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                aria-label="切换主题"
              >
                {theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              selectedKeys={[theme || "system"]}
              onAction={key => handleThemeChange(key as string)}
            >
              <DropdownItem
                key="light"
                startContent={<Sun className="h-4 w-4" />}
              >
                浅色模式
              </DropdownItem>
              <DropdownItem
                key="dark"
                startContent={<Moon className="h-4 w-4" />}
              >
                深色模式
              </DropdownItem>
              <DropdownItem
                key="system"
                startContent={<Monitor className="h-4 w-4" />}
              >
                跟随系统
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>

        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                aria-label="通知中心"
              >
                <Badge
                  content={unreadNotifications.length || ""}
                  color="danger"
                  isInvisible={unreadNotifications.length === 0}
                  shape="circle"
                >
                  <Bell className="h-4 w-4" />
                </Badge>
              </Button>
            </DropdownTrigger>
            <DropdownMenu className="w-80">
              {notifications.length === 0 ? (
                <DropdownItem key="empty" className="text-center opacity-50">
                  暂无通知
                </DropdownItem>
              ) : (
                <>
                  {notifications.slice(0, 5).map(notification => (
                    <DropdownItem
                      key={notification.id}
                      className="py-3"
                      description={formatDate(notification.timestamp)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {notification.title}
                        </span>
                        <span className="text-sm text-default-500">
                          {notification.message}
                        </span>
                      </div>
                    </DropdownItem>
                  ))}
                  {notifications.length > 5 && (
                    <DropdownItem
                      key="more"
                      className="text-center text-primary"
                    >
                      查看全部通知
                    </DropdownItem>
                  )}
                </>
              )}
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>

        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                size="sm"
                name={user?.username?.charAt(0).toUpperCase()}
                className="cursor-pointer"
                showFallback
              />
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="profile"
                className="py-2"
                description={profileDescription}
                startContent={<User className="h-4 w-4" />}
              >
                <span className="font-medium">
                  {user?.name || user?.username || "Unknown"}
                </span>
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<Settings className="h-4 w-4" />}
              >
                个人设置
              </DropdownItem>
              <DropdownItem
                key="logout"
                className="text-danger"
                color="danger"
                startContent={<LogOut className="h-4 w-4" />}
                onPress={handleLogout}
              >
                退出登录
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  )
}
