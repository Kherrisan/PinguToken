"use client"

import { useState } from "react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { AlipayUploader } from "./alipay-uploader"
import { WechatUploader } from "./wechat-uploader"
import { Separator } from "@/components/ui/separator"
import { SEUUploader } from "./seu-uploader"

const sources = [
    {
        id: "alipay",
        name: "支付宝",
        description: "从支付宝导出的 CSV 账单文件导入交易记录",
        component: AlipayUploader
    },
    {
        id: "wechat",
        name: "微信支付",
        description: "从微信支付导出的账单文件导入交易记录",
        component: WechatUploader
    },
    {
        id: "seu",
        name: "东大一卡通",
        description: "从东大一卡通导出的账单文件导入交易记录",
        component: SEUUploader
    }
] as const

export function ImportSourceSelector() {
    const [selectedSource, setSelectedSource] = useState<string>("alipay")
    const source = sources.find(s => s.id === selectedSource)
    const Uploader = source?.component

    return (
        <div className="space-y-6">
            <RadioGroup
                defaultValue="alipay"
                onValueChange={setSelectedSource}
                className="grid grid-cols-2 gap-4"
            >
                {sources.map((source) => (
                    <div key={source.id}>
                        <RadioGroupItem
                            value={source.id}
                            id={source.id}
                            className="peer sr-only"
                        />
                        <Label
                            htmlFor={source.id}
                            className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-transparent p-4 hover:bg-muted/50 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                        >
                            <div className="mb-2 font-semibold">{source.name}</div>
                            <div className="text-sm text-muted-foreground">
                                {source.description}
                            </div>
                        </Label>
                    </div>
                ))}
            </RadioGroup>

            {Uploader && (
                <>
                    <Separator />
                    <div className="pt-4">
                        <Uploader />
                    </div>
                </>
            )}
        </div>
    )
} 