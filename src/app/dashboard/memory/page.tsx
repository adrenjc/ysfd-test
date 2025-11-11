"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Input,
  Pagination,
  Progress,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Badge,
  Tooltip,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
} from "@nextui-org/react"
import {
  Search,
  Filter,
  Edit,
  Trash2,
  Brain,
  TrendingUp,
  Users,
  Clock,
  Star,
  AlertTriangle,
  Check,
  X,
  RefreshCw,
  BarChart3,
  Archive,
  Package,
  Info,
  HelpCircle,
  ArrowRight,
  CheckCircle,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { useNotifications } from "@/stores/app"
import { usePermissions } from "@/stores/auth"
import { buildApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"
import { MatchingMemory } from "@/types"

// 接口定义
interface ProductTemplate {
  _id?: string
  id?: string
  name: string
  isDefault?: boolean
}

// 状态芯片组件
const StatusChip = ({ status }: { status: string }) => {
  const config = {
    active: { color: "success" as const, label: "活跃", icon: "✅" },
    deprecated: { color: "warning" as const, label: "已废弃", icon: "📦" },
    conflicted: { color: "danger" as const, label: "冲突", icon: "⚠️" },
  }

  const { color, label, icon } =
    config[status as keyof typeof config] || config.active

  return (
    <Chip variant="flat" color={color} size="sm">
      {icon} {label}
    </Chip>
  )
}

// 来源芯片组件
// 原始匹配类型显示组件
const MatchTypeChip = ({ matchType }: { matchType?: string }) => {
  const config = {
    auto: { color: "primary" as const, label: "自动匹配" },
    memory: { color: "success" as const, label: "记忆匹配" },
    manual: { color: "warning" as const, label: "手动匹配" },
    unknown: { color: "default" as const, label: "未知类型" },
  }

  const { color, label } =
    config[matchType as keyof typeof config] || config.unknown

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

// 学习方式显示组件（用于筛选器）
const LearningMethodChip = ({ source }: { source: string }) => {
  const config = {
    manual: { color: "secondary" as const, label: "手动学习" },
    expert: { color: "warning" as const, label: "专家验证" },
    imported: { color: "primary" as const, label: "批量导入" },
    migrated: { color: "default" as const, label: "数据迁移" },
  }

  const { color, label } =
    config[source as keyof typeof config] || config.manual

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

// 置信度显示组件
const TrustScoreDisplay = ({
  score,
  isHighTrust,
}: {
  score: number
  isHighTrust: boolean
}) => {
  const getColor = (score: number) => {
    if (score >= 90) return "success"
    if (score >= 70) return "warning"
    return "danger"
  }

  const formattedScore = typeof score === "number" ? Math.round(score) : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold">{formattedScore}%</span>
        {isHighTrust && <Star className="h-3 w-3 text-warning" />}
      </div>
      <Progress
        value={formattedScore}
        size="sm"
        color={getColor(formattedScore)}
        className="w-16"
      />
    </div>
  )
}

export default function MemoryManagementPage() {
  // 状态管理
  const [memories, setMemories] = useState<MatchingMemory[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("active")
  const [sourceFilter, setSourceFilter] = useState("all")
  const [sortBy, setSortBy] = useState("lastUsed_desc")

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 20

  // 分页信息（从API返回）
  const [paginationInfo, setPaginationInfo] = useState({
    current: 1,
    limit: 20,
    total: 0,
    pages: 0,
  })

  // 模态框状态
  const editModal = useDisclosure()
  const deleteModal = useDisclosure()
  const clearAllModal = useDisclosure()
  const reselectProductModal = useDisclosure()
  const [selectedMemory, setSelectedMemory] = useState<MatchingMemory | null>(
    null
  )

  // 编辑表单状态（简化版）
  const [editForm, setEditForm] = useState({
    confidence: 0,
    weight: 1.0,
    status: "active",
  })

  // 商品搜索状态
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // 防抖搜索定时器
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 模板选择状态
  const [selectedTemplateId, setSelectedTemplateId] = useState("")
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false)

  // 通知系统
  const notifications = useNotifications()
  const { isViewer } = usePermissions()
  const isVisitor = isViewer()
  const visitorActionTip = "游客无法进行此操作"
  const guardVisitorAction = useCallback(() => {
    if (!isVisitor) return false
    notifications.warning("暂无权限", visitorActionTip)
    return true
  }, [isVisitor, notifications, visitorActionTip])

  // 生成任务唯一标识
  const generateTaskIdentifier = (createdAt: string, taskId: string) => {
    const date = new Date(createdAt)
      .toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "")
    const time = new Date(createdAt)
      .toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/:/g, "")
    return `${date}-${time}-${taskId.slice(-4)}`
  }

  // 获取模板ID的辅助函数
  const getTemplateId = (template: ProductTemplate): string => {
    return template._id || template.id || ""
  }

  // 统计信息
  const [statistics, setStatistics] = useState({
    total: 0,
    active: 0,
    deprecated: 0,
    conflicted: 0,
    highTrust: 0,
    averageTrustScore: 0,
    totalUsage: 0,
  })

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setIsLoadingTemplates(true)

      const response = await fetch(buildApiUrl("/templates/options"), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      const templateList = (data.data?.templates || []).filter(
        (template: ProductTemplate) => template._id || template.id
      )

      setTemplates(templateList)

      // 自动选择默认模板
      if (templateList.length > 0 && !selectedTemplateId) {
        // 优先选择标记为默认的模板
        const defaultTemplate = templateList.find(
          (t: ProductTemplate) => t.isDefault
        )
        const selectedTemplate = defaultTemplate || templateList[0]

        // 确保ID存在且有效
        const templateId = getTemplateId(selectedTemplate)
        if (templateId) {
          setSelectedTemplateId(templateId)
        }
      }
    } catch (error) {
      console.error("❌ 获取模板列表失败:", error)
      setTemplates([])
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("获取失败", `无法获取模板列表: ${errorMessage}`)
    } finally {
      setIsLoadingTemplates(false)
    }
  }

  // 获取记忆列表
  const fetchMemories = async () => {
    // 如果没有选择模板，不获取数据
    if (!selectedTemplateId) {
      setLoading(false)
      return
    }

    // 验证templateId格式（MongoDB ObjectId 格式 - 放宽验证）
    if (!selectedTemplateId || selectedTemplateId.length < 12) {
      notifications.error("模板错误", "选择的模板ID无效")
      setLoading(false)
      return
    }

    try {
      setLoading(true)

      const url = new URL(buildApiUrl("/matching/memories"))
      url.searchParams.set("page", currentPage.toString())
      url.searchParams.set("limit", itemsPerPage.toString())

      if (searchTerm) url.searchParams.set("search", searchTerm)
      if (statusFilter !== "all") url.searchParams.set("status", statusFilter)
      if (sourceFilter !== "all") url.searchParams.set("source", sourceFilter)
      if (sortBy) url.searchParams.set("sortBy", sortBy)
      if (selectedTemplateId)
        url.searchParams.set("templateId", selectedTemplateId)

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setMemories(data.data.memories || [])
      setStatistics(data.data.statistics || {})

      // 更新分页信息
      setPaginationInfo(
        data.data.pagination || {
          current: 1,
          limit: itemsPerPage,
          total: 0,
          pages: 0,
        }
      )
    } catch (error) {
      console.error("❌ 获取记忆列表失败:", error)
      notifications.error("获取失败", "无法获取记忆列表")
      setMemories([])
      setStatistics({
        total: 0,
        active: 0,
        deprecated: 0,
        conflicted: 0,
        highTrust: 0,
        averageTrustScore: 0,
        totalUsage: 0,
      })

      // 重置分页信息
      setPaginationInfo({
        current: 1,
        limit: itemsPerPage,
        total: 0,
        pages: 0,
      })
    } finally {
      setLoading(false)
    }
  }

  // 删除记忆
  const deleteMemory = async (memoryId: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/matching/memories/${memoryId}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("删除成功", "记忆已删除")
      deleteModal.onClose()
      await fetchMemories()
    } catch (error) {
      console.error("❌ 删除记忆失败:", error)
      notifications.error("删除失败", "无法删除记忆")
    }
  }

  // 批量清理废弃记忆
  const cleanupDeprecated = async () => {
    try {
      const response = await fetch(buildApiUrl("/matching/memories/cleanup"), {
        method: "POST",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      notifications.success(
        "清理完成",
        `已清理 ${result.data.cleanedCount} 条废弃记忆`
      )
      await fetchMemories()
    } catch (error) {
      console.error("❌ 清理失败:", error)
      notifications.error("清理失败", "无法清理废弃记忆")
    }
  }

  // 搜索商品
  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSearchResults([])
      return
    }

    // 使用当前选择的模板ID
    let currentTemplateId = selectedTemplateId || getTemplateId(templates[0])

    // 如果没有模板ID，尝试自动设置
    if (!currentTemplateId && templates.length > 0) {
      const fallbackTemplateId = getTemplateId(templates[0])
      if (fallbackTemplateId) {
        console.log("🔧 自动设置模板ID:", fallbackTemplateId)
        setSelectedTemplateId(fallbackTemplateId)
        currentTemplateId = fallbackTemplateId
      }
    }

    if (!currentTemplateId) {
      console.warn("⚠️ 无法获取模板ID:", {
        selectedTemplateId: selectedTemplateId,
        templatesLength: templates.length,
        firstTemplate: templates[0] ? getTemplateId(templates[0]) : "无",
      })
      notifications.warning("模板缺失", "请先选择一个模板，然后重试搜索")
      setSearchResults([])
      return
    }

    // 验证模板ID格式 - 放宽验证条件
    if (
      typeof currentTemplateId !== "string" ||
      currentTemplateId.trim() === "" ||
      currentTemplateId.length < 8 // 放宽长度要求
    ) {
      console.error("❌ 模板ID验证失败:", {
        templateId: currentTemplateId,
        type: typeof currentTemplateId,
        length: currentTemplateId?.length,
      })
      notifications.error("模板错误", "模板ID格式无效，请重新选择模板")
      setSearchResults([])
      return
    }

    try {
      setIsSearching(true)

      // 构建搜索URL，确保模板ID有效
      const searchUrl = buildApiUrl(
        `/products/search?q=${encodeURIComponent(searchTerm)}&templateId=${encodeURIComponent(currentTemplateId)}&limit=10`
      )

      console.log("🔍 开始搜索商品:", {
        searchTerm,
        templateId: currentTemplateId,
        url: searchUrl,
      })

      const response = await fetch(searchUrl, {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 搜索API错误:", {
          status: response.status,
          statusText: response.statusText,
          errorText,
        })
        throw new Error(`搜索失败 (${response.status}): ${errorText}`)
      }

      const data = await response.json()
      console.log("🔍 搜索结果调试:", {
        searchTerm,
        templateId: currentTemplateId,
        totalResults: data.data?.products?.length || 0,
        matchedCount: data.data?.matchedCount || 0,
        products:
          data.data?.products?.map((p: any) => ({
            id: p._id,
            name: p.name,
            isMatched: p.isMatched,
          })) || [],
      })
      setSearchResults(data.data?.products || [])
    } catch (error) {
      console.error("❌ 搜索商品失败:", error)
      setSearchResults([])
      const errorMessage =
        error instanceof Error ? error.message : "无法搜索商品"
      notifications.error("搜索失败", errorMessage)
    } finally {
      setIsSearching(false)
    }
  }

  // 防抖搜索商品
  const debouncedSearchProducts = useCallback((searchTerm: string) => {
    // 清除之前的定时器
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // 如果搜索词为空，立即清空结果
    if (!searchTerm.trim()) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    // 显示搜索状态
    setIsSearching(true)

    // 设置新的定时器
    searchTimeoutRef.current = setTimeout(() => {
      searchProducts(searchTerm)
    }, 800) // 800ms 防抖延迟
  }, [])

  // 编辑记忆（简化版）
  const editMemory = async () => {
    if (!selectedMemory) return

    try {
      const updateData = {
        confidence: editForm.confidence,
        weight: editForm.weight,
        status: editForm.status,
      }

      const response = await fetch(
        buildApiUrl(`/matching/memories/${selectedMemory._id}`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("编辑成功", "记忆参数已更新")
      editModal.onClose()
      await fetchMemories()
    } catch (error) {
      console.error("❌ 编辑记忆失败:", error)
      notifications.error("编辑失败", "无法更新记忆")
    }
  }

  // 重选商品函数
  const updateProductSelection = async (newProductId: string) => {
    if (!selectedMemory) return

    try {
      const updateData = {
        confirmedProductId: newProductId,
      }

      const response = await fetch(
        buildApiUrl(`/matching/memories/${selectedMemory._id}`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("重选成功", "商品匹配已更新")
      reselectProductModal.onClose()
      await fetchMemories()
    } catch (error) {
      console.error("❌ 重选商品失败:", error)
      notifications.error("重选失败", "无法更新商品匹配")
    }
  }

  // 清空所有记忆
  const clearAllMemories = async () => {
    try {
      const response = await fetch(
        buildApiUrl("/matching/memories/clear-all"),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      notifications.success("清空成功", data.message)
      clearAllModal.onClose()
      await fetchMemories()
    } catch (error) {
      console.error("❌ 清空记忆库失败:", error)
      notifications.error("清空失败", "无法清空记忆库")
    }
  }

  // 当选择记忆进行编辑时，初始化编辑表单（简化版）
  const handleEditMemory = (memory: MatchingMemory) => {
    const editFormData = {
      confidence: memory.confidence,
      weight: Number(memory.weight.toFixed(1)), // 限制为1位小数
      status: memory.status,
    }

    setSelectedMemory(memory)
    setEditForm(editFormData)

    editModal.onOpen()
  }

  // 重选商品处理函数
  const handleReselectProduct = (memory: MatchingMemory) => {
    setSelectedMemory(memory)
    setProductSearchTerm("")
    setSearchResults([])
    reselectProductModal.onOpen()
  }

  // 检查是否存在同名的活跃记忆
  const hasActiveMemoryWithSameName = (
    targetMemory: MatchingMemory
  ): boolean => {
    return memories.some(
      memory =>
        memory._id !== targetMemory._id && // 不是同一条记忆
        memory.normalizedWholesaleName ===
          targetMemory.normalizedWholesaleName &&
        memory.status === "active"
    )
  }

  // 处理冲突的记忆恢复
  const handleConflictRestore = (memory: MatchingMemory) => {
    const conflictingMemory = memories.find(
      m =>
        m._id !== memory._id &&
        m.normalizedWholesaleName === memory.normalizedWholesaleName &&
        m.status === "active"
    )

    if (conflictingMemory) {
      notifications.warning(
        "记忆冲突",
        `已存在活跃的"${memory.originalWholesaleName}"记忆（匹配商品：${conflictingMemory.confirmedProductId.name}）。请先处理现有活跃记忆再恢复此记忆。`,
        12000
      )
    } else {
      notifications.error("检测错误", "无法找到冲突记忆，请刷新页面后重试")
    }
  }

  // 恢复废弃记忆
  const handleRestoreMemory = async (memory: MatchingMemory) => {
    try {
      const updateData = {
        status: "active",
      }

      const response = await fetch(
        buildApiUrl(`/matching/memories/${memory._id}`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify(updateData),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      notifications.success(
        "恢复成功",
        `记忆"${memory.originalWholesaleName}"已恢复为活跃状态`
      )
      await fetchMemories()
    } catch (error) {
      console.error("❌ 恢复记忆失败:", error)
      const errorMessage =
        error instanceof Error ? error.message : "无法恢复记忆状态"

      if (
        errorMessage.includes("数据库操作失败") ||
        errorMessage.includes("duplicate")
      ) {
        notifications.error(
          "恢复失败",
          `已存在同名的活跃记忆"${memory.originalWholesaleName}"，无法恢复废弃记忆`
        )
      } else {
        notifications.error("恢复失败", errorMessage)
      }
    }
  }

  // 初始化加载模板（添加重试机制）
  useEffect(() => {
    fetchTemplates()

    // 如果3秒后还没有选择模板，重新尝试
    const retryTimer = setTimeout(() => {
      if (!selectedTemplateId && templates.length > 0) {
        const firstTemplate = templates[0]
        const templateId = getTemplateId(firstTemplate)
        if (templateId) {
          setSelectedTemplateId(templateId)
        }
      }
    }, 3000)

    return () => clearTimeout(retryTimer)
  }, [])

  // 当搜索条件变化时重置页码
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1)
    }
  }, [searchTerm, statusFilter, sourceFilter, sortBy, selectedTemplateId])

  // 当模板选择或其他筛选条件变化时，获取记忆数据
  useEffect(() => {
    if (selectedTemplateId) {
      fetchMemories()
    }
  }, [
    currentPage,
    searchTerm,
    statusFilter,
    sourceFilter,
    sortBy,
    selectedTemplateId,
  ])

  // 组件卸载时清理搜索定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // 过滤和分页
  const filteredMemories = memories
  const totalPages = paginationInfo.pages || 0

  return (
    <div className="space-y-6 p-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">匹配记忆库</h1>
          <p className="text-default-500">
            管理和查看系统学习的匹配记忆，提高匹配准确率
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw className="h-4 w-4" />}
            onClick={fetchMemories}
            isLoading={loading}
          >
            刷新
          </Button>
          <Button
            variant="flat"
            size="sm"
            color="warning"
            startContent={<Archive className="h-4 w-4" />}
            onClick={cleanupDeprecated}
            isDisabled={isVisitor}
          >
            清理废弃
          </Button>
          <Button
            variant="flat"
            size="sm"
            color="danger"
            startContent={<Trash2 className="h-4 w-4" />}
            onClick={clearAllModal.onOpen}
            isDisabled={isVisitor}
          >
            一键清空
          </Button>
        </div>
      </div>

      {/* 模板选择 */}
      <Card>
        <CardBody className="px-4 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">当前模板:</span>
            </div>
            <Select
              selectedKeys={
                selectedTemplateId ? new Set([selectedTemplateId]) : new Set()
              }
              onSelectionChange={keys => {
                const key = Array.from(keys)[0] as string
                if (key && key !== selectedTemplateId) {
                  setSelectedTemplateId(key)
                }
              }}
              className="max-w-xs"
              size="sm"
              placeholder={templates.length === 0 ? "加载中..." : "选择模板..."}
              isLoading={isLoadingTemplates}
              isDisabled={templates.length === 0}
              selectionMode="single"
            >
              {templates
                .filter(template => getTemplateId(template))
                .map(template => {
                  const templateId = getTemplateId(template)
                  const displayText = template.isDefault
                    ? `${template.name} (默认)`
                    : template.name
                  return (
                    <SelectItem
                      key={templateId}
                      value={templateId}
                      textValue={displayText}
                    >
                      <div className="flex items-center gap-2">
                        <span>{template.name}</span>
                        {template.isDefault && (
                          <span className="text-xs text-primary">(默认)</span>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
            </Select>
            {selectedTemplateId ? (
              <div className="text-xs text-default-500">
                记忆库将只显示该模板相关的匹配记录
              </div>
            ) : templates.length > 0 ? (
              <Button
                size="sm"
                variant="flat"
                color="primary"
                onClick={() => {
                  const firstTemplate = templates[0]
                  const templateId = getTemplateId(firstTemplate)
                  if (templateId) {
                    setSelectedTemplateId(templateId)
                  }
                }}
              >
                选择第一个模板
              </Button>
            ) : null}
          </div>
        </CardBody>
      </Card>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">总记忆</p>
              <p className="text-lg font-bold">{statistics.total}</p>
            </div>
            <Brain className="h-5 w-5 text-primary" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">活跃记忆</p>
              <p className="text-lg font-bold text-success">
                {statistics.active}
              </p>
            </div>
            <Check className="h-5 w-5 text-success" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">高可信</p>
              <p className="text-lg font-bold text-warning">
                {statistics.highTrust}
              </p>
            </div>
            <Star className="h-5 w-5 text-warning" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">平均可信度</p>
              <p className="text-lg font-bold">
                {statistics.averageTrustScore}%
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">使用次数</p>
              <p className="text-lg font-bold">{statistics.totalUsage}</p>
            </div>
            <BarChart3 className="h-5 w-5 text-secondary" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">冲突记忆</p>
              <p className="text-lg font-bold text-danger">
                {statistics.conflicted}
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-danger" />
          </div>
        </Card>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Input
                placeholder="输入关键词自动搜索批发名、商品名、品牌、条码、盒码..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                startContent={<Search className="h-4 w-4 text-default-400" />}
                className="flex-1"
                variant="bordered"
                isClearable
                onClear={() => setSearchTerm("")}
                description="支持搜索批发名、商品名、品牌、条码、盒码等信息"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Select
                label="状态"
                size="sm"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setStatusFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部状态</SelectItem>
                <SelectItem key="active">活跃</SelectItem>
                <SelectItem key="deprecated">已废弃</SelectItem>
                <SelectItem key="conflicted">冲突</SelectItem>
              </Select>

              <Select
                label="匹配方式"
                size="sm"
                selectedKeys={sourceFilter ? [sourceFilter] : []}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setSourceFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部匹配</SelectItem>
                <SelectItem key="auto">自动匹配</SelectItem>
                <SelectItem key="memory">记忆匹配</SelectItem>
                <SelectItem key="manual">手动匹配</SelectItem>
                <SelectItem key="unknown">未知类型</SelectItem>
              </Select>

              <Select
                label="排序方式"
                size="sm"
                selectedKeys={sortBy ? [sortBy] : []}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setSortBy(newValue)
                  }
                }}
              >
                <SelectItem key="lastUsed_desc">操作时间 (新→旧)</SelectItem>
                <SelectItem key="created_desc">创建时间 (新→旧)</SelectItem>
                <SelectItem key="trustScore_desc">可信度 (高→低)</SelectItem>
                <SelectItem key="trustScore_asc">可信度 (低→高)</SelectItem>
                <SelectItem key="confirmCount_desc">
                  确认次数 (多→少)
                </SelectItem>
              </Select>

              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="flat"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setSourceFilter("all")
                    setSortBy("lastUsed_desc")
                  }}
                >
                  重置筛选
                </Button>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 记忆列表 */}
      <Card>
        <CardBody className="p-0">
          {!selectedTemplateId ? (
            <EmptyState
              icon={<Info className="h-8 w-8" />}
              title="请选择模板"
              description="请在上方选择一个模板以查看对应的记忆库数据"
            />
          ) : loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <RefreshCw className="mx-auto h-6 w-6 animate-spin text-primary" />
                <p className="mt-2 text-sm text-default-500">加载记忆数据...</p>
              </div>
            </div>
          ) : filteredMemories.length === 0 ? (
            <EmptyState
              icon={<Brain className="h-8 w-8" />}
              title="暂无记忆数据"
              description={
                templates.length === 0
                  ? "系统还没有学习到任何匹配记忆"
                  : "当前模板下还没有学习到任何匹配记忆"
              }
            />
          ) : (
            <div className="space-y-4">
              <Table aria-label="记忆列表">
                <TableHeader>
                  <TableColumn>批发名</TableColumn>
                  <TableColumn>匹配商品</TableColumn>
                  <TableColumn>可信度</TableColumn>
                  <TableColumn>确认次数</TableColumn>
                  <TableColumn>匹配方式</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>学习来源</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredMemories.map(memory => (
                    <TableRow key={memory._id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {memory.originalWholesaleName}
                          </p>
                          <p className="text-xs text-default-500">
                            标准化: {memory.normalizedWholesaleName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">
                            {memory.confirmedProductId.name}
                          </p>
                          <div className="flex flex-wrap gap-1 text-xs">
                            <span className="text-primary">
                              {memory.confirmedProductId.brand}
                            </span>
                            {memory.confirmedProductId.company && (
                              <span className="text-default-500">
                                | {memory.confirmedProductId.company}
                              </span>
                            )}
                          </div>
                          {(memory.confirmedProductId.productCode ||
                            memory.confirmedProductId.boxCode) && (
                            <div className="space-y-0.5 font-mono text-xs text-default-500">
                              {memory.confirmedProductId.productCode && (
                                <p>
                                  条码: {memory.confirmedProductId.productCode}
                                </p>
                              )}
                              {memory.confirmedProductId.boxCode && (
                                <p>盒码: {memory.confirmedProductId.boxCode}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TrustScoreDisplay
                          score={memory.trustScore}
                          isHighTrust={memory.isHighTrust}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Badge
                            color={
                              memory.confirmCount >= 5
                                ? "success"
                                : memory.confirmCount >= 2
                                  ? "warning"
                                  : "default"
                            }
                            variant="flat"
                          >
                            {memory.confirmCount}次
                          </Badge>
                          {memory.isUserPreference && (
                            <p className="text-xs text-primary">用户偏好</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <MatchTypeChip
                          matchType={
                            memory.metadata?.learningSource?.originalMatchType
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <StatusChip status={memory.status} />
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-xs">
                          {memory.metadata?.learningSource ? (
                            <div className="space-y-1">
                              {/* 任务名称和文件名 - 支持点击跳转 */}
                              <div>
                                {(() => {
                                  // 从populate的任务数据中获取信息
                                  const sourceTask =
                                    memory.metadata.learningSource.sourceTask
                                      ?.taskId
                                  const relatedTask =
                                    memory.relatedRecords?.[0]?.taskId
                                  const taskData = sourceTask || relatedTask

                                  if (
                                    taskData &&
                                    typeof taskData === "object"
                                  ) {
                                    // 任务数据已经被populate
                                    const taskName =
                                      taskData.originalFilename ||
                                      memory.metadata.learningSource.sourceTask
                                        ?.fileName ||
                                      "未知任务"
                                    const taskId =
                                      taskData._id ||
                                      (typeof sourceTask === "string"
                                        ? sourceTask
                                        : typeof relatedTask === "string"
                                          ? relatedTask
                                          : "")
                                    const taskIdentifier = taskData.createdAt
                                      ? generateTaskIdentifier(
                                          taskData.createdAt,
                                          taskId
                                        )
                                      : ""

                                    return (
                                      <button
                                        onClick={() => {
                                          // 构建包含高亮参数的URL
                                          const highlightParams =
                                            new URLSearchParams({
                                              taskId: taskId,
                                              taskName: taskName,
                                              taskIdentifier: taskIdentifier,
                                              // 用于高亮的参数
                                              highlightProduct:
                                                memory.confirmedProductId._id,
                                              highlightProductName:
                                                memory.confirmedProductId.name,
                                              highlightWholesaleName:
                                                memory.originalWholesaleName,
                                              autoScroll: "true",
                                              highlightMemory: "true",
                                            })
                                          const url = `/dashboard/matching/results?${highlightParams.toString()}`
                                          window.open(url, "_blank")
                                        }}
                                        className="cursor-pointer text-left font-medium text-primary hover:text-primary-600 hover:underline"
                                        title={`点击跳转到任务: ${taskName} (${taskIdentifier})`}
                                      >
                                        {taskName}
                                        {taskIdentifier && (
                                          <span className="ml-1 text-xs text-default-400">
                                            ({taskIdentifier})
                                          </span>
                                        )}
                                      </button>
                                    )
                                  } else {
                                    // 回退到存储的字符串信息
                                    const taskName =
                                      memory.metadata.learningSource.sourceTask
                                        ?.taskName ||
                                      memory.metadata.learningSource.sourceTask
                                        ?.fileName ||
                                      "手动添加"
                                    return (
                                      <span className="font-medium text-default-700">
                                        {taskName}
                                      </span>
                                    )
                                  }
                                })()}
                              </div>

                              {/* 学习时间 */}
                              <p className="text-default-500">
                                {new Date(
                                  memory.metadata.learningSource.learnedAt
                                ).toLocaleString("zh-CN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: false,
                                })}
                              </p>

                              {/* 学习方式 */}
                              <p className="text-default-400">
                                {memory.metadata.learningSource
                                  .learningMethod === "single_learn"
                                  ? "单条学习"
                                  : memory.metadata.learningSource
                                        .learningMethod === "batch_learn"
                                    ? "批量学习"
                                    : memory.metadata.learningSource
                                          .learningMethod === "bulk_import"
                                      ? "批量导入"
                                      : "手动添加"}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <p className="text-default-500">
                                {new Date(
                                  memory.metadata?.usageStats?.lastUsedAt ||
                                    memory.lastConfirmedAt
                                ).toLocaleString("zh-CN", {
                                  year: "numeric",
                                  month: "2-digit",
                                  day: "2-digit",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  second: "2-digit",
                                  hour12: false,
                                })}
                              </p>
                              <p className="text-default-400">传统记忆</p>
                            </div>
                          )}
                          <p className="text-default-500">
                            使用 {memory.metadata?.usageStats?.totalUsed || 0}{" "}
                            次
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* 根据记忆状态显示不同的操作按钮 */}
                          {memory.status === "deprecated" ? (
                            // 废弃记忆：智能显示恢复激活和删除
                            <>
                              {/* 检查是否存在同名的活跃记忆，决定是否显示恢复按钮 */}
                              {!hasActiveMemoryWithSameName(memory) ? (
                                <Tooltip content={isVisitor ? visitorActionTip : "恢复激活"}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="success"
                                    isDisabled={isVisitor}
                                    onClick={() => handleRestoreMemory(memory)}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              ) : (
                                <Tooltip content={isVisitor ? visitorActionTip : "已存在同名活跃记忆，无法直接恢复"}>
                                  <Button
                                    isIconOnly
                                    size="sm"
                                    variant="light"
                                    color="warning"
                                    isDisabled={isVisitor}
                                    onClick={() =>
                                      handleConflictRestore(memory)
                                    }
                                  >
                                    <AlertTriangle className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              )}
                              <Tooltip content={isVisitor ? visitorActionTip : "删除记忆"}>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isDisabled={isVisitor}
                                  onClick={() => {
                                    setSelectedMemory(memory)
                                    deleteModal.onOpen()
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </>
                          ) : (
                            // 活跃/冲突记忆：显示全部操作
                            <>
                              <Tooltip content={isVisitor ? visitorActionTip : "编辑参数"}>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="primary"
                                  isDisabled={isVisitor}
                                  onClick={() => handleEditMemory(memory)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content={isVisitor ? visitorActionTip : "重选商品"}>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="secondary"
                                  isDisabled={isVisitor}
                                  onClick={() => handleReselectProduct(memory)}
                                >
                                  <Package className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content={isVisitor ? visitorActionTip : "删除记忆"}>
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  isDisabled={isVisitor}
                                  onClick={() => {
                                    setSelectedMemory(memory)
                                    deleteModal.onOpen()
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4">
                  <p className="text-sm text-default-500">
                    显示第{" "}
                    {(paginationInfo.current - 1) * paginationInfo.limit + 1} -{" "}
                    {Math.min(
                      paginationInfo.current * paginationInfo.limit,
                      paginationInfo.total
                    )}{" "}
                    条， 共 {paginationInfo.total} 条记录
                  </p>
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 删除确认模态框 */}
      <Modal
        isOpen={deleteModal.isOpen}
        onOpenChange={deleteModal.onOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <h3 className="text-lg font-semibold">确认删除</h3>
              </ModalHeader>
              <ModalBody>
                {selectedMemory && (
                  <div className="space-y-4">
                    <p>您确定要删除以下记忆吗？</p>
                    <Card>
                      <CardBody>
                        <div className="space-y-2">
                          <p>
                            <strong>批发名：</strong>
                            {selectedMemory.originalWholesaleName}
                          </p>
                          <p>
                            <strong>匹配商品：</strong>
                            {selectedMemory.confirmedProductId.name}
                          </p>
                          <p>
                            <strong>确认次数：</strong>
                            {selectedMemory.confirmCount}次
                          </p>
                          <p>
                            <strong>可信度：</strong>
                            {selectedMemory.trustScore}%
                          </p>
                        </div>
                      </CardBody>
                    </Card>
                    <p className="text-sm text-danger">
                      删除后将无法恢复，且会影响后续的自动匹配。
                    </p>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="danger"
                  isDisabled={isVisitor}
                  onPress={() =>
                    selectedMemory && deleteMemory(selectedMemory._id)
                  }
                >
                  确认删除
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 编辑记忆模态框 */}
      <Modal
        isOpen={editModal.isOpen}
        onOpenChange={editModal.onOpenChange}
        size="lg"
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <Edit className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">编辑记忆参数</h3>
              </ModalHeader>
              <ModalBody>
                {selectedMemory && (
                  <div className="space-y-4">
                    {/* 记忆信息 */}
                    <Card className="border-2 border-primary-200 bg-primary-50">
                      <CardHeader className="pb-2">
                        <h4 className="text-sm font-semibold text-primary">
                          📝 当前记忆信息
                        </h4>
                      </CardHeader>
                      <CardBody className="pt-0">
                        <div className="grid gap-3 md:grid-cols-2">
                          <div>
                            <p className="mb-1 text-xs text-default-600">
                              批发名称
                            </p>
                            <p className="font-medium text-primary">
                              {selectedMemory.originalWholesaleName}
                            </p>
                            <p className="mt-1 text-xs text-default-500">
                              标准化: {selectedMemory.normalizedWholesaleName}
                            </p>
                          </div>
                          <div>
                            <p className="mb-1 text-xs text-default-600">
                              匹配商品（不可修改）
                            </p>
                            <p className="font-medium">
                              {selectedMemory.confirmedProductId.name}
                            </p>
                            <div className="mt-1 flex items-center gap-4 text-xs text-default-500">
                              <span>
                                品牌: {selectedMemory.confirmedProductId.brand}
                              </span>
                              <span>确认: {selectedMemory.confirmCount}次</span>
                            </div>
                            <p className="mt-1 text-xs text-warning">
                              💡 如需更换商品，请使用"重选商品"功能
                            </p>
                          </div>
                        </div>
                      </CardBody>
                    </Card>

                    {/* 编辑表单 */}
                    <div className="space-y-6">
                      {/* 置信度 */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">
                              置信度 (0-100)
                            </label>
                            <Tooltip content="此记忆的可信程度，越高的置信度在匹配时优先级越高">
                              <HelpCircle className="h-4 w-4 text-default-400" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="flat"
                              color="danger"
                              onClick={() =>
                                setEditForm({ ...editForm, confidence: 30 })
                              }
                            >
                              低(30%)
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="warning"
                              onClick={() =>
                                setEditForm({ ...editForm, confidence: 70 })
                              }
                            >
                              中(70%)
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="success"
                              onClick={() =>
                                setEditForm({ ...editForm, confidence: 95 })
                              }
                            >
                              高(95%)
                            </Button>
                          </div>
                        </div>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.confidence.toString()}
                          onChange={e =>
                            setEditForm({
                              ...editForm,
                              confidence: Number(e.target.value),
                            })
                          }
                          placeholder="输入置信度"
                          endContent={
                            <span className="text-default-400">%</span>
                          }
                          description={
                            editForm.confidence >= 90
                              ? "🟢 高置信度 - 强烈推荐使用此匹配"
                              : editForm.confidence >= 70
                                ? "🟡 中等置信度 - 建议审核后使用"
                                : "🔴 低置信度 - 需要人工验证"
                          }
                        />
                      </div>

                      {/* 权重 */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <label className="text-sm font-medium">
                              权重 (0.1-10.0)
                            </label>
                            <Tooltip
                              content={
                                <div className="space-y-1 p-1">
                                  <p className="font-medium">权重说明:</p>
                                  <p>• 1.0 = 标准权重（默认）</p>
                                  <p>• 0.1-0.9 = 降低优先级</p>
                                  <p>• 1.1-3.0 = 提高优先级</p>
                                  <p>• 3.0+ = 极高优先级</p>
                                  <p className="text-warning">
                                    权重影响匹配时的评分计算
                                  </p>
                                </div>
                              }
                              className="max-w-xs"
                            >
                              <HelpCircle className="h-4 w-4 text-default-400" />
                            </Tooltip>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="flat"
                              color="danger"
                              onClick={() =>
                                setEditForm({ ...editForm, weight: 0.5 })
                              }
                            >
                              低权重
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="default"
                              onClick={() =>
                                setEditForm({ ...editForm, weight: 1.0 })
                              }
                            >
                              标准
                            </Button>
                            <Button
                              size="sm"
                              variant="flat"
                              color="success"
                              onClick={() =>
                                setEditForm({ ...editForm, weight: 2.0 })
                              }
                            >
                              高权重
                            </Button>
                          </div>
                        </div>
                        <Input
                          type="number"
                          min="0.1"
                          max="10"
                          step="0.1"
                          value={editForm.weight.toString()}
                          onChange={e => {
                            const value = parseFloat(e.target.value)
                            if (!isNaN(value)) {
                              // 限制为1位小数
                              const roundedValue = Math.round(value * 10) / 10
                              setEditForm({
                                ...editForm,
                                weight: roundedValue,
                              })
                            }
                          }}
                          placeholder="输入权重"
                          description={
                            editForm.weight > 2.0
                              ? "🔥 极高权重 - 此记忆将强烈影响匹配结果"
                              : editForm.weight > 1.0
                                ? "⬆️ 高权重 - 此记忆优先级较高"
                                : editForm.weight === 1.0
                                  ? "⚖️ 标准权重 - 默认影响力"
                                  : "⬇️ 低权重 - 此记忆优先级较低"
                          }
                        />
                      </div>

                      {/* 状态 */}
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <label className="text-sm font-medium">状态</label>
                          <Tooltip
                            content={
                              <div className="space-y-1 p-1">
                                <p>• 活跃: 正常使用的记忆</p>
                                <p>• 废弃: 不再使用的记忆</p>
                                <p>• 冲突: 存在匹配冲突的记忆</p>
                              </div>
                            }
                          >
                            <HelpCircle className="h-4 w-4 text-default-400" />
                          </Tooltip>
                        </div>
                        <Select
                          selectedKeys={
                            editForm.status
                              ? new Set([editForm.status])
                              : new Set()
                          }
                          onSelectionChange={keys =>
                            setEditForm({
                              ...editForm,
                              status: Array.from(keys)[0] as string,
                            })
                          }
                        >
                          <SelectItem key="active">🟢 活跃</SelectItem>
                          <SelectItem key="deprecated">🟡 废弃</SelectItem>
                          <SelectItem key="conflicted">🔴 冲突</SelectItem>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="primary"
                  isDisabled={isVisitor}
                  onPress={editMemory}
                  startContent={
                    selectedMemory &&
                    (editForm.confidence !== selectedMemory.confidence ||
                      editForm.weight !==
                        Number(selectedMemory.weight.toFixed(1)) ||
                      editForm.status !== selectedMemory.status) ? (
                      <Edit className="h-4 w-4" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )
                  }
                >
                  {selectedMemory &&
                  (editForm.confidence !== selectedMemory.confidence ||
                    editForm.weight !==
                      Number(selectedMemory.weight.toFixed(1)) ||
                    editForm.status !== selectedMemory.status)
                    ? "保存更改"
                    : "确认无更改"}
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 清空所有记忆确认模态框 */}
      <Modal
        isOpen={clearAllModal.isOpen}
        onOpenChange={clearAllModal.onOpenChange}
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
                <h3 className="text-lg font-semibold">危险操作</h3>
              </ModalHeader>
              <ModalBody>
                <div className="space-y-4">
                  <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
                    <p className="mb-2 font-medium text-danger-800">
                      ⚠️ 您即将清空所有记忆库数据！
                    </p>
                    <p className="text-sm text-danger-700">
                      此操作将删除所有 {statistics.total} 条记忆记录，包括：
                    </p>
                    <ul className="mt-2 list-inside list-disc text-sm text-danger-700">
                      <li>所有历史匹配记忆</li>
                      <li>用户确认的匹配偏好</li>
                      <li>系统学习的匹配模式</li>
                    </ul>
                  </div>

                  <div className="rounded-lg border border-warning-200 bg-warning-50 p-4">
                    <p className="text-sm text-warning-800">
                      <strong>后果：</strong>
                      清空后，所有商品匹配将回到初始状态，需要重新进行人工确认和学习。
                    </p>
                  </div>

                  <p className="text-center text-sm text-default-600">
                    请确认您要执行此操作。此操作不可撤销！
                  </p>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  取消
                </Button>
                <Button
                  color="danger"
                  onPress={clearAllMemories}
                  isDisabled={isVisitor}
                >
                  确认清空
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 重选商品模态框 - 参考enhanced-page样式 */}
      <Modal
        isOpen={reselectProductModal.isOpen}
        onOpenChange={reselectProductModal.onOpenChange}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh] h-[90vh]",
          body: "p-0 flex flex-col h-full",
        }}
      >
        <ModalContent className="flex h-full flex-col">
          {onClose => (
            <>
              <ModalHeader className="flex-shrink-0 border-b border-divider px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-secondary" />
                    <h3 className="text-xl font-bold">重选匹配商品</h3>
                  </div>
                </div>
              </ModalHeader>
              <div className="flex min-h-0 flex-1">
                {/* 左侧：当前记忆信息 */}
                <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-divider bg-default-50/50">
                  <div className="space-y-4 p-4">
                    <h4 className="font-semibold text-default-700">
                      记忆匹配信息
                    </h4>

                    {/* 批发名信息 */}
                    {selectedMemory && (
                      <Card className="border border-secondary-200 bg-secondary-50">
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge color="secondary" variant="flat">
                                批发名
                              </Badge>
                              <span className="text-sm font-medium text-secondary-800">
                                需要重新匹配
                              </span>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-secondary-900">
                                {selectedMemory.originalWholesaleName}
                              </p>
                              <p className="mt-1 text-xs text-secondary-600">
                                标准化: {selectedMemory.normalizedWholesaleName}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-secondary-700">
                                    确认次数：
                                  </span>
                                  <Chip
                                    color="secondary"
                                    size="sm"
                                    variant="solid"
                                  >
                                    {selectedMemory.confirmCount} 次
                                  </Chip>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-secondary-700">
                                    置信度：
                                  </span>
                                  <Chip
                                    color="secondary"
                                    size="sm"
                                    variant="flat"
                                  >
                                    {selectedMemory.confidence}%
                                  </Chip>
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* 匹配关系指示箭头 */}
                    {selectedMemory && (
                      <div className="flex justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-default-100 px-3 py-2">
                          <ArrowRight className="h-4 w-4 text-default-500" />
                          <span className="text-xs font-medium text-default-600">
                            重新匹配
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 当前匹配商品信息 */}
                    {selectedMemory && (
                      <Card className="border border-warning-200 bg-warning-50">
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge color="warning" variant="flat">
                                当前匹配
                              </Badge>
                              <span className="text-sm font-medium text-warning-800">
                                即将更换
                              </span>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-warning-900">
                                {selectedMemory.confirmedProductId.name}
                              </p>
                              <p className="mt-1 text-sm text-warning-600">
                                品牌：{selectedMemory.confirmedProductId.brand}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <Chip color="warning" size="sm" variant="solid">
                                  权重 {selectedMemory.weight}
                                </Chip>
                                <Chip color="warning" size="sm" variant="flat">
                                  {selectedMemory.status === "active"
                                    ? "活跃"
                                    : selectedMemory.status}
                                </Chip>
                              </div>
                              {/* 产品编码信息 */}
                              {(selectedMemory.confirmedProductId.productCode ||
                                selectedMemory.confirmedProductId.boxCode) && (
                                <div className="mt-2 space-y-1 text-xs text-warning-600">
                                  {selectedMemory.confirmedProductId
                                    .productCode && (
                                    <p>
                                      条码:{" "}
                                      {
                                        selectedMemory.confirmedProductId
                                          .productCode
                                      }
                                    </p>
                                  )}
                                  {selectedMemory.confirmedProductId
                                    .boxCode && (
                                    <p>
                                      盒码:{" "}
                                      {
                                        selectedMemory.confirmedProductId
                                          .boxCode
                                      }
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* 搜索结果统计 */}
                    {searchResults.length > 0 && (
                      <div className="rounded-lg bg-default-100 p-3">
                        <p className="mb-2 text-sm font-medium text-default-700">
                          搜索结果统计
                        </p>
                        {(() => {
                          const matchedProducts = searchResults.filter(
                            p =>
                              p.isMatched &&
                              p._id !== selectedMemory?.confirmedProductId._id
                          )
                          const availableCount =
                            searchResults.length - matchedProducts.length
                          const currentProduct = searchResults.filter(
                            p =>
                              p._id === selectedMemory?.confirmedProductId._id
                          )
                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>总计：</span>
                                <span className="font-medium">
                                  {searchResults.length} 个
                                </span>
                              </div>
                              {currentProduct.length > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span>当前商品：</span>
                                  <span className="font-medium text-warning">
                                    {currentProduct.length} 个
                                  </span>
                                </div>
                              )}
                              {matchedProducts.length > 0 && (
                                <div className="flex justify-between text-xs">
                                  <span>已匹配：</span>
                                  <span className="font-medium text-danger">
                                    {matchedProducts.length} 个
                                  </span>
                                </div>
                              )}
                              <div className="flex justify-between text-xs">
                                <span>可选择：</span>
                                <span className="font-medium text-success">
                                  {availableCount - currentProduct.length} 个
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：商品搜索和列表 */}
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* 搜索框 */}
                  <div className="flex-shrink-0 border-b border-divider p-4">
                    <Input
                      ref={input => {
                        if (input && reselectProductModal.isOpen) {
                          setTimeout(() => input.focus(), 100)
                        }
                      }}
                      placeholder="输入商品名称、品牌、条码或盒码进行搜索..."
                      value={productSearchTerm}
                      onChange={e => {
                        const value = e.target.value
                        setProductSearchTerm(value)
                        debouncedSearchProducts(value)
                      }}
                      variant="bordered"
                      size="lg"
                      startContent={
                        <Search className="h-4 w-4 text-default-400" />
                      }
                      description="支持商品名称、品牌、条码、盒码搜索"
                      classNames={{
                        input: "text-sm",
                        description: "text-xs text-default-400",
                      }}
                    />
                  </div>

                  {/* 商品列表 */}
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {isSearching ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                          <p className="text-default-500">搜索商品中...</p>
                        </div>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <EmptyState
                          icon={<Package className="h-12 w-12" />}
                          title={
                            productSearchTerm ? "没有找到商品" : "请输入搜索词"
                          }
                          description={
                            productSearchTerm
                              ? "请调整搜索条件重试"
                              : "在上方搜索框中输入商品名称、品牌、条码或盒码进行搜索"
                          }
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {searchResults.map(product => {
                          const isCurrentProduct =
                            product._id ===
                            selectedMemory?.confirmedProductId._id
                          const isMatched =
                            product.isMatched && !isCurrentProduct

                          return (
                              <Card
                                key={product._id}
                                isPressable={!isMatched && !isVisitor}
                              className={`min-w-0 transition-all duration-200 ${
                                isCurrentProduct
                                  ? "border-warning-200 bg-warning-50"
                                  : isMatched
                                    ? "cursor-not-allowed border-default-200 bg-default-50 opacity-60"
                                    : "hover:border-primary-200 hover:bg-primary-50 hover:shadow-md"
                              }`}
                                onPress={() => {
                                  if (guardVisitorAction()) {
                                    return
                                  }
                                  if (isCurrentProduct) {
                                    notifications.info(
                                      "相同商品",
                                    "您选择的是当前已匹配的商品"
                                  )
                                } else if (isMatched) {
                                  notifications.warning(
                                    "商品已被匹配",
                                    "该商品已被其他批发名匹配，无法重复选择"
                                  )
                                } else {
                                  updateProductSelection(product._id)
                                }
                              }}
                            >
                              <CardBody className="min-w-0 p-3">
                                <div className="min-w-0 space-y-2">
                                  {/* 顶部标签行 */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                      {product.features?.hasPop && (
                                        <Chip
                                          size="sm"
                                          color="success"
                                          variant="flat"
                                        >
                                          爆珠
                                        </Chip>
                                      )}
                                      {isCurrentProduct && (
                                        <Chip
                                          size="sm"
                                          color="warning"
                                          variant="flat"
                                        >
                                          当前
                                        </Chip>
                                      )}
                                      {isMatched && (
                                        <Chip
                                          size="sm"
                                          color="danger"
                                          variant="flat"
                                        >
                                          已匹配
                                        </Chip>
                                      )}
                                    </div>
                                  </div>

                                  {/* 商品名称 */}
                                  <h4
                                    className={`line-clamp-2 text-sm font-semibold leading-tight ${
                                      isMatched
                                        ? "text-default-400"
                                        : isCurrentProduct
                                          ? "text-warning-900"
                                          : "text-default-900"
                                    }`}
                                  >
                                    {product.name}
                                  </h4>

                                  {/* 基本信息网格 */}
                                  <div
                                    className={`grid grid-cols-2 gap-2 text-xs ${
                                      isMatched
                                        ? "text-default-300"
                                        : isCurrentProduct
                                          ? "text-warning-600"
                                          : "text-default-600"
                                    }`}
                                  >
                                    <div>
                                      <span className="text-default-400">
                                        品牌
                                      </span>
                                      <p className="truncate font-medium">
                                        {product.brand}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-default-400">
                                        类型
                                      </span>
                                      <p className="truncate font-medium">
                                        {product.productType || "-"}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 价格 */}
                                  <div
                                    className={`rounded-lg py-2 text-center ${
                                      isMatched
                                        ? "bg-default-100 text-default-400"
                                        : isCurrentProduct
                                          ? "bg-warning-100 text-warning-700"
                                          : "bg-primary-50 text-primary-700"
                                    }`}
                                  >
                                    <span className="text-sm font-bold">
                                      ¥
                                      {product.pricing?.companyPrice ||
                                        product.pricing?.retailPrice ||
                                        0}
                                    </span>
                                  </div>

                                  {/* 条码信息（紧凑显示） */}
                                  {(product.productCode || product.boxCode) && (
                                    <div
                                      className={`space-y-1 text-xs ${
                                        isMatched
                                          ? "text-default-300"
                                          : isCurrentProduct
                                            ? "text-warning-500"
                                            : "text-default-500"
                                      }`}
                                    >
                                      {product.productCode && (
                                        <div className="flex justify-between">
                                          <span>条码:</span>
                                          <span className="font-mono text-xs">
                                            {product.productCode.slice(-8)}
                                          </span>
                                        </div>
                                      )}
                                      {product.boxCode && (
                                        <div className="flex justify-between">
                                          <span>盒码:</span>
                                          <span className="font-mono text-xs">
                                            {product.boxCode.slice(-8)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 选择按钮 */}
                                  <Button
                                    size="sm"
                                    color={
                                      isCurrentProduct
                                        ? "warning"
                                        : isMatched
                                          ? "default"
                                          : "primary"
                                    }
                                    variant={
                                      isCurrentProduct
                                        ? "flat"
                                        : isMatched
                                          ? "flat"
                                          : "solid"
                                    }
                                    className="w-full"
                                    isDisabled={isMatched || isVisitor}
                                    startContent={
                                      isCurrentProduct ? (
                                        <Clock className="h-3 w-3" />
                                      ) : isMatched ? (
                                        <X className="h-3 w-3" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3" />
                                      )
                                    }
                                    onClick={e => {
                                      e.stopPropagation()
                                      if (guardVisitorAction()) {
                                        return
                                      }
                                      if (isCurrentProduct) {
                                        notifications.info(
                                          "相同商品",
                                          "您选择的是当前已匹配的商品"
                                        )
                                      } else if (!isMatched) {
                                        updateProductSelection(product._id)
                                      }
                                    }}
                                  >
                                    {isCurrentProduct
                                      ? "当前商品"
                                      : isMatched
                                        ? "已匹配"
                                        : "选择此商品"}
                                  </Button>
                                </div>
                              </CardBody>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <ModalFooter className="flex-shrink-0 border-t border-divider px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <p className="text-sm text-default-500">
                    💡 提示：选择新商品后将立即更新记忆库匹配关系
                  </p>
                  <Button color="danger" variant="flat" onPress={onClose}>
                    取消
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}
