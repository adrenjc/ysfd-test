"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Progress,
  Chip,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Textarea,
  Select,
  SelectItem,
  Divider,
  Tabs,
  Tab,
} from "@nextui-org/react"
import {
  Upload,
  Play,
  CheckCircle,
  AlertTriangle,
  FileText,
  BarChart3,
  Settings,
  RefreshCw,
  Download,
  XCircle,
} from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { EmptyState } from "@/components/ui/empty-state"
import { useNotifications } from "@/stores/app"
import { usePermissions } from "@/stores/auth"
import { buildApiUrl, API_ROUTES, getAuthOnlyHeaders } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"
import dynamic from "next/dynamic"

interface ProductTemplate {
  id: string
  name: string
  description: string
  category: string
  statistics: {
    productCount: number
    matchingTaskCount: number
  }
  isActive: boolean
  isDefault: boolean
}

interface MatchingTask {
  _id: string
  templateId: string
  templateName: string
  filename: string
  originalFilename: string
  fileSize: number
  status:
    | "pending"
    | "processing"
    | "review"
    | "completed"
    | "failed"
    | "cancelled"
  progress: {
    totalItems: number
    processedItems: number
    confirmedItems: number
    pendingItems: number
    rejectedItems: number
    exceptionItems: number
  }
  statistics: {
    averageConfidence: number
    matchRate: number
    processingTime: {
      total: number
    }
  }
  config: {
    threshold: number
    autoConfirmThreshold: number
  }
  metadata: {
    priority: "low" | "normal" | "high" | "urgent"
    description: string
  }
  createdAt: string
  completionPercentage: number
}

