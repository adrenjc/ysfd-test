# 智能商品匹配系统 - 前端

基于 Next.js 14 + NextUI + TypeScript 构建的现代化商品匹配管理系统前端应用。

## ✨ 技术栈

- **框架**: Next.js 14.x + React 18.x + TypeScript 5.x
- **UI 组件库**: NextUI 2.x (基于 React Aria + Tailwind CSS)
- **状态管理**: Zustand + SWR
- **路由**: Next.js App Router
- **图表**: Recharts
- **表格**: @tanstack/react-table
- **样式**: Tailwind CSS
- **构建工具**: Next.js (Turbopack)
- **包管理**: pnpm

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- pnpm >= 8.0.0

### 安装依赖

```bash
# 使用 pnpm 安装依赖
pnpm install

# 或使用 npm
npm install
```

### 环境配置

创建 `.env.local` 文件：

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME="智能商品匹配系统"
NEXT_PUBLIC_APP_DESCRIPTION="基于AI的商品匹配与价格管理系统"

# Development
NODE_ENV=development
NEXT_TELEMETRY_DISABLED=1
```

### 开发运行

```bash
# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 类型检查
pnpm type-check

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 修复代码问题
pnpm lint:fix
```

## 📁 项目结构

```
src/
├── app/                    # Next.js App Router
│   ├── (dashboard)/        # 仪表板路由组
│   │   ├── dashboard/      # 仪表板页面
│   │   ├── products/       # 商品管理
│   │   ├── matching/       # 智能匹配
│   │   ├── review/         # 审核中心
│   │   ├── prices/         # 价格管理
│   │   ├── reports/        # 数据报表
│   │   └── settings/       # 系统设置
│   ├── auth/              # 认证相关页面
│   ├── globals.css        # 全局样式
│   ├── layout.tsx         # 根布局
│   ├── page.tsx           # 首页
│   └── providers.tsx      # 应用提供者
├── components/            # 可复用组件
│   ├── layout/           # 布局组件
│   └── ui/               # 基础UI组件
├── lib/                  # 工具库
├── hooks/                # 自定义Hooks
├── stores/               # 状态管理
├── types/                # TypeScript类型定义
├── constants/            # 常量定义
└── utils/                # 工具函数
```

## 🎨 主要功能

### 🔐 认证系统
- 用户登录/登出
- JWT 令牌管理
- 权限控制
- 会话管理

### 📊 仪表板
- 实时数据统计
- 系统性能监控
- 最近任务状态
- 价格预警信息

### 📦 商品管理
- 商品信息维护
- 批量导入/导出
- 商品状态管理
- 关键词标签

### 🤖 智能匹配
- 文件上传匹配
- 匹配配置设置
- 实时进度监控
- 结果预览

### ✅ 审核中心
- 匹配结果审核
- 批量操作
- 审核历史
- 优先级管理

### 💰 价格管理
- 价格变动监控
- 预警设置
- 趋势分析
- 批量更新

### 📈 数据报表
- 匹配准确率统计
- 效率分析
- 趋势图表
- 数据导出

## 🔧 开发指南

### 组件开发

使用 NextUI 组件库进行开发：

```tsx
import { Button, Card, Input } from "@nextui-org/react"

export function MyComponent() {
  return (
    <Card>
      <Input placeholder="请输入..." />
      <Button color="primary">确认</Button>
    </Card>
  )
}
```

### 状态管理

使用 Zustand 进行状态管理：

```tsx
import { useAuthStore } from "@/stores/auth"

export function MyComponent() {
  const { user, login, logout } = useAuthStore()
  
  return (
    <div>
      {user ? (
        <Button onPress={logout}>退出</Button>
      ) : (
        <Button onPress={() => login(credentials)}>登录</Button>
      )}
    </div>
  )
}
```

### 数据获取

使用 SWR 进行数据获取：

```tsx
import useSWR from "swr"

export function ProductList() {
  const { data, error, isLoading } = useSWR("/api/products")
  
  if (isLoading) return <div>加载中...</div>
  if (error) return <div>加载失败</div>
  
  return (
    <div>
      {data?.products?.map(product => (
        <div key={product.id}>{product.name}</div>
      ))}
    </div>
  )
}
```

### 路由导航

使用 Next.js App Router：

```tsx
import Link from "next/link"
import { useRouter } from "next/navigation"

export function Navigation() {
  const router = useRouter()
  
  return (
    <nav>
      <Link href="/dashboard">仪表板</Link>
      <button onClick={() => router.push("/products")}>
        商品管理
      </button>
    </nav>
  )
}
```

## 🎨 主题系统

支持明亮/暗黑主题切换：

```tsx
import { useTheme } from "next-themes"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      切换主题
    </button>
  )
}
```

## 📱 响应式设计

使用 Tailwind CSS 进行响应式开发：

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="col-span-1 md:col-span-2">内容</Card>
</div>
```

## 🚀 部署

### 生产构建

```bash
# 构建应用
pnpm build

# 启动生产服务器
pnpm start
```

### 静态导出

```bash
# 导出静态文件
pnpm build
pnpm export
```

## 📝 代码规范

项目使用 ESLint + Prettier 进行代码规范：

```bash
# 检查代码规范
pnpm lint

# 自动修复
pnpm lint:fix

# 格式化代码
pnpm format
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。详情请参阅 [LICENSE](LICENSE) 文件。

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 提交 Issue
- 发送邮件至 support@smartmatch.com
- 访问项目文档站点

---

© 2024 Smart Match System. All rights reserved.

## Deployment

### Automated pipeline

1. Generate an SSH key pair dedicated to deployments and add the public key to the target server user (`~/.ssh/authorized_keys`).
2. Create the following GitHub repository secrets:
   - `DEPLOY_HOST`: server IP or hostname.
   - `DEPLOY_USER`: SSH user with write access to the deploy directory.
   - `DEPLOY_PATH`: absolute path serving the static files (e.g. `/var/www/adrenjc/current`).
   - `DEPLOY_KEY`: private key contents (PEM format) matching the public key you installed.
   - `DEPLOY_PORT` *(optional)*: custom SSH port, defaults to `22`.
   - `POST_DEPLOY_CMD` *(optional)*: command executed after upload, e.g. `sudo systemctl reload nginx`.
3. Ensure `rsync` and `nginx` are installed on the server and the deploy user can reload nginx (configure passwordless sudo if required).
4. Configure nginx using `deploy/nginx.adrenjc.cn.conf` as a reference and point the `root` directive to `DEPLOY_PATH`.
5. Push to the `master` branch or trigger the `Deploy` workflow manually; GitHub Actions will build the static site and rsync it to the server.

### Local deploy

The deployment script can also run locally:

```bash
DEPLOY_HOST=1.2.3.4 \
DEPLOY_USER=deploy \
DEPLOY_PATH=/var/www/adrenjc/current \
DEPLOY_KEY="$(cat ~/.ssh/github-action)" \
POST_DEPLOY_CMD="sudo systemctl reload nginx" \
bash scripts/deploy.sh
```

Set `SKIP_BUILD=1` if you only want to sync a manually built `out/` directory.
