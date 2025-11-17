"use client"

import { useState } from "react"
import {
  Button,
  Card,
  CardBody,
  Chip,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Tabs,
  Tab,
} from "@nextui-org/react"
import { ArrowRight, CheckCircle2, FileDown, Sparkles } from "lucide-react"

type GuideTab = "product" | "matching"

interface HowToUseGuideProps {
  defaultTab?: GuideTab
}

const SAMPLE_FILES: Record<
  GuideTab,
  { label: string; path: string; description: string }
> = {
  product: {
    label: "商品模板示例",
    path: "/guides/product-template.xlsx",
    description:
      "将 Excel 放在 public/guides/product-template.xlsx 后即可下载。",
  },
  matching: {
    label: "匹配任务示例",
    path: "/guides/matching-sample.xlsx",
    description:
      "把批发清单示例文件命名为 matching-sample.xlsx 并放入 public/guides/。",
  },
}

const GUIDE_STEPS: Record<
  GuideTab,
  Array<{ title: string; description: string; highlights: string[] }>
> = {
  product: [
    {
      title: "准备模板并整理字段",
      description: "下载官方模板，按字段说明补齐品牌、规格、价格等信息。",
      highlights: ["支持批量导入", "字段可按模板中的备注格式填写"],
    },
    {
      title: "上传或新增商品",
      description:
        "通过“批量导入”上传整理好的 Excel，或使用“新增商品”单条录入。",
      highlights: [
        "导入前可先选择目标商品模板",
        "系统自动校验缺失字段并给出错误提示",
      ],
    },
    {
      title: "管理与分析",
      description: "使用高级筛选、分页及导出能力快速定位商品并进行二次编辑。",
      highlights: ["一键刷新保持列表最新", "支持多选后批量操作"],
    },
  ],
  matching: [
    {
      title: "下载匹配示例",
      description:
        "根据示例文件准备批发清单，建议包含商品名称、SKU、数量、渠道等核心字段。",
      highlights: ["保持列名一致", "可根据业务额外扩展自定义列"],
    },
    {
      title: "创建匹配任务",
      description:
        "在智能匹配页面点击“新建匹配任务”，选择阈值与自动确认策略后上传清单。",
      highlights: ["允许设置自动确认阈值", "任务可随时暂停或重新上传"],
    },
    {
      title: "复审与确认",
      description:
        "任务完成后进入复核流程，对 AI 结果进行快速确认、批量处理或导出。",
      highlights: ["支持批量确认", "异常项会单独标记提醒"],
    },
  ],
}

const SectionTag = ({ label }: { label: string }) => (
  <Chip
    size="sm"
    variant="flat"
    color="primary"
    className="uppercase tracking-wider"
  >
    {label}
  </Chip>
)

const StepsList = ({
  tab,
  sample,
}: {
  tab: GuideTab
  sample?: { label: string; path: string }
}) => (
  <ol className="space-y-4">
    {GUIDE_STEPS[tab].map((step, index) => (
      <li
        key={step.title}
        className="rounded-2xl border border-default-100 bg-content1/60 p-4 shadow-sm"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
              {index + 1}
            </span>
            <div className="space-y-2">
              <div>
                <p className="text-sm font-medium uppercase text-default-400">
                  STEP {index + 1}
                </p>
                <h4 className="text-lg font-semibold text-foreground">
                  {step.title}
                </h4>
                <p className="text-sm text-default-500">{step.description}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {step.highlights.map(highlight => (
                  <Chip
                    key={highlight}
                    size="sm"
                    variant="flat"
                    color="success"
                    startContent={<CheckCircle2 className="h-3 w-3" />}
                  >
                    {highlight}
                  </Chip>
                ))}
              </div>
            </div>
          </div>

          {sample && index === 0 && (
            <Button
              as="a"
              href={sample.path}
              download
              variant="flat"
              color="primary"
              startContent={<FileDown className="h-4 w-4" />}
              className="md:self-center"
            >
              {sample.label}
            </Button>
          )}
        </div>
      </li>
    ))}
  </ol>
)

export function HowToUseGuide({ defaultTab = "product" }: HowToUseGuideProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<GuideTab>(defaultTab)

  const handleOpen = () => {
    setActiveTab(defaultTab)
    setIsOpen(true)
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      <Button
        variant="bordered"
        startContent={<Sparkles className="h-4 w-4" />}
        onPress={handleOpen}
      >
        使用指引
      </Button>

      {isOpen && (
        <Modal
          isOpen
          onOpenChange={setIsOpen}
          size="3xl"
          scrollBehavior="outside"
        >
          <ModalContent>
            {() => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  <SectionTag label="How to Use · 操作指南" />
                  <div>
                    <h2 className="text-xl font-semibold">
                      商品管理 & 智能匹配全流程
                    </h2>
                    <p className="text-sm text-default-500">
                      通过 3
                      步即可完成商品建档到批量匹配的演示，支持上传示例文件快速体验。
                    </p>
                  </div>
                </ModalHeader>

                <ModalBody>
                  <Tabs
                    selectedKey={activeTab}
                    onSelectionChange={key => setActiveTab(key as GuideTab)}
                    variant="underlined"
                    classNames={{
                      tabList:
                        "border-b border-default-100 bg-content1/50 backdrop-blur",
                      cursor: "bg-primary",
                      tab: "px-4 data-[selected=true]:text-primary",
                    }}
                  >
                    <Tab
                      key="product"
                      title={
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4" />
                          <span>商品管理</span>
                        </div>
                      }
                    >
                      <StepsList tab="product" sample={SAMPLE_FILES.product} />
                    </Tab>

                    <Tab
                      key="matching"
                      title={
                        <div className="flex items-center gap-2">
                          <ArrowRight className="h-4 w-4" />
                          <span>智能匹配</span>
                        </div>
                      }
                    >
                      <StepsList
                        tab="matching"
                        sample={SAMPLE_FILES.matching}
                      />
                    </Tab>
                  </Tabs>
                </ModalBody>

                <ModalFooter className="justify-end">
                  <Button color="primary" onPress={handleClose}>
                    我已了解
                  </Button>
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
    </>
  )
}