const StatusChip = ({ status }: { status: string }) => {
  const config = {
    pending: { color: "default" as const, label: "等待中" },
    processing: { color: "primary" as const, label: "处理中" },
    review: { color: "warning" as const, label: "待审核" },
    completed: { color: "success" as const, label: "已完成" },
    failed: { color: "danger" as const, label: "失败" },
    cancelled: { color: "default" as const, label: "已取消" },
  }

  const { color, label } =
    config[status as keyof typeof config] || config.pending

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

const PriorityChip = ({ priority }: { priority: string }) => {
  const config = {
    low: { color: "default" as const, label: "低" },
    normal: { color: "primary" as const, label: "普通" },
    high: { color: "warning" as const, label: "高" },
    urgent: { color: "danger" as const, label: "紧急" },
  }

  const { color, label } =
    config[priority as keyof typeof config] || config.normal

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

function MatchingPage() {
  const [tasks, setTasks] = useState<MatchingTask[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadLoading, setUploadLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("all")
  const [permissionError, setPermissionError] = useState<string | null>(null)

  // 模板相关状态
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // 模态框状态
  const {
    isOpen: isUploadOpen,
    onOpen: onUploadOpen,
    onClose: onUploadClose,
    onOpenChange: onUploadOpenChange,
  } = useDisclosure()

  // 删除确认弹窗状态
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
    onOpenChange: onDeleteOpenChange,
  } = useDisclosure()
  const [taskToDelete, setTaskToDelete] = useState<MatchingTask | null>(null)

  // 打开上传弹窗时自动选择默认模板
  const handleUploadOpen = () => {
    if (!canCreateMatching) {
      return
    }
    // 如果没有选择模板，自动选择默认模板
    if (!selectedTemplateId && templates.length > 0) {
      const defaultTemplate = templates.find(t => t.isDefault)
      const targetTemplate = defaultTemplate || templates[0]
      if (targetTemplate) {
        setSelectedTemplateId(targetTemplate.id)
      }
    }
    onUploadOpen()
  }

  // 通知系统
  const notifications = useNotifications()
  const { hasPermission } = usePermissions()
  const canCreateMatching = hasPermission("matching.create")
  const canReviewMatching =
    hasPermission("matching.review") || hasPermission("matching.confirm")
  const canViewMatching = canCreateMatching || canReviewMatching
  const defaultNoAccessMessage =
    "当前角色暂无匹配任务权限，请联系系统管理员开通。"

  const markNoAccess = (message = defaultNoAccessMessage) => {
    setPermissionError(message)
    setTasks([])
  }

  // 上传配置
  const [uploadConfig, setUploadConfig] = useState({
    threshold: 65,
    autoConfirmThreshold: 90,
    description: "",
    priority: "normal",
  })

  // 获取模板列表
  const fetchTemplates = async () => {
    if (!canViewMatching) {
      setTemplates([])
      setTemplatesLoading(false)
      return
    }

    try {
      setTemplatesLoading(true)
      const response = await fetch(buildApiUrl(API_ROUTES.TEMPLATES.OPTIONS), {
        headers: getAuthHeaders(),
      })

      if (response.status === 403) {
        markNoAccess()
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const templateList = data.data.templates || []
      setTemplates(templateList)

      // 如果没有选中的模板且有模板，选择默认模板或第一个模板
      if (!selectedTemplateId && templateList.length > 0) {
        const defaultTemplate = templateList.find(
          (t: ProductTemplate) => t.isDefault
        )
        setSelectedTemplateId(defaultTemplate?._id || templateList[0]._id)
      }
    } catch (error) {
      console.error("❌ 获取模板列表失败:", error)
      notifications.error("加载失败", "无法获取模板列表")
    } finally {
      setTemplatesLoading(false)
    }
  }

  // 获取匹配任务列表
  const fetchTasks = async () => {
    if (!canViewMatching) {
      markNoAccess()
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setPermissionError(null)
      const response = await fetch(buildApiUrl("/matching/tasks?limit=1000"), {
        headers: getAuthHeaders(),
      })

      if (response.status === 403) {
        markNoAccess("当前账号没有匹配任务权限，无法获取任务列表。")
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setTasks(data.data.tasks)
    } catch (error) {
      console.error("❌ 获取匹配任务失败:", error)
      notifications.error("获取失败", "无法获取匹配任务列表")
    } finally {
      setLoading(false)
    }
  }

  // 创建匹配任务
  const createMatchingTask = async (file: File) => {
    if (!canCreateMatching) {
      notifications.error("权限不足", "当前账号没有创建匹配任务的权限")
      return
    }
    if (!selectedTemplateId) {
      notifications.error("请选择模板", "必须选择一个商品模板才能创建匹配任务")
      return
    }

    try {
      setUploadLoading(true)

      const formData = new FormData()
      formData.append("file", file)
      formData.append("templateId", selectedTemplateId)
      formData.append("threshold", uploadConfig.threshold.toString())
      formData.append(
        "autoConfirmThreshold",
        uploadConfig.autoConfirmThreshold.toString()
      )
      formData.append("description", uploadConfig.description)
      formData.append("priority", uploadConfig.priority)

      const response = await fetch(buildApiUrl("/matching/tasks"), {
        method: "POST",
        headers: getAuthOnlyHeaders(), // 使用不包含Content-Type的认证头
        body: formData,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      notifications.success("上传成功", "匹配任务创建成功")
      onUploadClose()

      // 立即刷新任务列表显示新任务
      await fetchTasks()

      // 自动开始执行
      await executeTask(data.data.task._id)

      // 执行后再次刷新状态
      setTimeout(() => {
        fetchTasks()
      }, 1000)
    } catch (error) {
      console.error("❌ 创建匹配任务失败:", error)
      notifications.error("上传失败", "无法创建匹配任务")
    } finally {
      setUploadLoading(false)
    }
  }

  // 执行匹配任务
  const executeTask = async (taskId: string) => {
    if (!canCreateMatching) {
      notifications.error("权限不足", "当前账号没有执行匹配任务的权限")
      return
    }
    try {
      const response = await fetch(
        buildApiUrl(`/matching/tasks/${taskId}/execute`),
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      )

      if (response.status === 403) {
        markNoAccess("当前账号没有执行匹配任务的权限。")
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("任务启动", "匹配任务已开始执行")

      // 立即刷新状态
      await fetchTasks()

      // 延迟刷新，确保状态变化被捕获
      setTimeout(() => {
        fetchTasks()
      }, 2000)
    } catch (error) {
      console.error("❌ 执行匹配任务失败:", error)
      notifications.error("执行失败", "无法启动匹配任务")
    }
  }

  // 格式化时间
  const formatDuration = (ms: number) => {
    if (!ms) return "未知"
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}小时${minutes % 60}分钟`
    if (minutes > 0) return `${minutes}分钟${seconds % 60}秒`
    return `${seconds}秒`
  }

  // 格式化日期
  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(dateString))
  }

  // 渲染进度信息
  const renderProgress = (task: MatchingTask) => {
    const { progress } = task
    const total = progress.totalItems

    if (total === 0) return <span className="text-default-500">-</span>

    // 计算实际完成百分比
    const completionPercentage =
      total > 0 ? Math.round((progress.processedItems / total) * 100) : 0

    return (
      <div className="space-y-2">
        <Progress
          value={completionPercentage}
          color={task.status === "completed" ? "success" : "primary"}
          size="sm"
          showValueLabel
        />
        <div className="text-xs text-default-500">
          {progress.processedItems}/{total} 项
        </div>
      </div>
    )
  }

  // 打开删除确认弹窗
  const handleDeleteTask = (task: MatchingTask) => {
    setTaskToDelete(task)
    onDeleteOpen()
  }

  // 确认删除任务
  const confirmDeleteTask = async () => {
    if (!taskToDelete) return
    if (!canCreateMatching) {
      notifications.error("权限不足", "当前账号没有删除匹配任务的权限")
      return
    }

    try {
      const response = await fetch(
        buildApiUrl(`/matching/tasks/${taskToDelete._id}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      )

      if (response.status === 403) {
        markNoAccess("当前账号没有删除匹配任务的权限。")
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("删除成功", "匹配任务已删除")
      await fetchTasks()
      onDeleteClose()
    } catch (error) {
      console.error("❌ 删除任务失败:", error)
      notifications.error("删除失败", "无法删除匹配任务")
    } finally {
      setTaskToDelete(null)
    }
  }

  // 检查并更新任务状态
  const checkAndUpdateStatus = async (taskId: string, silent = false) => {
    if (!canCreateMatching) {
      if (!silent) {
        notifications.error("权限不足", "当前账号没有更新任务状态的权限")
      }
      return
    }
    try {
      if (!silent) {
        notifications.info("正在检查", "正在检查任务状态...")
      }

      const response = await fetch(
        buildApiUrl(`/matching/tasks/${taskId}/status`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      )

      if (response.status === 403) {
        markNoAccess("当前账号没有更新任务状态的权限。")
        return
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (!silent) {
        notifications.success("状态已更新", "任务状态检查完成")
      } else {
        console.log("🔄 自动状态检查完成:", {
          taskId,
          newStatus: data.data?.status,
        })
      }

      // 立即刷新任务列表
      await fetchTasks()

      return data
    } catch (error) {
      console.error("❌ 检查状态失败:", error)
      if (!silent) {
        notifications.error("检查失败", "无法更新任务状态")
      }
    }
  }

  // 渲染操作按钮
  const renderActions = (task: MatchingTask) => {
    const manageDisabled = !canCreateMatching || !!permissionError
    const reviewDisabled = !canViewMatching || !!permissionError
    return (
      <div className="flex items-center gap-2">
        {task.status === "pending" && (
          <Button
            isIconOnly
            size="sm"
            variant="light"
            color="primary"
            onClick={() => executeTask(task._id)}
            isDisabled={manageDisabled}
            title="开始执行"
          >
            <Play className="h-4 w-4" />
          </Button>
        )}

        {task.status === "processing" &&
          task.progress.processedItems === task.progress.totalItems &&
          task.progress.totalItems > 0 && (
            <Button
              isIconOnly
              size="sm"
              variant="light"
              color="primary"
              onClick={() => checkAndUpdateStatus(task._id)}
              isDisabled={manageDisabled}
              title="手动检查状态（通常会自动转换）"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}

        {/* 简化流程：直接进入结果管理页面 */}
        {(task.status === "completed" || task.status === "review") && (
          <Button
            size="sm"
            color="primary"
            variant="flat"
            as="a"
            href={`/dashboard/matching/results?taskId=${task._id}&taskName=${encodeURIComponent(task.originalFilename)}&taskIdentifier=${encodeURIComponent(generateTaskIdentifier(task))}`}
            isDisabled={reviewDisabled}
          >
            {task.status === "review" ? "管理匹配" : "查看结果"}
          </Button>
        )}

        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          onClick={() => handleDeleteTask(task)}
          isDisabled={manageDisabled}
          title="删除任务"
        >
          <XCircle className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // 生成任务唯一标识
  const generateTaskIdentifier = (task: MatchingTask) => {
    const date = new Date(task.createdAt)
      .toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "")
    const time = new Date(task.createdAt)
      .toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/:/g, "")
    return `${date}-${time}-${task._id.slice(-4)}`
  }

  // 过滤任务
  const getFilteredTasks = () => {
    switch (activeTab) {
      case "review":
        return tasks.filter(task => task.status === "review")
      case "processing":
        return tasks.filter(task => task.status === "processing")
      case "completed":
        return tasks.filter(task => task.status === "completed")
      case "pending":
        return tasks.filter(task => task.status === "pending")
      case "exception":
        return tasks.filter(task =>
          ["failed", "cancelled"].includes(task.status)
        )
      default:
        return tasks
    }
  }

  // 获取各状态任务数量
  const getTaskCounts = () => {
    return {
      all: tasks.length,
      review: tasks.filter(task => task.status === "review").length,
      processing: tasks.filter(task => task.status === "processing").length,
      completed: tasks.filter(task => task.status === "completed").length,
      pending: tasks.filter(task => task.status === "pending").length,
      exception: tasks.filter(task =>
        ["failed", "cancelled"].includes(task.status)
      ).length,
    }
  }

  const filteredTasks = getFilteredTasks()
  const taskCounts = getTaskCounts()

  useEffect(() => {
    if (!canViewMatching) {
      markNoAccess()
      setLoading(false)
      setTemplates([])
      return
    }

    setPermissionError(null)
    fetchTemplates()
    fetchTasks()
  }, [canViewMatching])

  // 设置智能刷新（处理中的任务）
  useEffect(() => {
    if (!canViewMatching || permissionError) {
      return
    }
    const interval = setInterval(async () => {
      const processingTasks = tasks.filter(task => task.status === "processing")
      if (processingTasks.length > 0) {
        try {
          // 静默获取最新数据，不显示加载状态
          const response = await fetch(
            buildApiUrl("/matching/tasks?limit=1000"),
            {
              headers: getAuthHeaders(),
            }
          )

          if (response.ok) {
            const data = await response.json()
            const newTasks = data.data.tasks

            // 检查是否有实际变化才更新
            const hasChanges = processingTasks.some(oldTask => {
              const newTask = newTasks.find(
                (t: MatchingTask) => t._id === oldTask._id
              )
              return (
                !newTask ||
                newTask.status !== oldTask.status ||
                newTask.progress.processedItems !==
                  oldTask.progress.processedItems ||
                newTask.completionPercentage !== oldTask.completionPercentage
              )
            })

            if (hasChanges) {
              console.log("🔄 检测到任务状态变化，更新界面")
              setTasks(newTasks)

              // 检查是否有100%但仍在处理中的任务，自动触发状态检查
              const stuckTasks = newTasks.filter(
                (task: MatchingTask) =>
                  task.status === "processing" &&
                  task.progress.processedItems === task.progress.totalItems &&
                  task.progress.totalItems > 0
              )

              // 自动触发状态检查，无需用户手动点击
              for (const stuckTask of stuckTasks) {
                console.log("🔄 发现完成的任务，自动检查状态:", stuckTask._id)
                setTimeout(() => {
                  checkAndUpdateStatus(stuckTask._id, true) // silent=true，不显示通知
                }, 1000) // 延迟1秒避免并发
              }
            }
          }
        } catch (error) {
          console.error("❌ 后台刷新失败:", error)
        }
      }
    }, 2000) // 改为2秒刷新一次，提高进度更新的实时性

    return () => clearInterval(interval)
  }, [tasks, canViewMatching, permissionError])

  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">智能匹配</h1>
          <p className="text-default-500">上传批发清单，AI智能匹配官方商品库</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            startContent={<RefreshCw className="h-4 w-4" />}
            onClick={fetchTasks}
            isDisabled={!canViewMatching}
          >
            刷新
          </Button>
          <Button
            color="primary"
            startContent={<Upload className="h-4 w-4" />}
            onClick={handleUploadOpen}
            isDisabled={!canCreateMatching || !!permissionError}
            title={
              !canCreateMatching
                ? "当前角色没有创建匹配任务的权限"
                : permissionError || undefined
            }
          >
            新建匹配任务
          </Button>
        </div>
      </div>

      {/* 匹配任务列表 */}
      <Card>
        <CardHeader>
          <div>
            <h2 className="text-lg font-semibold">匹配任务</h2>
            <p className="text-sm text-default-500">管理您的商品匹配任务</p>
          </div>
        </CardHeader>
        {permissionError ? (
          <CardBody>
            <div className="py-16">
              <EmptyState
                icon={<AlertTriangle className="h-12 w-12 text-warning" />}
                title="暂无访问权限"
                description={permissionError}
                action={
                  canViewMatching
                    ? {
                        label: "重新检测权限",
                        onClick: fetchTasks,
                      }
                    : undefined
                }
              />
            </div>
          </CardBody>
        ) : (
          <CardBody>
            {/* 任务状态Tab */}
            <Tabs
              selectedKey={activeTab}
              onSelectionChange={key => setActiveTab(key as string)}
              className="mb-4"
            >
              <Tab
                key="all"
                title={
                  <div className="flex items-center gap-2">
                    <span>全部</span>
                    {taskCounts.all > 0 && (
                      <Chip size="sm" variant="flat" color="default">
                        {taskCounts.all}
                      </Chip>
                    )}
                  </div>
                }
              />
              <Tab
                key="review"
                title={
                  <div className="flex items-center gap-2">
                    <span>待审核</span>
                    {taskCounts.review > 0 && (
                      <Chip size="sm" variant="flat" color="warning">
                        {taskCounts.review}
                      </Chip>
                    )}
                  </div>
                }
              />
              <Tab
                key="processing"
                title={
                  <div className="flex items-center gap-2">
                    <span>处理中</span>
                    {taskCounts.processing > 0 && (
                      <Chip size="sm" variant="flat" color="primary">
                        {taskCounts.processing}
                      </Chip>
                    )}
                  </div>
                }
              />
              <Tab
                key="completed"
                title={
                  <div className="flex items-center gap-2">
                    <span>已完成</span>
                    {taskCounts.completed > 0 && (
                      <Chip size="sm" variant="flat" color="success">
                        {taskCounts.completed}
                      </Chip>
                    )}
                  </div>
                }
              />
              <Tab
                key="pending"
                title={
                  <div className="flex items-center gap-2">
                    <span>等待中</span>
                    {taskCounts.pending > 0 && (
                      <Chip size="sm" variant="flat" color="default">
                        {taskCounts.pending}
                      </Chip>
                    )}
                  </div>
                }
              />
              {taskCounts.exception > 0 && (
                <Tab
                  key="exception"
                  title={
                    <div className="flex items-center gap-2">
                      <span>异常</span>
                      <Chip size="sm" variant="flat" color="danger">
                        {taskCounts.exception}
                      </Chip>
                    </div>
                  }
                />
              )}
            </Tabs>

            {/* 任务列表内容 */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title={
                  activeTab === "all"
                    ? "暂无匹配任务"
                    : `暂无${activeTab === "review" ? "待审核" : activeTab === "processing" ? "处理中" : activeTab === "completed" ? "已完成" : activeTab === "pending" ? "等待中" : "异常"}任务`
                }
                description={
                  activeTab === "all"
                    ? "上传您的批发清单文件开始智能匹配"
                    : "切换到其他标签页查看更多任务"
                }
                action={
                  activeTab === "all" && canCreateMatching
                    ? {
                        label: "新建任务",
                        onClick: handleUploadOpen,
                      }
                    : undefined
                }
              />
            ) : (
              <Table aria-label="匹配任务表格">
                <TableHeader>
                  <TableColumn>任务标识</TableColumn>
                  <TableColumn>文件名</TableColumn>
                  <TableColumn>使用模板</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>优先级</TableColumn>
                  <TableColumn>进度</TableColumn>
                  <TableColumn>匹配率</TableColumn>
                  <TableColumn>创建时间</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map(task => (
                    <TableRow key={task._id}>
                      <TableCell>
                        <div className="font-mono text-xs">
                          <span className="font-medium text-primary">
                            {generateTaskIdentifier(task)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{task.originalFilename}</p>
                          {task.metadata.description && (
                            <p className="text-xs text-default-500">
                              {task.metadata.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="flat" size="sm" color="secondary">
                          {task.templateName || "未知模板"}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <StatusChip status={task.status} />
                      </TableCell>
                      <TableCell>
                        <PriorityChip priority={task.metadata.priority} />
                      </TableCell>
                      <TableCell>{renderProgress(task)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-success">
                          {task.statistics.matchRate.toFixed(1)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-default-500">
                          {formatDate(task.createdAt)}
                        </span>
                      </TableCell>
                      <TableCell>{renderActions(task)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardBody>
        )}
      </Card>

      {/* 上传任务模态框 */}
      {isUploadOpen && (
        <Modal
          isOpen={isUploadOpen}
          onOpenChange={onUploadOpenChange}
          size="3xl"
        >
          <ModalContent aria-label="upload-modal-content">
            <ModalHeader>新建匹配任务</ModalHeader>
            <ModalBody>
              <Tabs defaultSelectedKey="upload">
                <Tab key="upload" title="上传文件">
                  <div className="space-y-4">
                    {/* 模板选择 */}
                    <div className="rounded-lg border border-divider p-4">
                      <div className="mb-3 flex items-center gap-2">
                        <Settings className="h-5 w-5 text-primary" />
                        <h4 className="font-medium">选择匹配模板</h4>
                      </div>
                      <Select
                        placeholder="请选择商品模板"
                        size="sm"
                        selectedKeys={
                          selectedTemplateId
                            ? new Set([selectedTemplateId])
                            : new Set()
                        }
                        onSelectionChange={keys => {
                          const templateId = Array.from(keys as Set<string>)[0]
                          if (templateId) {
                            setSelectedTemplateId(templateId)
                          }
                        }}
                        isLoading={templatesLoading}
                        isDisabled={templatesLoading}
                        description="选择要用于匹配的商品模板"
                      >
                        {templates.map(template => (
                          <SelectItem
                            key={template.id}
                            textValue={template.name}
                          >
                            <div className="flex w-full items-center justify-between">
                              <div>
                                <span className="font-medium">
                                  {template.name}
                                </span>
                                {template.isDefault && (
                                  <Chip
                                    size="sm"
                                    color="primary"
                                    variant="flat"
                                    className="ml-2"
                                  >
                                    默认
                                  </Chip>
                                )}
                              </div>
                              <div className="text-xs text-default-500">
                                {template.statistics.productCount} 个商品
                              </div>
                            </div>
                          </SelectItem>
                        ))}
                      </Select>
                    </div>

                    {/* 文件上传 */}
                    {selectedTemplateId ? (
                      <FileUpload
                        onUploadSuccess={file => createMatchingTask(file)}
                        acceptedFileTypes={[".xlsx", ".xls", ".csv"]}
                        maxFileSize={10}
                        endpoint=""
                        customUpload
                        isLoading={uploadLoading}
                      />
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-default-300 bg-default-50 p-8 text-center">
                        <Upload className="mx-auto mb-2 h-8 w-8 text-default-400" />
                        <p className="text-sm text-default-500">
                          请先选择模板，然后上传文件
                        </p>
                      </div>
                    )}

                    <div className="rounded-lg bg-default-50 p-4">
                      <h4 className="mb-2 font-medium">📋 文件格式要求</h4>
                      <ul className="space-y-1 text-sm text-default-600">
                        <li>
                          • <strong>批发名</strong>: 商品的口语化名称（必填）
                        </li>
                        <li>
                          • <strong>批发价格</strong>: 商品的批发价格（可选）
                        </li>
                        <li>
                          • <strong>数量</strong>: 采购数量（可选）
                        </li>
                        <li>
                          • <strong>供应商</strong>: 供应商信息（可选）
                        </li>
                      </ul>
                    </div>
                  </div>
                </Tab>

                <Tab key="config" title="匹配配置">
                  <div className="space-y-4">
                    <Input
                      label="匹配阈值"
                      type="number"
                      min="0"
                      max="100"
                      value={uploadConfig.threshold.toString()}
                      onChange={e =>
                        setUploadConfig({
                          ...uploadConfig,
                          threshold: Number(e.target.value),
                        })
                      }
                      description="低于此分数的匹配将被标记为异常"
                      endContent="%"
                    />

                    <Input
                      label="自动确认阈值"
                      type="number"
                      min="0"
                      max="100"
                      value={uploadConfig.autoConfirmThreshold.toString()}
                      onChange={e =>
                        setUploadConfig({
                          ...uploadConfig,
                          autoConfirmThreshold: Number(e.target.value),
                        })
                      }
                      description="高于此分数的匹配将自动确认"
                      endContent="%"
                    />

                    <Select
                      label="任务优先级"
                      selectedKeys={new Set([uploadConfig.priority])}
                      onSelectionChange={keys => {
                        const priority = Array.from(keys as Set<string>)[0]
                        if (priority) {
                          setUploadConfig({
                            ...uploadConfig,
                            priority,
                          })
                        }
                      }}
                    >
                      <SelectItem key="low">低优先级</SelectItem>
                      <SelectItem key="normal">普通优先级</SelectItem>
                      <SelectItem key="high">高优先级</SelectItem>
                      <SelectItem key="urgent">紧急优先级</SelectItem>
                    </Select>

                    <Textarea
                      label="任务描述"
                      placeholder="可选的任务描述信息"
                      value={uploadConfig.description}
                      onChange={e =>
                        setUploadConfig({
                          ...uploadConfig,
                          description: e.target.value,
                        })
                      }
                      rows={3}
                    />
                  </div>
                </Tab>
              </Tabs>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onUploadClose}>
                取消
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* 删除确认弹窗 */}
      {isDeleteOpen && (
        <Modal
          isOpen={isDeleteOpen}
          onOpenChange={onDeleteOpenChange}
          size="md"
        >
          <ModalContent aria-label="delete-modal-content">
            <ModalHeader className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-danger" />
                <span>确认删除匹配任务</span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-4">
                {taskToDelete && (
                  <div className="rounded-lg bg-default-50 p-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-default-500" />
                        <span className="font-medium">
                          {taskToDelete.originalFilename}
                        </span>
                      </div>
                      <div className="text-sm text-default-500">
                        <div>任务ID: {taskToDelete._id}</div>
                        <div>
                          创建时间: {formatDate(taskToDelete.createdAt)}
                        </div>
                        <div>
                          状态: <StatusChip status={taskToDelete.status} />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="rounded-lg border border-danger-200 bg-danger-50 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-danger" />
                    <div className="space-y-2">
                      <h4 className="font-medium text-danger">警告</h4>
                      <div className="text-sm text-danger-600">
                        <p>删除此匹配任务将会：</p>
                        <ul className="mt-2 list-inside list-disc space-y-1">
                          <li>永久删除任务及其所有匹配记录</li>
                          <li>删除相关的审核历史和统计数据</li>
                          <li>此操作无法撤销</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onDeleteClose}>
                取消
              </Button>
              <Button
                color="danger"
                onPress={confirmDeleteTask}
                startContent={<XCircle className="h-4 w-4" />}
              >
                确认删除
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}
    </div>
  )
}

export default dynamic(() => Promise.resolve(MatchingPage), { ssr: false })
