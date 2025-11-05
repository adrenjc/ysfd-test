import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type {
  User,
  LoginCredentials,
  AuthResponse,
  RegisterPayload,
  ForgotPasswordPayload,
} from "@/types"
import { STORAGE_KEYS } from "@/constants"
import { buildApiUrl } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  initializeAuth: () => void
  login: (credentials: LoginCredentials) => Promise<boolean>
  register: (payload: RegisterPayload) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>
  requestPasswordReset: (
    payload: ForgotPasswordPayload
  ) => Promise<{ success: boolean; message: string }>
  clearError: () => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

const persistConfig = {
  name: "auth-storage",
  partialize: (state: AuthStore) => ({
    user: state.user,
    token: state.token,
    refreshToken: state.refreshToken,
    isAuthenticated: state.isAuthenticated,
  }),
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        initializeAuth: () => {
          if (typeof window === "undefined") return

          const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
          const storedRefreshToken = localStorage.getItem(
            STORAGE_KEYS.REFRESH_TOKEN
          )
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

          if (!storedToken || !storedRefreshToken || !storedUser) return

          try {
            const user = JSON.parse(storedUser)

            try {
              const tokenPayload = JSON.parse(atob(storedToken.split(".")[1]))
              const isExpired = tokenPayload.exp * 1000 < Date.now()

              if (isExpired) {
                get().logout()
                return
              }

              set({
                user,
                token: storedToken,
                refreshToken: storedRefreshToken,
                isAuthenticated: true,
              })
            } catch (tokenError) {
              console.error("JWT token parsing failed:", tokenError)
              get().logout()
            }
          } catch (error) {
            console.error("Auth initialization failed:", error)
            get().logout()
          }
        },

        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(buildApiUrl("/auth/login"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(credentials),
            })

            const data: AuthResponse = await response.json()

            if (response.ok && data.success && data.data) {
              const { user, tokens } = data.data
              const { accessToken, refreshToken } = tokens

              set({
                user,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
              }

              return true
            }

            set({
              isLoading: false,
              error: data.message || "登录失败，请检查用户名和密码",
            })
            return false
          } catch (error) {
            console.error("Login error:", error)
            set({
              isLoading: false,
              error: "登录失败，请稍后重试",
            })
            return false
          }
        },

        register: async (payload: RegisterPayload) => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(buildApiUrl("/auth/register"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })

            const data: AuthResponse = await response.json()

            if (response.ok && data.success && data.data) {
              const { user, tokens } = data.data
              const { accessToken, refreshToken } = tokens

              set({
                user,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
              }

              return true
            }

            set({
              isLoading: false,
              error: data.message || "注册失败，请稍后重试",
            })
            return false
          } catch (error) {
            console.error("Register error:", error)
            set({
              isLoading: false,
              error: "注册失败，请稍后重试",
            })
            return false
          }
        },

        logout: () => {
          set({ ...initialState })

          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.TOKEN)
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.USER)
          }
        },

        refreshAuth: async () => {
          const { refreshToken } = get()
          if (!refreshToken) return false

          try {
            const response = await fetch(buildApiUrl("/auth/refresh"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ refreshToken }),
            })

            const data: AuthResponse = await response.json()

            if (data.success && data.data) {
              const { accessToken, refreshToken: newRefreshToken } =
                data.data.tokens

              set({
                token: accessToken,
                refreshToken: newRefreshToken,
                error: null,
              })

              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(
                  STORAGE_KEYS.REFRESH_TOKEN,
                  newRefreshToken
                )
              }

              return true
            }

            get().logout()
            return false
          } catch (error) {
            console.error("Refresh auth error:", error)
            get().logout()
            return false
          }
        },

        requestPasswordReset: async ({
          email,
        }: ForgotPasswordPayload): Promise<{
          success: boolean
          message: string
        }> => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(
              buildApiUrl("/auth/forgot-password"),
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
              }
            )

            const data = await response.json()

            if (response.ok && data.success) {
              set({ isLoading: false, error: null })
              return {
                success: true,
                message: data.message || "重置链接已发送，请检查邮箱",
              }
            }

            const message = data.message || "请求失败，请稍后再试"
            set({ isLoading: false, error: message })
            return { success: false, message }
          } catch (error) {
            console.error("Forgot password error:", error)
            const message = "请求失败，请检查网络或稍后重试"
            set({ isLoading: false, error: message })
            return { success: false, message }
          }
        },

        clearError: () => {
          set({ error: null })
        },

        setUser: (user: User | null) => {
          set({ user })

          if (typeof window !== "undefined") {
            if (user) {
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
            } else {
              localStorage.removeItem(STORAGE_KEYS.USER)
            }
          }
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },
      }),
      persistConfig
    ),
    { name: "auth-store" }
  )
)

export const usePermissions = () => {
  const user = useAuthStore(state => state.user)

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false
    return permissions.some(permission => user.permissions.includes(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false
    return permissions.every(permission =>
      user.permissions.includes(permission)
    )
  }

  const isAdmin = () => user?.role === "admin"
  const isOperator = () => user?.role === "operator"
  const isReviewer = () => user?.role === "reviewer"

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isOperator,
    isReviewer,
  }
}

