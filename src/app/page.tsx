"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useAuthStore, usePermissions } from "@/stores/auth"
import { ROUTES } from "@/constants"
import { Spinner, Button, Card, CardBody } from "@nextui-org/react"
import { resolveWorkspaceFallback } from "@/lib/navigation"

// 开发模式配置
const DEV_MODE = process.env.NODE_ENV === "development"
const SKIP_AUTH = process.env.NEXT_PUBLIC_SKIP_AUTH === "true"

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, token, logout, isInitialized, rolePermissions } =
    useAuthStore()
  const { permissions, role } = usePermissions()
  const { route: fallbackRoute, hasAccessibleMenu } = useMemo(
    () => resolveWorkspaceFallback({ permissions, role }),
    [permissions, role]
  )

  // 开发模式自动登录
  const handleDevLogin = () => {
    console.log("开发模式登录被点击")
    try {
      const mockUser = {
        id: "dev-user-1",
        username: "开发者",
        email: "dev@example.com",
        role: "admin" as const,
        permissions: rolePermissions.admin ?? [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 开发环境和生产环境都需要正常登录流程

      console.log("开发模式登录状态设置完成，准备跳转")
      router.push(ROUTES.PRODUCTS)
    } catch (error) {
      console.error("开发模式登录失败:", error)
    }
  }

  const handleNormalLogin = () => {
    console.log("正常登录被点击")
    router.push(ROUTES.LOGIN)
  }

  useEffect(() => {
    if (!isInitialized) return

    // ����ģʽ
    if (DEV_MODE) {
      // 1) ����������֤ʱ���Զ���¼
      if (SKIP_AUTH && !isAuthenticated) {
        handleDevLogin()
        return
      }
      // 2) ����ģʽ����������֤ʱ��չʾѡ����棬�����κ��ض���
      if (!SKIP_AUTH && !isAuthenticated) {
        return
      }
    }

    // �ǿ���ģʽ���ѵ�¼����������������̴���
    if (isAuthenticated && token) {
      if (hasAccessibleMenu) {
        router.replace(fallbackRoute)
      } else {
        logout()
        router.replace(ROUTES.LOGIN)
      }
      return
    }

    router.replace(ROUTES.LOGIN)
  }, [
    fallbackRoute,
    hasAccessibleMenu,
    isAuthenticated,
    isInitialized,
    logout,
    router,
    token,
  ])

  // 开发模式显示选择界面
  if (DEV_MODE && !isAuthenticated && !SKIP_AUTH) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
        <Card className="w-full max-w-md shadow-lg">
          <CardBody className="space-y-6 p-8 text-center">
            <div>
              <h1 className="mb-2 text-2xl font-bold">开发模式</h1>
              <p className="text-sm text-default-500">选择进入系统的方式</p>
            </div>

            <div className="space-y-4">
              <Button
                color="primary"
                size="lg"
                className="w-full"
                onPress={handleDevLogin}
              >
                🚀 跳过登录 (开发模式)
              </Button>

              <Button
                variant="flat"
                size="lg"
                className="w-full"
                onPress={handleNormalLogin}
              >
                🔐 正常登录
              </Button>
            </div>

            <div className="space-y-1 text-xs text-default-400">
              <p>开发模式测试账户：</p>
              <p>用户名: admin</p>
              <p>密码: admin123</p>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}
