"use client"

import { useEffect, useState, useMemo } from "react"
import { DataTable } from "@/components/ui/data-table"
import { columns } from "./columns"
import { Account } from "./columns"
import { Button } from "@/components/ui/button"
import { CreateAccountDialog } from "@/components/importers/combobox-account"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AccountType } from "@prisma/client"
import { useAccounts } from "@/hooks/use-accounts"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const accountTypeNames: Record<AccountType, string> = {
    ASSETS: '资产',
    LIABILITIES: '负债',
    INCOME: '收入',
    EXPENSES: '支出',
    EQUITY: '权益'
}

const pageSizeOptions = [10, 20, 50, 100]

export default function AccountsPage() {
    const { accounts, isLoading, mutate } = useAccounts()
    const [showCreateDialog, setShowCreateDialog] = useState(false)

    // 搜索和过滤状态
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedType, setSelectedType] = useState<AccountType | "ALL">("ALL")
    const [pageSize, setPageSize] = useState(20)
    const [currentPage, setCurrentPage] = useState(1)

    // 当搜索条件改变时，重置到第一页
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedType])

    // 过滤账户列表
    const filteredAccounts = useMemo(() => {
        return (accounts || []).filter(account => {
            const matchesType = selectedType === "ALL" || account.type === selectedType
            const matchesSearch = !searchQuery || 
                account.fullPath.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesType && matchesSearch
        })
    }, [accounts, selectedType, searchQuery])

    // 当页面大小改变时，智能调整当前页
    useEffect(() => {
        if (filteredAccounts.length > 0) {
            const newTotalPages = Math.ceil(filteredAccounts.length / pageSize)
            if (currentPage > newTotalPages) {
                setCurrentPage(newTotalPages)
            }
        }
    }, [pageSize, filteredAccounts.length, currentPage])

    // 计算分页
    const { paginatedAccounts, totalPages } = useMemo(() => {
        const total = filteredAccounts.length === 0 ? 0 : Math.ceil(filteredAccounts.length / pageSize)
        const paginated = filteredAccounts.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize
        )
        return {
            paginatedAccounts: paginated,
            totalPages: total
        }
    }, [filteredAccounts, pageSize, currentPage])

    // 处理搜索输入
    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value)
    }

    // 处理每页条数变化
    const handlePageSizeChange = (value: string) => {
        const newPageSize = Number(value)
        setPageSize(newPageSize)
    }

    const handleCreateAccount = async (formData: {
        name: string
        type: string
        parent?: string
        openBalance?: number
    }) => {
        try {
            const response = await fetch('/api/accounts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            })

            if (!response.ok) {
                throw new Error('Failed to create account')
            }

            await mutate() // 使用 SWR 的 mutate 刷新数据
            setShowCreateDialog(false)
        } catch (error) {
            console.error('Failed to create account:', error)
        }
    }

    return (
        <div className="container mx-auto py-6">
            <div className="flex flex-col gap-6">
                {/* 页面标题和操作 */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-semibold">账户列表</h1>
                        <p className="text-sm text-muted-foreground">查看所有账户及其余额</p>
                    </div>
                    <Button onClick={() => setShowCreateDialog(true)}>
                        创建账户
                    </Button>
                </div>

                {/* 搜索和过滤 */}
                <div className="flex gap-4 items-end">
                    <div className="flex-1">
                        <Label>搜索账户</Label>
                        <Input
                            placeholder="输入账户名称或路径搜索..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                    </div>
                    <div>
                        <Label>账户类型</Label>
                        <Select
                            value={selectedType}
                            onValueChange={(value: AccountType | "ALL") => setSelectedType(value)}
                        >
                            <SelectTrigger className="w-[180px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">全部类型</SelectItem>
                                {Object.entries(accountTypeNames).map(([type, name]) => (
                                    <SelectItem key={type} value={type}>
                                        {name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* 账户表格和分页 */}
                {isLoading ? (
                    <div>加载中...</div>
                ) : (
                    <div className="space-y-4">
                        <DataTable 
                            key={`table-${currentPage}-${pageSize}-${searchQuery}-${selectedType}-${paginatedAccounts.length}`}
                            columns={columns}
                            data={paginatedAccounts}
                            meta={{ mutate }}
                            enableRowClick={false}
                        />
                        
                        {/* 分页控制 */}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <Label>每页显示</Label>
                                <Select
                                    value={pageSize.toString()}
                                    onValueChange={handlePageSizeChange}
                                >
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pageSizeOptions.map(size => (
                                            <SelectItem key={size} value={size.toString()}>
                                                {size}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <span className="text-sm text-muted-foreground">
                                    条记录，共 {filteredAccounts.length} 条
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {totalPages === 0 ? "第 0 / 0 页" : `第 ${currentPage} / ${totalPages} 页`}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage <= 1 || totalPages === 0}
                                >
                                    上一页
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage >= totalPages || totalPages === 0}
                                >
                                    下一页
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* 创建账户对话框 */}
                <CreateAccountDialog
                    open={showCreateDialog}
                    onOpenChange={setShowCreateDialog}
                    onSubmit={handleCreateAccount}
                    accounts={accounts || []}
                />
            </div>
        </div>
    )
} 