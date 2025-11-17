"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardBody,
  CardHeader,
  Tabs,
  Tab,
  Input,
  Button,
  Checkbox,
  Chip,
  Divider,
  Link,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  useDisclosure,
} from "@nextui-org/react"
import {
  Eye,
  EyeOff,
  User,
  Lock,
  LogIn,
  Sparkles,
  ShieldCheck,
  LineChart,
  Workflow,
  UserPlus,
  Mail,
  ArrowRight,
} from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"
import { useAuthStore } from "@/stores/auth"
import { useNotifications } from "@/stores/app"
import { ROUTES, APP_NAME } from "@/constants"
import type { LoginCredentials, RegisterPayload } from "@/types"

type ActiveTab = "login" | "register"

interface RegisterFormState {
  username: string
  password: string
  confirmPassword: string
}

const loginInitialState: LoginCredentials = {
  username: "",
  password: "",
}

const registerInitialState: RegisterFormState = {
  username: "",
  password: "",
  confirmPassword: "",
}

const featureHighlights = [
  {
    icon: Sparkles,
    title: "AI 智能匹配",
    description: "结合多维算法与记忆库，毫秒级匹配标准商品档案。",
  },
  {
    icon: ShieldCheck,
    title: "企业级安全",
    description: "细粒度权限控制、多重审核流程保障数据可靠性。",
  },
  {
    icon: LineChart,
    title: "全局可视化",
    description: "实时看板与趋势分析，洞察匹配效率与业务健康度。",
  },
  {
    icon: Workflow,
    title: "协同工作流",
    description: "运营、审核、专家协作无缝衔接，支持多角色协同。",
  },
]

