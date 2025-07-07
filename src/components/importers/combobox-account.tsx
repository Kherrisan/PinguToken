"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { useAccounts } from "@/hooks/use-accounts"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"

interface ComboboxAccountProps {
    value: string
    onValueChange: (value: string) => void
}

export function ComboboxAccount({ value, onValueChange }: ComboboxAccountProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const [showCreateDialog, setShowCreateDialog] = React.useState(false)
    const { accounts, isLoading, mutate } = useAccounts()

    const filteredAccounts = React.useMemo(() => {
        if (!accounts) return []
        if (!searchQuery) return accounts
        const query = searchQuery.toLowerCase()
        return accounts.filter(account => 
            account.fullPath.toLowerCase().includes(query)
        )
    }, [accounts, searchQuery])

    const handleCreateAccount = async (formData: {
        name: string
        type: 'ASSETS' | 'LIABILITIES' | 'INCOME' | 'EXPENSES' | 'EQUITY'
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

            const newAccount = await response.json()
            await mutate() // 刷新账户列表
            onValueChange(newAccount.id)
            setShowCreateDialog(false)
            setOpen(true) // 重新打开账户选择弹窗
        } catch (error) {
            console.error('Failed to create account:', error)
            // 这里可以添加错误提示
            toast({
                title: "创建失败",
                description: "无法创建账户，请重试",
                variant: "destructive",
            })
        }
    }

    const handleClearSelection = (e: React.MouseEvent) => {
        e.stopPropagation() // 阻止事件冒泡，避免触发下拉框
        onValueChange("")
    }

    return (
        <>
            <div className="relative">
                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between pl-10 pr-10"
                        >
                            <ChevronsUpDown className="absolute left-3 h-4 w-4 shrink-0 opacity-50" />
                            <span className="truncate">
                                {value
                                    ? accounts?.find((account) => account.id === value)?.fullPath
                                    : "选择账户..."}
                            </span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-4" align="start">
                        <div className="space-y-2">
                            <Input
                                placeholder="搜索账户..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-8"
                            />
                            <ScrollArea className="h-[200px]">
                                <div className="space-y-1">
                                    {isLoading ? (
                                        <div className="text-sm text-muted-foreground p-2">
                                            加载中...
                                        </div>
                                    ) : filteredAccounts.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2">
                                            未找到账户
                                        </div>
                                    ) : (
                                        filteredAccounts.map((account) => (
                                            <Button
                                                key={account.id}
                                                variant="ghost"
                                                role="option"
                                                onClick={() => {
                                                    onValueChange(account.id)
                                                    setOpen(false)
                                                }}
                                                className={cn(
                                                    "w-full justify-start font-normal",
                                                    value === account.id && "bg-accent"
                                                )}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        value === account.id 
                                                            ? "opacity-100" 
                                                            : "opacity-0"
                                                    )}
                                                />
                                                {account.fullPath}
                                            </Button>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                            <Separator className="my-2" />
                            <Button
                                variant="outline"
                                className="w-full justify-start"
                                onClick={() => {
                                    setShowCreateDialog(true)
                                    setOpen(false)
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                创建新账户
                            </Button>
                        </div>
                    </PopoverContent>
                </Popover>
                
                {/* 清除按钮 - 只有在有选择时才显示 */}
                {value && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearSelection}
                        className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 p-0 hover:bg-destructive/20"
                        title="清除选择"
                    >
                        <X className="h-3 w-3" />
                    </Button>
                )}
            </div>

            <CreateAccountDialog
                open={showCreateDialog}
                onOpenChange={setShowCreateDialog}
                onSubmit={handleCreateAccount}
                accounts={accounts || []}
            />
        </>
    )
}

interface CreateAccountDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (data: { name: string; type: string; parent?: string; openBalance?: number }) => void
    accounts: Array<{ id: string; name: string; type: string; fullPath: string }>
}

export function CreateAccountDialog({
    open,
    onOpenChange,
    onSubmit,
    accounts
}: CreateAccountDialogProps) {
    const [formData, setFormData] = React.useState({
        name: '',
        type: 'EXPENSES',
        parent: '',
        openBalance: 0
    })
    const [searchQuery, setSearchQuery] = React.useState("")

    // 重置表单
    React.useEffect(() => {
        if (!open) {
            setFormData({
                name: '',
                type: 'EXPENSES',
                parent: '',
                openBalance: 0
            })
            setSearchQuery("")
        }
    }, [open])

    const filteredAccounts = React.useMemo(() => {
        if (!searchQuery) return accounts.filter(account => account.type === formData.type)
        const query = searchQuery.toLowerCase()
        return accounts
            .filter(account => account.type === formData.type)
            .filter(account => 
                account.fullPath.toLowerCase().includes(query)
            )
    }, [accounts, formData.type, searchQuery])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>创建新账户</DialogTitle>
                    <DialogDescription>
                        添加一个新的账户到账户系统中
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">账户名称</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="type">账户类型</Label>
                        <Select
                            value={formData.type}
                            onValueChange={(value) => {
                                setFormData(prev => ({ ...prev, type: value, parent: '' }))
                                setSearchQuery("")
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ASSETS">资产</SelectItem>
                                <SelectItem value="LIABILITIES">负债</SelectItem>
                                <SelectItem value="INCOME">收入</SelectItem>
                                <SelectItem value="EXPENSES">支出</SelectItem>
                                <SelectItem value="EQUITY">权益</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="parent">父账户</Label>
                        <div className="grid gap-2">
                            <Input
                                placeholder="搜索父账户..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <ScrollArea className="h-[200px] w-full rounded-md border">
                                <div className="p-2">
                                    {filteredAccounts.length === 0 ? (
                                        <div className="text-sm text-muted-foreground p-2">
                                            未找到账户
                                        </div>
                                    ) : (
                                        filteredAccounts.map(account => (
                                            <div
                                                key={account.id}
                                                className={cn(
                                                    "flex items-center rounded-sm px-2 py-1 text-sm",
                                                    "cursor-pointer hover:bg-accent",
                                                    formData.parent === account.id && "bg-accent"
                                                )}
                                                onClick={() => setFormData(prev => ({ ...prev, parent: account.id }))}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        formData.parent === account.id 
                                                            ? "opacity-100" 
                                                            : "opacity-0"
                                                    )}
                                                />
                                                <span>{account.fullPath}</span>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="openBalance">初始余额</Label>
                        <Input
                            id="openBalance"
                            type="number"
                            step="0.01"
                            value={formData.openBalance}
                            onChange={(e) => setFormData(prev => ({ ...prev, openBalance: parseFloat(e.target.value) }))}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={() => onSubmit(formData)}>
                        创建账户
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
} 