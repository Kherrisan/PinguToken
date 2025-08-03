"use client"

import { useAccounts } from "@/hooks/use-accounts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AccountType } from "@prisma/client"
import { cn } from "@/lib/utils"
import { AssetPieChart } from "@/components/charts/asset-pie-chart"

export default function OverviewPage() {
    const { accounts, isLoading } = useAccounts()

    // 计算资产概览数据
    const overview = accounts?.reduce((acc, account) => {
        const balance = parseFloat(account.balance)
        if (account.type === 'ASSETS' && balance !== 0) {
            acc.totalAssets += balance
            acc.accounts.push({
                ...account,
                balance
            })
        }
        return acc
    }, {
        totalAssets: 0,
        accounts: [] as Array<{
            id: string
            path: string
            balance: number
            currency: string
        }>
    })

    // 按余额降序排序
    overview?.accounts.sort((a, b) => b.balance - a.balance)

    // 准备扇形图数据
    const chartData = overview?.accounts.map(account => {
        // 提取账户的最后一级名称作为简短显示
        const shortName = account.path.split(' / ').pop() || account.path
        // 如果简短名称仍然太长，则截断
        const displayName = shortName.length > 15 ? shortName.substring(0, 15) + '...' : shortName
        
        return {
            name: displayName,
            fullPath: account.path, // 保留完整路径用于提示
            value: account.balance,
            percentage: (account.balance / overview.totalAssets) * 100
        }
    }) || []

    if (isLoading) {
        return <div>加载中...</div>
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                {/* 页面标题 */}
                <div>
                    <h1 className="text-2xl font-semibold">资产概览</h1>
                    <p className="text-sm text-muted-foreground">查看您的资产分布情况</p>
                </div>

                {/* 净资产卡片 */}
                <Card>
                    <CardHeader>
                        <CardTitle>净资产</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {new Intl.NumberFormat('zh-CN', {
                                style: 'currency',
                                currency: 'CNY'
                            }).format(overview?.totalAssets || 0)}
                        </div>
                    </CardContent>
                </Card>

                {/* 资产分布和图表 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* 资产列表 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>资产分布</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {overview?.accounts.map(account => (
                                    <div 
                                        key={account.id}
                                        className="flex items-center justify-between py-2"
                                    >
                                        <div className="flex flex-col">
                                            <span className="font-medium">{account.path}</span>
                                            <span className="text-sm text-muted-foreground">
                                                {((account.balance / overview.totalAssets) * 100).toFixed(2)}%
                                            </span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={cn(
                                                "font-medium",
                                                account.balance < 0 ? "text-red-500" : "text-green-500"
                                            )}>
                                                {new Intl.NumberFormat('zh-CN', {
                                                    style: 'currency',
                                                    currency: account.currency
                                                }).format(account.balance)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* 资产占比图表 */}
                    <Card>
                        <CardHeader>
                            <CardTitle>资产占比</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <AssetPieChart 
                                data={chartData}
                                totalAssets={overview?.totalAssets || 0}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
} 