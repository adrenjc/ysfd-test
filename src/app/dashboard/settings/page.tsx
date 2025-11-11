"use client"

import { useEffect, useMemo, useState } from "react"
import useSWR from "swr"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
  Spacer,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Spinner,
} from "@nextui-org/react"
import {
  Users,
  Plus,
  MoreVertical,
  Mail,
  Smartphone,
  Shield,
  UserPlus,
  Check,
  Ban,
  ArrowUpRight,
} from "lucide-react"
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from "@/lib/api"
import { useNotifications } from "@/stores/app"
import { formatDate, cn } from "@/lib/utils"
import type { AdminUser, AdminUserStatus, UserListResponse } from "@/types"

type UserRole = AdminUser["role"]
type RoleFilter = "all" | UserRole
type StatusFilter = "all" | AdminUserStatus

interface UserFormState {
  name: string
  username: string
  email: string
  phone: string
  role: UserRole
  password: string
}

type UserActionType = "create" | "edit" | "status" | "delete"

const avatarColors = [
  "bg-blue-50 text-blue-600",
  "bg-emerald-50 text-emerald-600",
  "bg-orange-50 text-orange-600",
  "bg-violet-50 text-violet-600",
  "bg-rose-50 text-rose-600",
]

const getAvatarColor = (key: string) => {
  const hash = Array.from(key).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0
  )
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const getAvatarText = (user: AdminUser) => {
  const base = (user.name || user.username || "").trim()
  if (!base) return "NA"
  if (/^[\u4e00-\u9fa5]/.test(base)) {
    return base.slice(0, 2)
  }
  return base.slice(0, 2).toUpperCase()
}

const roleMap: Record<
  UserRole,
  { label: string; color: "danger" | "warning" | "primary" }
> = {
  admin: { label: "管理员", color: "danger" },
  reviewer: { label: "审核员", color: "warning" },
  operator: { label: "操作员", color: "primary" },
  viewer: { label: "访客", color: "primary" },
}

const statusMap: Record<
  AdminUserStatus,
  { label: string; color: "success" | "default"; icon: typeof Check }
> = {
  active: { label: "启用", color: "success", icon: Check },
  inactive: { label: "禁用", color: "default", icon: Ban },
}

const roleOptions: Array<{ key: RoleFilter; label: string }> = [
  { key: "all", label: "全部角色" },
  { key: "admin", label: "管理员" },
  { key: "reviewer", label: "审核员" },
  { key: "operator", label: "操作员" },
  { key: "viewer", label: "访客" },
]

const statusOptions: Array<{ key: StatusFilter; label: string }> = [
  { key: "all", label: "全部状态" },
  { key: "active", label: "启用" },
  { key: "inactive", label: "禁用" },
]

const userColumns = [
  { key: "name", label: "用户" },
  { key: "email", label: "联系方式" },
  { key: "role", label: "角色" },
  { key: "status", label: "状态" },
  { key: "lastLoginAt", label: "最后登录" },
  { key: "actions", label: "操作" },
]

const defaultFormState: UserFormState = {
  name: "",
  username: "",
  email: "",
  phone: "",
  role: "operator",
  password: "",
}

type ApiResponse<T> = {
  success: boolean
  data: T
  message?: string
}

const fetchUsers = async (
  _: string,
  params: Record<string, string | undefined>
) => {
  const response = await apiGet<ApiResponse<UserListResponse>>("/users", params)
  if (!response.success) {
    throw new Error(response.message || "获取用户列表失败")
  }

  return response.data
}

