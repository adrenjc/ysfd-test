import { apiGet } from "@/lib/api"

type PermissionDefinition = {
  category: string
  description: string
}

export type PermissionsManifest = {
  permissions: Record<string, PermissionDefinition>
  roles: Record<string, string[]>
}

export type RolePermissionsMap = Readonly<Record<string, readonly string[]>>

type ManifestResponse = {
  success: boolean
  data: PermissionsManifest
  message?: string
}

export const fetchPermissionManifest =
  async (): Promise<PermissionsManifest> => {
    const response = await apiGet<ManifestResponse>(
      "/auth/permissions/manifest"
    )

    if (!response?.success || !response.data) {
      throw new Error(response?.message || "Failed to load permission manifest")
    }

    return response.data
  }

export const createRolePermissionsMap = (
  manifest?: PermissionsManifest | null
): RolePermissionsMap => {
  if (!manifest?.roles) {
    return {}
  }

  return Object.freeze(
    Object.fromEntries(
      Object.entries(manifest.roles).map(([role, permissions]) => [
        role,
        Object.freeze([...permissions]),
      ])
    )
  ) as RolePermissionsMap
}
