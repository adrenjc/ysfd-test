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
import {
  createRolePermissionsMap,
  fetchPermissionManifest,
  PermissionsManifest,
  RolePermissionsMap,
} from "@/lib/permissions"

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  isInitialized: boolean
  permissionManifest: PermissionsManifest | null
  rolePermissions: RolePermissionsMap
}

interface AuthActions {
  initializeAuth: () => Promise<void>
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
  loadPermissionManifest: (
    force?: boolean
  ) => Promise<RolePermissionsMap | null>
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  isInitialized: false,
  permissionManifest: null,
  rolePermissions: {},
}

const resolveUserPermissions = (
  user: User | null,
  fallback?: User | null,
  rolePermissions?: RolePermissionsMap
) => {
  if (!user) return user

  if (user.permissions && user.permissions.length > 0) {
    return user
  }

  if (fallback?.permissions && fallback.permissions.length > 0) {
    return { ...user, permissions: fallback.permissions }
  }

  const rolePerms = rolePermissions?.[user.role] ?? []
  return { ...user, permissions: rolePerms ? [...rolePerms] : [] }
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
        loadPermissionManifest: async (force = false) => {
          const state = get()

          if (state.permissionManifest && !force) {
            return state.rolePermissions
          }

          const token =
            state.token ||
            (typeof window !== "undefined"
              ? localStorage.getItem(STORAGE_KEYS.TOKEN)
              : null)

          if (!token) {
            return state.rolePermissions
          }

          try {
            const manifest = await fetchPermissionManifest()
            const derivedRolePermissions = createRolePermissionsMap(manifest)

            set({
              permissionManifest: manifest,
              rolePermissions: derivedRolePermissions,
            })

            return derivedRolePermissions
          } catch (error) {
            console.error("Failed to load permission manifest:", error)
            return null
          }
        },

        initializeAuth: async () => {
          if (typeof window === "undefined") return

          const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
          const storedRefreshToken = localStorage.getItem(
            STORAGE_KEYS.REFRESH_TOKEN
          )
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

          if (!storedToken || !storedRefreshToken) {
            get().logout()
            return
          }

          await get().loadPermissionManifest()
          const rolePermissions = get().rolePermissions

          try {
            const payload = JSON.parse(atob(storedToken.split(".")[1]))
            const isExpired = payload.exp * 1000 < Date.now()
            if (isExpired) {
              get().logout()
              return
            }
          } catch (error) {
            console.error("JWT token parsing failed:", error)
            get().logout()
            return
          }

          let resolvedUser: User | null = null
          let storedUserParsed: User | null = null

          if (storedUser) {
            try {
              storedUserParsed = JSON.parse(storedUser)
              resolvedUser = storedUserParsed
            } catch (parseError) {
              console.warn(
                "Stored user payload corrupted, discarding",
                parseError
              )
              storedUserParsed = null
              resolvedUser = null
            }
          }

          try {
            const response = await fetch(buildApiUrl("/auth/me"), {
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            })

            if (response.ok) {
              const data = await response.json()
              const remoteUser = data?.data?.user as User | undefined
              if (remoteUser) {
                const normalizedRemote = resolveUserPermissions(
                  remoteUser,
                  storedUserParsed,
                  rolePermissions
                )
                resolvedUser = normalizedRemote
                localStorage.setItem(
                  STORAGE_KEYS.USER,
                  JSON.stringify(normalizedRemote)
                )
              }
            } else if (response.status === 401) {
              get().logout()
              return
            }
          } catch (error) {
            console.warn("Failed to refresh user profile on init:", error)
          }

          if (!resolvedUser) {
            get().logout()
            return
          }

          const normalizedUser = resolveUserPermissions(
            resolvedUser,
            storedUserParsed,
            rolePermissions
          )

          if (typeof window !== "undefined" && normalizedUser) {
            localStorage.setItem(
              STORAGE_KEYS.USER,
              JSON.stringify(normalizedUser)
            )
          }

          set({
            user: normalizedUser,
            token: storedToken,
            refreshToken: storedRefreshToken,
            isAuthenticated: true,
            isInitialized: true,
          })
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
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
              } else {
                set({ token: accessToken, refreshToken })
              }

              await get().loadPermissionManifest(true)
              const rolePermissions = get().rolePermissions
              const normalizedUser = resolveUserPermissions(
                user,
                undefined,
                rolePermissions
              )

              set({
                user: normalizedUser,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
                isInitialized: true,
              })

              if (typeof window !== "undefined") {
                localStorage.setItem(
                  STORAGE_KEYS.USER,
                  JSON.stringify(normalizedUser)
                )
              }

              return true
            }

            set({
              isLoading: false,
              error: data.message || "登录失败，请检查用户名或密码",
            })
            return false
          } catch (error) {
            console.error("Login error:", error)
            set({
              isLoading: false,
              error: "登录失败，请稍后再试",
            })
            return false
          } finally {
            set({ isInitialized: true })
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
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
              } else {
                set({ token: accessToken, refreshToken })
              }

              await get().loadPermissionManifest(true)
              const rolePermissions = get().rolePermissions
              const normalizedUser = resolveUserPermissions(
                user,
                undefined,
                rolePermissions
              )

              set({
                user: normalizedUser,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              if (typeof window !== "undefined") {
                localStorage.setItem(
                  STORAGE_KEYS.USER,
                  JSON.stringify(normalizedUser)
                )
              }

              return true
            }

            set({
              isLoading: false,
              error: data.message || "注册失败，请稍后再试",
            })
            return false
          } catch (error) {
            console.error("Register error:", error)
            set({
              isLoading: false,
              error: "注册失败，请稍后再试",
            })
            return false
          } finally {
            set({ isInitialized: true })
          }
        },

        logout: () => {
          set({ ...initialState, isInitialized: true })

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
            const response = await fetch(buildApiUrl("/auth/forgot-password"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email }),
            })

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
          const rolePermissions = get().rolePermissions
          const normalizedUser = resolveUserPermissions(
            user,
            undefined,
            rolePermissions
          )

          set({ user: normalizedUser })

          if (typeof window !== "undefined") {
            if (normalizedUser) {
              localStorage.setItem(
                STORAGE_KEYS.USER,
                JSON.stringify(normalizedUser)
              )
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

  const permissions = user?.permissions ?? []
  const role = user?.role

  const hasPermission = (permission: string): boolean => {
    if (!permission) return false
    return permissions.includes(permission)
  }

  const hasAnyPermission = (required: string[]): boolean => {
    if (!required || required.length === 0) return true
    return required.some(permission => hasPermission(permission))
  }

  const hasAllPermissions = (required: string[]): boolean => {
    if (!required || required.length === 0) return true
    return required.every(permission => hasPermission(permission))
  }

  const isAdmin = () => role === "admin"
  const isOperator = () => role === "operator"
  const isReviewer = () => role === "reviewer"
  const isViewer = () => role === "viewer"

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    permissions,
    role,
    isAdmin,
    isOperator,
    isReviewer,
    isViewer,
  }
}