export default function UserManagementPage() {
  const [searchValue, setSearchValue] = useState("")
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [formState, setFormState] = useState<UserFormState>(defaultFormState)
  const [modalType, setModalType] = useState<UserActionType>("create")
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debouncedSearch = useDebounce(searchValue)
  const { success: notifySuccess, error: notifyError } = useNotifications()
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure()

  const queryParams = useMemo(() => {
    return {
      search: debouncedSearch || undefined,
      role: roleFilter === "all" ? undefined : roleFilter,
      status: statusFilter === "all" ? undefined : statusFilter,
    }
  }, [debouncedSearch, roleFilter, statusFilter])

  const {
    data,
    isLoading,
    mutate,
    error: fetchError,
  } = useSWR(
    ["users", queryParams],
    ([, params]) => fetchUsers("users", params),
    {
      keepPreviousData: true,
    }
  )

  useEffect(() => {
    if (fetchError) {
      notifyError("加载失败", fetchError.message)
    }
  }, [fetchError, notifyError])

  const items = data?.items ?? []
  const total = data?.total ?? 0

  const summary = useMemo(() => {
    const active = items.filter(item => item.status === "active").length
    const adminCount = items.filter(item => item.role === "admin").length
    return { total, active, adminCount }
  }, [items, total])

  const handleUserAction = (type: UserActionType, user?: AdminUser) => {
    if (type === "delete" && user?.isProtected) {
      notifyError("无法删除", "该账号为系统保护账号")
      return
    }

    setModalType(type)
    if (user) {
      setSelectedUser(user)
      setFormState({
        name: user.name,
        username: user.username,
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        password: "",
      })
    } else {
      setSelectedUser(null)
      setFormState(defaultFormState)
    }
    onOpen()
  }

  const handleModalClose = () => {
    setFormState(defaultFormState)
    setSelectedUser(null)
    onClose()
  }

  const handleSubmit = async () => {
    if (modalType !== "create" && !selectedUser) return

    setIsSubmitting(true)
    try {
      if (modalType === "create") {
        const payload = {
          username: formState.username.trim(),
          name: formState.name.trim(),
          password: formState.password,
          role: formState.role,
          email: formState.email.trim() || undefined,
          phone: formState.phone.trim() || undefined,
        }
        const response = await apiPost<ApiResponse<AdminUser>>(
          "/users",
          payload
        )
        if (!response.success) {
          throw new Error(response.message || "创建用户失败")
        }
        notifySuccess("创建成功", "新用户已创建")
      } else if (modalType === "edit" && selectedUser) {
        const payload: Record<string, unknown> = {
          name: formState.name.trim(),
          email: formState.email.trim(),
          phone: formState.phone.trim(),
          role: formState.role,
        }
        if (formState.password) {
          payload.password = formState.password
        }
        const response = await apiPut<ApiResponse<AdminUser>>(
          `/users/${selectedUser.id}`,
          payload
        )
        if (!response.success) {
          throw new Error(response.message || "更新用户失败")
        }
        notifySuccess("更新成功", "用户信息已更新")
      } else if (modalType === "status" && selectedUser) {
        const response = await apiPatch<ApiResponse<AdminUser>>(
          `/users/${selectedUser.id}/status`,
          {
            isActive: selectedUser.status !== "active",
          }
        )
        if (!response.success) {
          throw new Error(response.message || "更新状态失败")
        }
        notifySuccess(
          "操作成功",
          selectedUser.status === "active" ? "用户已被禁用" : "用户已启用"
        )
      } else if (modalType === "delete" && selectedUser) {
        const response = await apiDelete<ApiResponse<{ id: string }>>(
          `/users/${selectedUser.id}`
        )
        if (!response.success) {
          throw new Error(response.message || "删除用户失败")
        }
        notifySuccess("删除成功", "账号已删除")
      }

      await mutate()
      handleModalClose()
    } catch (error) {
      notifyError(
        "操作失败",
        error instanceof Error ? error.message : "请稍后再试"
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderUserCell = (item: AdminUser, columnKey: string) => {
    switch (columnKey) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium",
                getAvatarColor(item.username)
              )}
            >
              {getAvatarText(item)}
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                {item.name}
              </span>
              <span className="text-xs text-default-500">{item.username}</span>
            </div>
          </div>
        )
      case "email":
        return (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1 text-sm">
              <Mail className="h-3.5 w-3.5 text-default-400" />
              <span>{item.email || "未填写"}</span>
            </div>
            {item.phone && (
              <div className="flex items-center gap-1 text-xs text-default-400">
                <Smartphone className="h-3 w-3" />
                <span>{item.phone}</span>
              </div>
            )}
          </div>
        )
      case "role":
        return (
          <Chip
            color={roleMap[item.role].color}
            size="sm"
            variant="flat"
            startContent={<Shield className="h-3 w-3" />}
          >
            {roleMap[item.role].label}
          </Chip>
        )
      case "status": {
        const config = statusMap[item.status]
        const Icon = config.icon
        return (
          <Chip
            size="sm"
            color={config.color}
            variant="flat"
            startContent={<Icon className="h-3 w-3" />}
          >
            {config.label}
          </Chip>
        )
      }
      case "lastLoginAt": {
        const lastLogin = item.lastLoginAt
          ? formatDate(item.lastLoginAt)
          : "暂无记录"
        const createdAt = formatDate(item.createdAt)
        return (
          <div className="flex flex-col">
            <span className="text-sm">{lastLogin}</span>
            <span className="text-xs text-default-400">创建于 {createdAt}</span>
          </div>
        )
      }
      case "actions":
        return (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                isIconOnly
                variant="light"
                size="sm"
                className="text-default-400"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="用户操作菜单">
              <DropdownItem
                key="edit"
                startContent={<UserPlus className="h-4 w-4" />}
                onPress={() => handleUserAction("edit", item)}
              >
                编辑信息
              </DropdownItem>
              <DropdownItem
                key="status"
                startContent={
                  item.status === "active" ? (
                    <Ban className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )
                }
                onPress={() => handleUserAction("status", item)}
              >
                {item.status === "active" ? "禁用账号" : "启用账号"}
              </DropdownItem>
              {!item.isProtected ? (
                <DropdownItem
                  key="delete"
                  className="text-danger"
                  color="danger"
                  startContent={<Ban className="h-4 w-4" />}
                  onPress={() => handleUserAction("delete", item)}
                >
                  删除账号
                </DropdownItem>
              ) : null}
            </DropdownMenu>
          </Dropdown>
        )
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">用户管理</h1>
            <p className="text-sm text-default-500">
              统一管理平台成员、权限与账号状态
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card shadow="sm" className="border border-default-200">
          <CardBody className="flex flex-row items-center gap-3">
            <Avatar
              size="sm"
              className="bg-primary text-white"
              name={summary.total.toString()}
            />
            <div className="flex flex-col">
              <span className="text-xs text-default-500">成员总数</span>
              <span className="text-lg font-semibold">{summary.total}</span>
            </div>
            <ArrowUpRight className="ml-auto h-4 w-4 text-default-400" />
          </CardBody>
        </Card>
        <Card shadow="sm" className="border border-default-200">
          <CardBody className="flex flex-row items-center gap-3">
            <Avatar
              size="sm"
              className="bg-success text-white"
              name={summary.active.toString()}
            />
            <div className="flex flex-col">
              <span className="text-xs text-default-500">启用账号</span>
              <span className="text-lg font-semibold">{summary.active}</span>
            </div>
            <Check className="ml-auto h-4 w-4 text-success" />
          </CardBody>
        </Card>
        <Card shadow="sm" className="border border-default-200">
          <CardBody className="flex flex-row items-center gap-3">
            <Avatar
              size="sm"
              className="bg-danger text-white"
              name={summary.adminCount.toString()}
            />
            <div className="flex flex-col">
              <span className="text-xs text-default-500">管理员数量</span>
              <span className="text-lg font-semibold">
                {summary.adminCount}
              </span>
            </div>
            <Shield className="ml-auto h-4 w-4 text-danger" />
          </CardBody>
        </Card>
      </div>

      <Card shadow="sm" className="border border-default-200">
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">用户列表</h2>
            <p className="text-sm text-default-500">
              支持按照角色、状态过滤，并可快速搜索账号信息
            </p>
          </div>
          <Button
            color="primary"
            startContent={<Plus className="h-4 w-4" />}
            onPress={() => handleUserAction("create")}
          >
            新建用户
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <Input
              value={searchValue}
              onValueChange={setSearchValue}
              placeholder="搜索姓名、账号或邮箱"
              startContent={<Users className="h-4 w-4 text-default-400" />}
              className="md:max-w-xs"
            />
            <Select
              selectedKeys={[roleFilter]}
              onSelectionChange={keys =>
                setRoleFilter(Array.from(keys)[0] as RoleFilter)
              }
              className="md:w-40"
              size="sm"
            >
              {roleOptions.map(option => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
            <Select
              selectedKeys={[statusFilter]}
              onSelectionChange={keys =>
                setStatusFilter(Array.from(keys)[0] as StatusFilter)
              }
              className="md:w-40"
              size="sm"
            >
              {statusOptions.map(option => (
                <SelectItem key={option.key}>{option.label}</SelectItem>
              ))}
            </Select>
            <Spacer x={2} className="hidden md:block" />
            <Badge variant="flat" color="primary">
              当前显示 {items.length} 人
            </Badge>
          </div>

          <Table
            aria-label="用户管理表格"
            className="bg-transparent"
            removeWrapper
            isStriped
          >
            <TableHeader columns={userColumns}>
              {column => (
                <TableColumn key={column.key} className="bg-default-50 text-xs">
                  {column.label}
                </TableColumn>
              )}
            </TableHeader>
            <TableBody
              emptyContent={
                isLoading
                  ? "加载中..."
                  : fetchError
                    ? "加载失败，请稍后重试"
                    : "暂无匹配的用户"
              }
              items={items}
              isLoading={isLoading}
              loadingContent={<Spinner size="sm" />}
            >
              {item => (
                <TableRow key={item.id}>
                  {columnKey => (
                    <TableCell>
                      {renderUserCell(item, String(columnKey))}
                    </TableCell>
                  )}
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardBody>
      </Card>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            {modalType === "create" && "新建用户"}
            {modalType === "edit" && "编辑用户"}
            {modalType === "status" &&
              `${selectedUser?.status === "active" ? "禁用" : "启用"}用户`}
            {modalType === "delete" && "删除用户"}
          </ModalHeader>
          <ModalBody className="space-y-4">
            {modalType === "status" ? (
              <div className="space-y-3">
                <p className="text-sm text-default-600">
                  确认要
                  {selectedUser?.status === "active" ? "禁用" : "启用"}账号
                  <span className="font-medium text-foreground">
                    {" "}
                    {selectedUser?.name}
                  </span>
                  吗？
                </p>
                <p className="text-xs text-default-400">
                  {selectedUser?.status === "active"
                    ? "禁用后该用户将无法登录系统，已分配的任务仍会保留。"
                    : "启用后该用户将恢复登录权限，请确保其角色配置正确。"}
                </p>
              </div>
            ) : (
              <>
                <Input
                  label="姓名"
                  placeholder="请输入用户姓名"
                  value={formState.name}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, name: value }))
                  }
                />
                <Input
                  label="账号"
                  placeholder="请输入登录账号"
                  value={formState.username}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, username: value }))
                  }
                  isDisabled={modalType === "edit"}
                />
                <Input
                  label="邮箱"
                  type="email"
                  placeholder="name@example.com"
                  value={formState.email}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, email: value }))
                  }
                />
                <Input
                  label="手机号"
                  type="tel"
                  placeholder="可选填"
                  value={formState.phone}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, phone: value }))
                  }
                />
                <Select
                  label="角色"
                  selectedKeys={[formState.role]}
                  onSelectionChange={keys =>
                    setFormState(prev => ({
                      ...prev,
                      role: Array.from(keys)[0] as UserRole,
                    }))
                  }
                >
                  <SelectItem key="admin">管理员</SelectItem>
                  <SelectItem key="reviewer">审核员</SelectItem>
                  <SelectItem key="operator">操作员</SelectItem>
                  <SelectItem key="viewer">访客</SelectItem>
                </Select>
                <Input
                  label={
                    modalType === "create" ? "初始密码" : "重置密码（可选）"
                  }
                  type="password"
                  placeholder={
                    modalType === "create"
                      ? "请输入至少 6 位密码"
                      : "如需重置请输入新密码"
                  }
                  value={formState.password}
                  onValueChange={value =>
                    setFormState(prev => ({ ...prev, password: value }))
                  }
                  isRequired={modalType === "create"}
                />
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={handleModalClose}>
              取消
            </Button>
            <Button
              color="primary"
              isLoading={isSubmitting}
              onPress={handleSubmit}
            >
              确认
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}
