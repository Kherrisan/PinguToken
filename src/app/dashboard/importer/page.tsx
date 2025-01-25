import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImportSourceSelector } from "@/components/importers/source-selector"
import { Suspense } from "react"

export default function ImporterPage() {
    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                {/* 页面标题 */}
                <div>
                    <h1 className="text-2xl font-semibold">数据导入</h1>
                    <p className="text-sm text-muted-foreground">从不同来源导入交易数据</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>选择导入来源</CardTitle>
                        <CardDescription>
                            选择要导入的账单来源，并上传相应的账单文件
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Suspense fallback={<div>加载中...</div>}>
                            <ImportSourceSelector />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
} 