export default function LoginPage() {
  const router = useRouter()
  const {
    login,
    register,
    requestPasswordReset,
    isAuthenticated,
    clearError,
    error,
  } = useAuthStore()
  const { success: showSuccess, error: showError } = useNotifications()

  const [activeTab, setActiveTab] = useState<ActiveTab>("login")
  const [loginForm, setLoginForm] =
    useState<LoginCredentials>(loginInitialState)
  const [registerForm, setRegisterForm] =
    useState<RegisterFormState>(registerInitialState)
  const [loginErrors, setLoginErrors] = useState<Record<string, string>>({})
  const [registerErrors, setRegisterErrors] = useState<Record<string, string>>(
    {}
  )
  const [rememberMe, setRememberMe] = useState<boolean>(false)
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [registerSubmitting, setRegisterSubmitting] = useState(false)
  const [forgotEmail, setForgotEmail] = useState("")
  const [forgotError, setForgotError] = useState("")
  const [forgotSubmitting, setForgotSubmitting] = useState(false)
  const [loginPasswordVisible, setLoginPasswordVisible] = useState(false)
  const [registerPasswordVisible, setRegisterPasswordVisible] = useState(false)
  const [registerConfirmVisible, setRegisterConfirmVisible] = useState(false)

  const {
    isOpen: isForgotOpen,
    onOpen: onForgotOpen,
    onOpenChange: onForgotOpenChange,
    onClose: onForgotClose,
  } = useDisclosure()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace(ROUTES.PRODUCTS)
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (error) {
      showError("操作失败", error)
      clearError()
    }
  }, [error, showError, clearError])

  const heroSubtitle = useMemo(
    () =>
      [
        "让复杂的商品匹配变得轻盈优雅",
        "数据与智能的灵感交汇之地",
        "一次登录，开启高效协同体验",
      ][Math.floor(Math.random() * 3)],
    []
  )

  const validateLogin = () => {
    const errors: Record<string, string> = {}
    if (!loginForm.username.trim()) {
      errors.username = "请输入用户名"
    }
    if (!loginForm.password) {
      errors.password = "请输入密码"
    }
    setLoginErrors(errors)
    return Object.keys(errors).length === 0
  }

  const validateRegister = () => {
    const errors: Record<string, string> = {}
    if (!registerForm.username.trim()) {
      errors.username = "请设置登录用户名"
    } else if (registerForm.username.length < 3) {
      errors.username = "用户名长度至少 3 位"
    }
    if (!registerForm.password || registerForm.password.length < 6) {
      errors.password = "密码长度至少 6 位"
    }
    if (registerForm.confirmPassword !== registerForm.password) {
      errors.confirmPassword = "两次密码输入不一致"
    }
    setRegisterErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleLoginChange = (field: keyof LoginCredentials, value: string) => {
    setLoginForm(prev => ({ ...prev, [field]: value }))
    if (loginErrors[field]) {
      setLoginErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleRegisterChange = (
    field: keyof RegisterFormState,
    value: string
  ) => {
    setRegisterForm(prev => ({ ...prev, [field]: value }))
    if (registerErrors[field]) {
      setRegisterErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateLogin()) return

    setLoginSubmitting(true)
    const success = await login(loginForm)
    setLoginSubmitting(false)

    if (success) {
      showSuccess("登录成功", `欢迎回来，${APP_NAME}`)
      router.replace(ROUTES.PRODUCTS)
    }
  }

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!validateRegister()) return

    const { confirmPassword, ...payload } = registerForm

    const registerPayload: RegisterPayload = {
      ...payload,
    }

    setRegisterSubmitting(true)
    const success = await register(registerPayload)
    setRegisterSubmitting(false)

    if (success) {
      showSuccess("注册成功", "已为您自动登录，祝使用愉快")
      router.replace(ROUTES.PRODUCTS)
    }
  }

  const handleForgotSubmit = async () => {
    if (!forgotEmail.trim()) {
      setForgotError("请输入注册邮箱")
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      setForgotError("邮箱格式不正确")
      return
    }

    setForgotSubmitting(true)
    const result = await requestPasswordReset({ email: forgotEmail.trim() })
    setForgotSubmitting(false)

    if (result.success) {
      showSuccess("邮件已发送", result.message)
      setForgotEmail("")
      setForgotError("")
      onForgotClose()
    } else {
      setForgotError(result.message)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full bg-gradient-to-r from-blue-500/40 via-indigo-500/30 to-purple-500/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-15%] h-[30rem] w-[30rem] rounded-full bg-gradient-to-r from-cyan-500/30 via-sky-500/20 to-blue-500/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.1),transparent_60%)]" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-6xl items-start gap-12 px-6 py-16 lg:grid-cols-2 lg:px-12 xl:max-w-7xl">
        <section className="hidden flex-col gap-10 text-white lg:flex">
          <Chip
            variant="flat"
            color="primary"
            className="w-fit bg-white/10 px-4 py-1 text-sm font-medium tracking-wide text-white"
          >
            智能商品匹配 · 新一代工作台
          </Chip>
          <div className="space-y-4">
            <h1 className="text-4xl font-semibold leading-tight text-white sm:text-5xl">
              {APP_NAME}
            </h1>
            <p className="text-lg text-slate-300">{heroSubtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {featureHighlights.map(feature => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-lg transition-all duration-300 hover:border-white/30 hover:bg-white/15"
              >
                <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-blue-500/20 blur-2xl transition duration-300 group-hover:scale-125" />
                <feature.icon className="mb-3 h-6 w-6 text-blue-300" />
                <h3 className="text-lg font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-white/10 p-6 backdrop-blur-lg">
            <p className="font-medium text-white">强大协同，倍速推进业务</p>
            <p className="mt-2 text-sm text-slate-300">
              多角色协作、实时统计、智能记忆匹配，让数据决策与团队协作一步到位。
            </p>
          </div>
        </section>

        <section className="relative w-full pt-14 lg:mt-6 lg:w-auto lg:self-start lg:pt-12">
          <div className="absolute inset-0 -z-10 rounded-[2.5rem] bg-gradient-to-b from-white/20 to-white/5 blur-3xl" />
          <motion.div
            layout
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.4, 1] }}
          >
            <Card className="relative overflow-hidden border border-white/10 bg-white/80 shadow-2xl shadow-blue-500/20 backdrop-blur-xl dark:bg-slate-900/70">
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500" />
              <CardHeader className="flex flex-col items-center gap-2 pb-3 pt-8 text-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-500/10 px-4 py-1 text-xs font-medium uppercase tracking-widest text-blue-500">
                  <Sparkles className="h-3.5 w-3.5" />
                  欢迎回到 {APP_NAME}
                </span>
                <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                  登录你的智能工作台
                </h2>
                <p className="max-w-sm text-sm text-slate-500 dark:text-slate-300">
                  统一入口，助力商品档案匹配、审核协作与价格管控在一个界面顺畅完成。
                </p>
              </CardHeader>
              <Divider className="mx-12 mb-6 mt-2 border-white/20" />

              <CardBody className="overflow-hidden pb-10">
                <Tabs
                  selectedKey={activeTab}
                  onSelectionChange={key => setActiveTab(key as ActiveTab)}
                  variant="solid"
                  classNames={{
                    tabList:
                      "relative grid h-12 grid-cols-2 gap-2 rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/80 overflow-hidden border border-white/30",
                    cursor:
                      "rounded-xl bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-500 shadow-md transition-transform duration-500 ease-[0.45,0,0.55,1] !inset-y-0",
                    tab: "h-full max-w-none rounded-xl text-sm font-semibold text-slate-500 transition-colors data-[selected=true]:text-white dark:text-slate-300",
                  }}
                >
                  <Tab
                    key="login"
                    title={
                      <div className="flex items-center justify-center gap-2">
                        <LogIn className="h-4 w-4" />
                        <span>账户登录</span>
                      </div>
                    }
                  >
                    <AnimatePresence mode="wait">
                      {activeTab === "login" && (
                        <motion.form
                          key="login-form"
                          onSubmit={handleLoginSubmit}
                          className="mt-6 flex flex-col gap-5"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{
                            duration: 0.45,
                            ease: [0.33, 1, 0.68, 1],
                          }}
                        >
                          <Input
                            label="用户名"
                            variant="bordered"
                            value={loginForm.username}
                            onValueChange={value =>
                              handleLoginChange("username", value)
                            }
                            startContent={
                              <User className="h-4 w-4 text-slate-400" />
                            }
                            isInvalid={!!loginErrors.username}
                            errorMessage={loginErrors.username}
                            placeholder="输入注册时的用户名"
                          />
                          <Input
                            label="密码"
                            variant="bordered"
                            value={loginForm.password}
                            onValueChange={value =>
                              handleLoginChange("password", value)
                            }
                            startContent={
                              <Lock className="h-4 w-4 text-slate-400" />
                            }
                            endContent={
                              <button
                                type="button"
                                onClick={() => setLoginPasswordVisible(v => !v)}
                                className="text-slate-400 transition hover:text-slate-600 focus:outline-none"
                              >
                                {loginPasswordVisible ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </button>
                            }
                            type={loginPasswordVisible ? "text" : "password"}
                            isInvalid={!!loginErrors.password}
                            errorMessage={loginErrors.password}
                            placeholder="请输入密码"
                          />
                          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                            <Checkbox
                              isSelected={rememberMe}
                              onValueChange={setRememberMe}
                              size="sm"
                            >
                              记住我
                            </Checkbox>
                            <Link
                              className="text-sm font-medium text-blue-600 hover:text-blue-500"
                              onPress={onForgotOpen}
                            >
                              忘记密码？
                            </Link>
                          </div>
                          <Button
                            type="submit"
                            size="lg"
                            className="h-12 w-full rounded-xl bg-gradient-to-r from-blue-500 via-sky-500 to-indigo-500 text-base font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:shadow-xl hover:brightness-110"
                            isLoading={loginSubmitting}
                          >
                            {loginSubmitting ? "登录中..." : "立即登录"}
                          </Button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </Tab>

                  <Tab
                    key="register"
                    title={
                      <div className="flex items-center justify-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span>快速注册</span>
                      </div>
                    }
                  >
                    <AnimatePresence mode="wait">
                      {activeTab === "register" && (
                        <motion.div
                          key="register-form"
                          className="mt-6"
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -16 }}
                          transition={{
                            duration: 0.45,
                            ease: [0.33, 1, 0.68, 1],
                          }}
                        >
                          <form
                            onSubmit={handleRegisterSubmit}
                            className="flex flex-col gap-5"
                          >
                            <Input
                              label="用户名"
                              variant="bordered"
                              value={registerForm.username}
                              onValueChange={value =>
                                handleRegisterChange("username", value)
                              }
                              startContent={
                                <User className="h-4 w-4 text-slate-400" />
                              }
                              isInvalid={!!registerErrors.username}
                              errorMessage={registerErrors.username}
                              placeholder="用于登录，支持中英文与数字，至少 3 个字符"
                            />
                            <Input
                              label="密码"
                              variant="bordered"
                              value={registerForm.password}
                              onValueChange={value =>
                                handleRegisterChange("password", value)
                              }
                              startContent={
                                <Lock className="h-4 w-4 text-slate-400" />
                              }
                              endContent={
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRegisterPasswordVisible(v => !v)
                                  }
                                  className="text-slate-400 transition hover:text-slate-600 focus:outline-none"
                                >
                                  {registerPasswordVisible ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              }
                              type={
                                registerPasswordVisible ? "text" : "password"
                              }
                              isInvalid={!!registerErrors.password}
                              errorMessage={registerErrors.password}
                              placeholder="至少 6 位，建议包含数字与字母"
                            />
                            <Input
                              label="确认密码"
                              variant="bordered"
                              value={registerForm.confirmPassword}
                              onValueChange={value =>
                                handleRegisterChange("confirmPassword", value)
                              }
                              startContent={
                                <Lock className="h-4 w-4 text-slate-400" />
                              }
                              endContent={
                                <button
                                  type="button"
                                  onClick={() =>
                                    setRegisterConfirmVisible(v => !v)
                                  }
                                  className="text-slate-400 transition hover:text-slate-600 focus:outline-none"
                                >
                                  {registerConfirmVisible ? (
                                    <EyeOff className="h-4 w-4" />
                                  ) : (
                                    <Eye className="h-4 w-4" />
                                  )}
                                </button>
                              }
                              type={
                                registerConfirmVisible ? "text" : "password"
                              }
                              isInvalid={!!registerErrors.confirmPassword}
                              errorMessage={registerErrors.confirmPassword}
                              placeholder="再次输入密码"
                            />
                            <Button
                              type="submit"
                              size="lg"
                              className="h-12 w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-base font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-xl hover:brightness-110"
                              isLoading={registerSubmitting}
                            >
                              {registerSubmitting
                                ? "创建中..."
                                : "立即注册并登录"}
                            </Button>
                            <p className="text-center text-xs text-slate-500">
                              注册即表示你已知晓并同意平台使用规范。
                            </p>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Tab>
                </Tabs>
              </CardBody>
            </Card>
          </motion.div>

          <div className="mt-10 flex flex-col items-center gap-3 text-center text-xs text-slate-500">
            <p>
              © {new Date().getFullYear()} Smart Match System ·
              智能商品匹配服务平台
            </p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/60 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300">
                <ArrowRight className="h-3.5 w-3.5" />
                联系管理员获取企业专属部署
              </span>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isForgotOpen}
        onOpenChange={onForgotOpenChange}
        placement="center"
        size="md"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-blue-600">
              <Mail className="h-5 w-5" />
              <span className="text-lg font-semibold">重置密码</span>
            </div>
            <p className="text-sm text-slate-500">
              输入注册邮箱，我们会发送一封包含重置链接的邮件。
            </p>
          </ModalHeader>
          <ModalBody className="pb-0">
            <Input
              label="注册邮箱"
              variant="bordered"
              type="email"
              value={forgotEmail}
              onValueChange={value => {
                setForgotEmail(value)
                if (forgotError) setForgotError("")
              }}
              placeholder="yourname@example.com"
              isInvalid={!!forgotError}
              errorMessage={forgotError}
              startContent={<Mail className="h-4 w-4 text-slate-400" />}
            />
            <p className="text-xs text-slate-400">
              如果邮箱存在于系统中，你将在 1 分钟内收到邮件。
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onForgotClose}>
              取消
            </Button>
            <Button
              color="primary"
              className="shadow-md shadow-blue-500/30"
              isLoading={forgotSubmitting}
              onPress={handleForgotSubmit}
            >
              发送邮件
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
